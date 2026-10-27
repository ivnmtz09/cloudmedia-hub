import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/features/media/domain/media_item_model.dart';

void main() {
  group('MediaItemModel tests', () {
    test('limpia correctamente los titulos de resolucion, codecs y extensiones', () {
      const model = MediaItemModel(
        name: 'Inception.2010.1080p.Dual.Latino.x264.mkv',
        path: 'Inception.2010.1080p.Dual.Latino.x264.mkv',
        isDirectory: false,
        size: 2147483648,
        humanSize: '2.0 GB',
        mimeType: 'video/x-matroska',
        category: 'video',
        extension: '.mkv',
      );

      expect(model.cleanTitle, equals('Inception 2010'));
      expect(model.isVideo, isTrue);
      expect(model.isFolder, isFalse);
    });

    test('reconoce carpetas e items de video correctamente', () {
      const folder = MediaItemModel(
        name: 'Series',
        path: 'Series',
        isDirectory: true,
        size: 0,
        humanSize: '-',
        mimeType: 'directory',
        category: 'folder',
        extension: '',
      );

      expect(folder.isFolder, isTrue);
      expect(folder.isVideo, isFalse);
      expect(folder.cleanTitle, equals('Series'));
    });

    test('parsea FileListResponse desde JSON', () {
      final json = {
        'currentPath': 'Peliculas',
        'parentPath': '',
        'items': [
          {
            'name': 'Avatar.1080p.mp4',
            'path': 'Peliculas/Avatar.1080p.mp4',
            'isDirectory': false,
            'size': 1500000000,
            'humanSize': '1.4 GB',
            'mimeType': 'video/mp4',
            'category': 'video',
            'extension': '.mp4',
          },
          {
            'name': 'Marvel',
            'path': 'Peliculas/Marvel',
            'isDirectory': true,
            'size': 0,
            'humanSize': '-',
            'mimeType': 'directory',
            'category': 'folder',
            'extension': '',
          }
        ]
      };

      final response = FileListResponse.fromJson(json);

      expect(response.currentPath, equals('Peliculas'));
      expect(response.parentPath, equals(''));
      expect(response.items.length, equals(2));
      expect(response.items[0].cleanTitle, equals('Avatar'));
      expect(response.items[0].isVideo, isTrue);
      expect(response.items[1].isFolder, isTrue);
    });
  });
}
