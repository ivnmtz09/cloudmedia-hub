import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/domain/user_model.dart';
import '../../../auth/presentation/auth_notifier.dart';

/// Oculta completamente el widget hijo si el rol del usuario autenticado es inferior a [minimumRole]
class RoleGuard extends ConsumerWidget {
  final Widget child;
  final UserRole minimumRole;
  final Widget? fallback;

  const RoleGuard({
    super.key,
    required this.child,
    this.minimumRole = UserRole.moderator,
    this.fallback,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final user = authState.user;

    if (user == null || user.role.hierarchy < minimumRole.hierarchy) {
      return fallback ?? const SizedBox.shrink();
    }

    return child;
  }
}
