import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';

enum ServerMode {
  auto,
  local,
  vps,
}

class ServerConnectionState {
  final String activeBaseUrl;
  final ServerMode selectedMode;
  final bool isServerOffline;
  final int? lastPingLatencyMs;
  final String activeServerLabel;

  const ServerConnectionState({
    required this.activeBaseUrl,
    required this.selectedMode,
    this.isServerOffline = false,
    this.lastPingLatencyMs,
    required this.activeServerLabel,
  });

  ServerConnectionState copyWith({
    String? activeBaseUrl,
    ServerMode? selectedMode,
    bool? isServerOffline,
    int? lastPingLatencyMs,
    String? activeServerLabel,
  }) {
    return ServerConnectionState(
      activeBaseUrl: activeBaseUrl ?? this.activeBaseUrl,
      selectedMode: selectedMode ?? this.selectedMode,
      isServerOffline: isServerOffline ?? this.isServerOffline,
      lastPingLatencyMs: lastPingLatencyMs ?? this.lastPingLatencyMs,
      activeServerLabel: activeServerLabel ?? this.activeServerLabel,
    );
  }
}

class ServerConnectionNotifier extends Notifier<ServerConnectionState> {
  late final String localUrl = ApiConstants.defaultLocalUrl.replaceAll(RegExp(r'/+$'), '');
  late final String vpsUrl = ApiConstants.defaultVpsUrl.replaceAll(RegExp(r'/+$'), '');
  late final SecureStorageService _storage = SecureStorageService();
  late final Dio _pingDio = Dio(
    BaseOptions(
      connectTimeout: ApiConstants.pingTimeout,
      receiveTimeout: ApiConstants.pingTimeout,
      sendTimeout: ApiConstants.pingTimeout,
    ),
  );

  @override
  ServerConnectionState build() {
    Future.microtask(() => initialize());

    return ServerConnectionState(
      activeBaseUrl: localUrl,
      selectedMode: ServerMode.auto,
      activeServerLabel: 'Auto (Descubriendo...)',
      isServerOffline: false,
    );
  }

  /// Inicializa la conexión leyendo la preferencia guardada o corriendo el auto-discovery
  Future<void> initialize() async {
    final savedModeStr = await _storage.getServerMode();
    ServerMode mode = ServerMode.auto;

    if (savedModeStr != null) {
      mode = ServerMode.values.firstWhere(
        (m) => m.name == savedModeStr,
        orElse: () => ServerMode.auto,
      );
    }

    if (mode == ServerMode.local) {
      await _applyManualSelection(localUrl, ServerMode.local, 'Servidor Local');
    } else if (mode == ServerMode.vps) {
      await _applyManualSelection(vpsUrl, ServerMode.vps, 'Servidor VPS');
    } else {
      await discoverFastestServer();
    }
  }

  /// Carrera de pings concurrente (2.5s timeout) contra /api/stats
  Future<void> discoverFastestServer() async {
    final completer = Completer<Map<String, dynamic>?>();
    int pending = 2;

    void onResult(String url, String label, int latencyMs, bool ok) {
      if (ok && !completer.isCompleted) {
        completer.complete({
          'url': url,
          'label': label,
          'latency': latencyMs,
        });
      } else {
        pending--;
        if (pending == 0 && !completer.isCompleted) {
          completer.complete(null);
        }
      }
    }

    _pingUrl(localUrl, 'Servidor Local', onResult);
    _pingUrl(vpsUrl, 'Servidor VPS', onResult);

    final winner = await completer.future;

    if (winner != null) {
      state = state.copyWith(
        activeBaseUrl: winner['url'] as String,
        activeServerLabel: winner['label'] as String,
        lastPingLatencyMs: winner['latency'] as int,
        selectedMode: ServerMode.auto,
        isServerOffline: false,
      );
    } else {
      state = state.copyWith(
        isServerOffline: true,
        activeServerLabel: 'Sin conexión',
        lastPingLatencyMs: null,
      );
    }
  }

  void _pingUrl(String baseUrl, String label, void Function(String url, String label, int latencyMs, bool success) callback) {
    final stopwatch = Stopwatch()..start();
    _pingDio
        .get('$baseUrl${ApiConstants.statsEndpoint}')
        .then((response) {
          stopwatch.stop();
          callback(baseUrl, label, stopwatch.elapsedMilliseconds, response.statusCode == 200);
        })
        .catchError((_) {
          stopwatch.stop();
          callback(baseUrl, label, stopwatch.elapsedMilliseconds, false);
        });
  }

  /// Cambio manual forzado por el usuario (Auto, Local o VPS)
  Future<void> setServerMode(ServerMode mode) async {
    await _storage.saveServerMode(mode.name);

    switch (mode) {
      case ServerMode.local:
        await _applyManualSelection(localUrl, ServerMode.local, 'Servidor Local');
        break;
      case ServerMode.vps:
        await _applyManualSelection(vpsUrl, ServerMode.vps, 'Servidor VPS');
        break;
      case ServerMode.auto:
        await discoverFastestServer();
        break;
    }
  }

  Future<void> _applyManualSelection(String targetUrl, ServerMode mode, String label) async {
    final stopwatch = Stopwatch()..start();
    bool isHealthy = false;

    try {
      final res = await _pingDio.get('$targetUrl${ApiConstants.statsEndpoint}');
      isHealthy = res.statusCode == 200;
    } catch (_) {
      isHealthy = false;
    } finally {
      stopwatch.stop();
    }

    state = state.copyWith(
      activeBaseUrl: targetUrl,
      selectedMode: mode,
      activeServerLabel: label,
      isServerOffline: !isHealthy,
      lastPingLatencyMs: isHealthy ? stopwatch.elapsedMilliseconds : null,
    );
  }

  /// Conmutación automática ante fallo (Failover a servidor de respaldo)
  Future<bool> switchServerOnFailure() async {
    final currentUrl = state.activeBaseUrl;
    final fallbackUrl = currentUrl == localUrl ? vpsUrl : localUrl;
    final fallbackLabel = fallbackUrl == localUrl ? 'Servidor Local' : 'Servidor VPS';

    final stopwatch = Stopwatch()..start();
    try {
      final response = await _pingDio.get('$fallbackUrl${ApiConstants.statsEndpoint}');
      stopwatch.stop();

      if (response.statusCode == 200) {
        state = state.copyWith(
          activeBaseUrl: fallbackUrl,
          activeServerLabel: '$fallbackLabel (Respaldo)',
          lastPingLatencyMs: stopwatch.elapsedMilliseconds,
          isServerOffline: false,
        );
        return true;
      }
    } catch (_) {
      stopwatch.stop();
    }

    state = state.copyWith(isServerOffline: true);
    return false;
  }

  void markServerOffline() {
    if (!state.isServerOffline) {
      state = state.copyWith(isServerOffline: true);
    }
  }

  void markServerOnline() {
    if (state.isServerOffline) {
      state = state.copyWith(isServerOffline: false);
    }
  }
}

final serverConnectionProvider = NotifierProvider<ServerConnectionNotifier, ServerConnectionState>(() {
  return ServerConnectionNotifier();
});
