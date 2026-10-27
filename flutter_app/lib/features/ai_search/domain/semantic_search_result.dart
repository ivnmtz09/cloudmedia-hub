import '../../media/domain/media_item_model.dart';

class SemanticSearchResult {
  final String path;
  final String title;
  final double relevanceScore;
  final String matchReason;

  const SemanticSearchResult({
    required this.path,
    required this.title,
    required this.relevanceScore,
    required this.matchReason,
  });

  factory SemanticSearchResult.fromJson(Map<String, dynamic> json) {
    return SemanticSearchResult(
      path: json['path'] as String? ?? '',
      title: json['title'] as String? ?? '',
      relevanceScore: (json['relevanceScore'] as num?)?.toDouble() ?? 0.0,
      matchReason: json['matchReason'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'path': path,
      'title': title,
      'relevanceScore': relevanceScore,
      'matchReason': matchReason,
    };
  }

  /// Convierte el resultado semantico en un MediaItemModel para reproduccion directa
  MediaItemModel toMediaItem() {
    final dotIndex = path.lastIndexOf('.');
    final ext = dotIndex != -1 ? path.substring(dotIndex) : '';
    final lastSlashIndex = path.lastIndexOf('/');
    final filename = lastSlashIndex != -1 ? path.substring(lastSlashIndex + 1) : path;

    return MediaItemModel(
      name: filename,
      path: path,
      isDirectory: false,
      size: 0,
      humanSize: '-',
      mimeType: ext.toLowerCase() == '.mkv' ? 'video/x-matroska' : 'video/mp4',
      category: 'video',
      extension: ext,
    );
  }
}
