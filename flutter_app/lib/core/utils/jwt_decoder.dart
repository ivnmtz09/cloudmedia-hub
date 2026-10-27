import 'dart:convert';

class JwtDecoder {
  /// Decodifica el payload de un token JWT sin requerir librerías pesadas externas.
  static Map<String, dynamic>? decode(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) {
        return null;
      }

      final payload = parts[1];
      var normalized = base64Url.normalize(payload);
      final decodedBytes = base64Url.decode(normalized);
      final decodedString = utf8.decode(decodedBytes);

      return jsonDecode(decodedString) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Verifica si el token ha expirado según el campo 'exp'.
  static bool isExpired(String token) {
    final payload = decode(token);
    if (payload == null || !payload.containsKey('exp')) {
      return true;
    }

    final expSec = payload['exp'] as int;
    final expDate = DateTime.fromMillisecondsSinceEpoch(expSec * 1000);
    return DateTime.now().isAfter(expDate);
  }
}
