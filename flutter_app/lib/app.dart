import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/network/server_connection_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/domain/auth_state.dart';
import 'features/auth/presentation/auth_notifier.dart';
import 'features/auth/presentation/screens/login_screen.dart';
import 'features/home/presentation/home_screen.dart';
import 'shared/widgets/server_offline_fallback.dart';

class CloudMediaApp extends ConsumerWidget {
  const CloudMediaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final serverState = ref.watch(serverConnectionProvider);
    final authState = ref.watch(authNotifierProvider);

    Widget homeContent;

    // 1. Si el servidor está apagado (ambos inalcanzables), renderizar fallback global 100vh
    if (serverState.isServerOffline) {
      homeContent = const ServerOfflineFallback();
    } else if (authState.status == AuthStatus.loading || authState.status == AuthStatus.initial) {
      homeContent = const Scaffold(
        backgroundColor: Color(0xFF141414),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFFE50914)),
        ),
      );
    } else if (authState.isAuthenticated) {
      homeContent = const HomeScreen();
    } else {
      homeContent = const LoginScreen();
    }

    return MaterialApp(
      title: 'CloudMedia Hub',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: homeContent,
    );
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const ProviderScope(
      child: CloudMediaApp(),
    );
  }
}
