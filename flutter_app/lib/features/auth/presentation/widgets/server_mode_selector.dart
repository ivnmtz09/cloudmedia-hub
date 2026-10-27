import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/server_connection_service.dart';
import '../../../../core/theme/app_colors.dart';

class ServerModeSelector extends ConsumerWidget {
  const ServerModeSelector({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(serverConnectionProvider);

    Color dotColor = AppColors.statusOnline;
    if (state.isServerOffline) {
      dotColor = AppColors.statusOffline;
    } else if (state.selectedMode == ServerMode.auto && state.lastPingLatencyMs == null) {
      dotColor = AppColors.statusWarning;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 9,
                height: 9,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: dotColor,
                  boxShadow: [
                    BoxShadow(
                      color: dotColor.withValues(alpha: 0.5),
                      blurRadius: 6,
                    )
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Text(
                state.activeServerLabel,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (state.lastPingLatencyMs != null) ...[
                const SizedBox(width: 6),
                Text(
                  '${state.lastPingLatencyMs}ms',
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ],
          ),
          PopupMenuButton<ServerMode>(
            icon: const Icon(Icons.tune_rounded, color: Colors.white70, size: 18),
            color: AppColors.cardSurface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: AppColors.border),
            ),
            tooltip: 'Cambiar Servidor',
            onSelected: (mode) {
              ref.read(serverConnectionProvider.notifier).setServerMode(mode);
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: ServerMode.auto,
                child: Row(
                  children: [
                    Icon(
                      Icons.speed_rounded,
                      size: 16,
                      color: state.selectedMode == ServerMode.auto
                          ? AppColors.accent
                          : AppColors.textMuted,
                    ),
                    const SizedBox(width: 8),
                    const Text('Auto (El más rápido)', style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
              PopupMenuItem(
                value: ServerMode.local,
                child: Row(
                  children: [
                    Icon(
                      Icons.home_rounded,
                      size: 16,
                      color: state.selectedMode == ServerMode.local
                          ? AppColors.accent
                          : AppColors.textMuted,
                    ),
                    const SizedBox(width: 8),
                    const Text('Forzar Local (PC Base)', style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
              PopupMenuItem(
                value: ServerMode.vps,
                child: Row(
                  children: [
                    Icon(
                      Icons.cloud_rounded,
                      size: 16,
                      color: state.selectedMode == ServerMode.vps
                          ? AppColors.accent
                          : AppColors.textMuted,
                    ),
                    const SizedBox(width: 8),
                    const Text('Forzar VPS (Oracle Cloud)', style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
