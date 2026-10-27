import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/features/ai_search/domain/ai_metadata_model.dart';
import 'package:flutter_app/features/ai_search/domain/semantic_search_result.dart';

void main() {
  group('AI Search & Metadata Domain Tests', () {
    test('deserializa SemanticSearchResult y convierte a MediaItemModel', () {
      final json = {
        'path': 'Peliculas/Interstellar.2014.1080p.mkv',
        'title': 'Interstellar',
        'relevanceScore': 0.98,
        'matchReason': 'Trata de viajes a traves de agujeros de gusano y dilatacion temporal.',
      };

      final result = SemanticSearchResult.fromJson(json);

      expect(result.path, equals('Peliculas/Interstellar.2014.1080p.mkv'));
      expect(result.title, equals('Interstellar'));
      expect(result.relevanceScore, equals(0.98));
      expect(result.matchReason, contains('dilatacion temporal'));

      final mediaItem = result.toMediaItem();
      expect(mediaItem.name, equals('Interstellar.2014.1080p.mkv'));
      expect(mediaItem.extension, equals('.mkv'));
      expect(mediaItem.isVideo, isTrue);
    });

    test('deserializa AiMetadataModel correctamente', () {
      final json = {
        'cleanTitle': 'Oppenheimer',
        'synopsis': 'Historia del fisico J. Robert Oppenheimer y el desarrollo de la bomba atomica.',
        'mainCast': ['Cillian Murphy', 'Emily Blunt', 'Matt Damon'],
        'genres': ['Drama', 'Historia', 'Biopic'],
        'keywords': ['manhattan project', 'fisica', 'segunda guerra mundial'],
      };

      final model = AiMetadataModel.fromJson(json);

      expect(model.cleanTitle, equals('Oppenheimer'));
      expect(model.mainCast.length, equals(3));
      expect(model.genres, contains('Biopic'));
      expect(model.keywords, contains('manhattan project'));
    });
  });
}
