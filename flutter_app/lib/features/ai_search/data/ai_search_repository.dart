import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../domain/ai_metadata_model.dart';
import '../domain/semantic_search_result.dart';

class AiSearchRepository {
  final Dio _dio;

  AiSearchRepository(this._dio);

  /// Realiza una busqueda semantica en lenguaje natural con Gemini AI
  Future<List<SemanticSearchResult>> semanticSearch(String query) async {
    final response = await _dio.post(
      '/api/search/semantic',
      data: {'query': query},
    );

    final data = response.data as Map<String, dynamic>;
    final rawResults = data['results'] as List<dynamic>? ?? [];

    return rawResults
        .whereType<Map<String, dynamic>>()
        .map((item) => SemanticSearchResult.fromJson(item))
        .toList();
  }

  /// Enriquece metadatos usando Gemini AI a partir del nombre del archivo
  Future<AiMetadataModel> enrichMetadata(String filename) async {
    final response = await _dio.post(
      '/api/metadata/ai-enrich',
      data: {'filename': filename},
    );

    final data = response.data as Map<String, dynamic>;
    final innerData = data['data'] as Map<String, dynamic>? ?? {};

    return AiMetadataModel.fromJson(innerData);
  }
}

final aiSearchRepositoryProvider = Provider<AiSearchRepository>((ref) {
  final dio = ref.watch(dioClientProvider);
  return AiSearchRepository(dio);
});
