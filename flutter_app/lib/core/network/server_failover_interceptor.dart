import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/secure_storage_service.dart';
import 'server_connection_service.dart';

class ServerFailoverInterceptor extends Interceptor {
  final Ref ref;
  final SecureStorageService storage;
  final Dio dio;

  ServerFailoverInterceptor({
    required this.ref,
    required this.storage,
    required this.dio,
  });

  ServerConnectionState get _currentState => ref.read(serverConnectionProvider);
  ServerConnectionNotifier get _notifier => ref.read(serverConnectionProvider.notifier);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // 1. Asegurar que la petición use el servidor activo actual
    options.baseUrl = _currentState.activeBaseUrl;

    // 2. Inyectar token JWT si existe en almacenamiento seguro
    final token = await storage.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final bool isNetworkIssue = err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        (err.response != null && err.response!.statusCode != null && err.response!.statusCode! >= 502);

    final bool alreadyRetried = err.requestOptions.extra['is_failover_retry'] == true;

    if (isNetworkIssue && !alreadyRetried) {
      final bool switched = await _notifier.switchServerOnFailure();

      if (switched) {
        final newBaseUrl = _currentState.activeBaseUrl;
        final options = err.requestOptions;
        options.baseUrl = newBaseUrl;
        options.extra['is_failover_retry'] = true;

        try {
          // Reintentar la petición inmediatamente contra el nuevo servidor
          final response = await dio.fetch(options);
          return handler.resolve(response);
        } on DioException catch (retryErr) {
          _notifier.markServerOffline();
          return handler.next(retryErr);
        }
      } else {
        _notifier.markServerOffline();
      }
    }

    return handler.next(err);
  }
}
