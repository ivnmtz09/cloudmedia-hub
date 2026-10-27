class AiMetadataModel {
  final String cleanTitle;
  final String synopsis;
  final List<String> mainCast;
  final List<String> genres;
  final List<String> keywords;

  const AiMetadataModel({
    required this.cleanTitle,
    required this.synopsis,
    required this.mainCast,
    required this.genres,
    required this.keywords,
  });

  factory AiMetadataModel.fromJson(Map<String, dynamic> json) {
    return AiMetadataModel(
      cleanTitle: json['cleanTitle'] as String? ?? '',
      synopsis: json['synopsis'] as String? ?? 'Sin sinopsis disponible.',
      mainCast: (json['mainCast'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      genres: (json['genres'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      keywords: (json['keywords'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'cleanTitle': cleanTitle,
      'synopsis': synopsis,
      'mainCast': mainCast,
      'genres': genres,
      'keywords': keywords,
    };
  }
}
