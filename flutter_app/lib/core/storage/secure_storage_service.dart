import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const String _tokenKey = 'cmh_token';
  static const String _serverModeKey = 'cmh_server_mode';

  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              webOptions: WebOptions(
                dbName: 'CloudMediaHubStorage',
                publicKey: 'CloudMediaHubKey',
              ),
            );

  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: _tokenKey);
  }

  Future<void> saveServerMode(String mode) async {
    await _storage.write(key: _serverModeKey, value: mode);
  }

  Future<String?> getServerMode() async {
    return await _storage.read(key: _serverModeKey);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
