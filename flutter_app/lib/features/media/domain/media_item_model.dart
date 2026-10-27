class MediaItemModel {
  final String name;
  final String path;
  final bool isDirectory;
  final int size;
  final String humanSize;
  final String? modifiedAt;
  final String mimeType;
  final String category;
  final String extension;

  const MediaItemModel({
    required this.name,
    required this.path,
    required this.isDirectory,
    required this.size,
    required this.humanSize,
    this.modifiedAt,
    required this.mimeType,
    required this.category,
    required this.extension,
  });

  bool get isFolder => isDirectory || category == 'folder';
  
  bool get isVideo =>
      category == 'video' ||
      const ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v']
          .contains(extension.toLowerCase());

  bool get isAudio =>
      category == 'audio' ||
      const ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a']
          .contains(extension.toLowerCase());

  /// Título limpio sin sufijos de resolución, codecs o extensiones
  String get cleanTitle {
    if (isDirectory) return name;
    final dotIndex = name.lastIndexOf('.');
    final withoutExt = dotIndex != -1 ? name.substring(0, dotIndex) : name;
    return withoutExt
        .replaceAll(RegExp(r'\b(2160p|4k|1080p|720p|480p)\b', caseSensitive: false), '')
        .replaceAll(RegExp(r'\b(dual|lat|latino|esp|castellano|eng|sub|hd|bluray|x264|x265|hevc|h264)\b', caseSensitive: false), '')
        .replaceAll(RegExp(r'\d+(\.\d+)?\s*(GB|MB)', caseSensitive: false), '')
        .replaceAll(RegExp(r'[._-]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  factory MediaItemModel.fromJson(Map<String, dynamic> json) {
    return MediaItemModel(
      name: json['name'] as String? ?? '',
      path: json['path'] as String? ?? '',
      isDirectory: json['isDirectory'] as bool? ?? false,
      size: (json['size'] as num?)?.toInt() ?? 0,
      humanSize: json['humanSize'] as String? ?? '-',
      modifiedAt: json['modifiedAt'] as String?,
      mimeType: json['mimeType'] as String? ?? '',
      category: json['category'] as String? ?? '',
      extension: json['extension'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'path': path,
      'isDirectory': isDirectory,
      'size': size,
      'humanSize': humanSize,
      'modifiedAt': modifiedAt,
      'mimeType': mimeType,
      'category': category,
      'extension': extension,
    };
  }
}

class FileListResponse {
  final String currentPath;
  final String? parentPath;
  final List<MediaItemModel> items;

  const FileListResponse({
    required this.currentPath,
    this.parentPath,
    required this.items,
  });

  factory FileListResponse.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    final parsedItems = rawItems
        .whereType<Map<String, dynamic>>()
        .map((item) => MediaItemModel.fromJson(item))
        .toList();

    return FileListResponse(
      currentPath: json['currentPath'] as String? ?? '',
      parentPath: json['parentPath'] as String?,
      items: parsedItems,
    );
  }
}
