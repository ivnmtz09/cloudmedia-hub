import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/utils/jwt_decoder.dart';
import '../data/auth_repository.dart';
import '../domain/auth_state.dart';
import '../domain/user_model.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dio = ref.watch(dioClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthRepository(dio: dio, storage: storage);
});

class AuthNotifier extends Notifier<AuthState> {
  AuthRepository get _repository => ref.read(authRepositoryProvider);

  @override
  AuthState build() {
    Future.microtask(() => checkAuthStatus());
    return const AuthState();
  }

  Future<void> checkAuthStatus() async {
    final storage = ref.read(secureStorageProvider);
    final token = await storage.getToken();

    if (token == null || JwtDecoder.isExpired(token)) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return;
    }

    try {
      final payload = JwtDecoder.decode(token);
      if (payload != null) {
        final user = UserModel(
          id: payload['id']?.toString() ?? '',
          username: payload['username'] ?? '',
          role: UserRole.fromString(payload['role']),
          mustChangePassword: payload['mustChangePassword'] == true,
        );

        state = state.copyWith(
          status: AuthStatus.authenticated,
          token: token,
          user: user,
          requirePasswordChange: user.mustChangePassword,
        );
      } else {
        state = state.copyWith(status: AuthStatus.unauthenticated);
      }
    } catch (_) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String username, String password) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);

    try {
      final response = await _repository.login(username, password);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: response.user,
        token: response.token,
        requirePasswordChange: response.requirePasswordChange,
      );
      return true;
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? 'Error de conexión o credenciales inválidas';
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: msg.toString(),
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: 'Error inesperado al iniciar sesión',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authNotifierProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});
