import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../domain/user_model.dart';

class AuthResponse {
  final UserModel user;
  final String token;
  final bool requirePasswordChange;

  AuthResponse({
    required this.user,
    required this.token,
    this.requirePasswordChange = false,
  });
}

class AuthRepository {
  final Dio dio;
  final SecureStorageService storage;

  AuthRepository({
    required this.dio,
    required this.storage,
  });

  Future<AuthResponse> login(String username, String password) async {
    final response = await dio.post(
      ApiConstants.loginEndpoint,
      data: {
        'username': username,
        'password': password,
      },
    );

    final data = response.data as Map<String, dynamic>;
    final token = data['token'] as String;
    final userMap = data['user'] as Map<String, dynamic>;
    final requireChange = data['requirePasswordChange'] == true;

    await storage.saveToken(token);

    return AuthResponse(
      user: UserModel.fromJson(userMap),
      token: token,
      requirePasswordChange: requireChange,
    );
  }

  Future<UserModel> getProfile() async {
    final response = await dio.get(ApiConstants.profileEndpoint);
    final data = response.data as Map<String, dynamic>;
    final userMap = data['user'] as Map<String, dynamic>;
    return UserModel.fromJson(userMap);
  }

  Future<void> changePassword(String newPassword) async {
    await dio.post(
      ApiConstants.changePasswordEndpoint,
      data: {'newPassword': newPassword},
    );
  }

  Future<void> logout() async {
    await storage.deleteToken();
  }
}
