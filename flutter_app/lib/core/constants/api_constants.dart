class ApiConstants {
  static const String defaultLocalUrl = String.fromEnvironment(
    'LOCAL_URL',
    defaultValue: 'https://telescope-cho-exactly-personnel.trycloudflare.com',
  );

  static const String defaultVpsUrl = String.fromEnvironment(
    'VPS_URL',
    defaultValue: 'https://vps.cloudmediahub.online',
  );

  // Endpoints
  static const String healthEndpoint = '/api/health';
  static const String statsEndpoint = '/api/stats';
  static const String systemStatsEndpoint = '/api/stats/system';
  static const String loginEndpoint = '/api/auth/login';
  static const String profileEndpoint = '/api/auth/me';
  static const String changePasswordEndpoint = '/api/auth/change-password';
  static const String catalogEndpoint = '/api/media/catalog';
  static const String streamEndpoint = '/api/stream';
  static const String subtitlesEndpoint = '/api/stream/subtitles';
  static const String thumbnailEndpoint = '/api/thumbnail';
  static const String aiEnrichEndpoint = '/api/metadata/ai-enrich';
  static const String semanticSearchEndpoint = '/api/search/semantic';

  // Network Timeouts
  static const Duration pingTimeout = Duration(milliseconds: 2500);
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 15);
}
