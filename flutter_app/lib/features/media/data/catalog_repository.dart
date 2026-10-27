import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../domain/media_item_model.dart';

class CatalogRepository {
  final Dio _dio;

  CatalogRepository(this._dio);

  /// Obtiene la lista de carpetas y archivos multimedia desde /api/files
  Future<FileListResponse> fetchFiles({String path = ''}) async {
    final response = await _dio.get(
      '/api/files',
      queryParameters: path.isNotEmpty ? {'path': path} : null,
    );

    final data = response.data as Map<String, dynamic>;
    return FileListResponse.fromJson(data);
  }
}

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  final dio = ref.watch(dioClientProvider);
  return CatalogRepository(dio);
});

/// Notifier para la ruta actual del explorador de medios
class CurrentCatalogPathNotifier extends Notifier<String> {
  @override
  String build() => '';

  void setPath(String path) {
    state = path;
  }

  void navigateUp([String? parentPath]) {
    if (parentPath != null) {
      state = parentPath;
      return;
    }
    if (state.isEmpty) return;
    final lastSlash = state.lastIndexOf('/');
    if (lastSlash == -1) {
      state = '';
    } else {
      state = state.substring(0, lastSlash);
    }
  }

  void reset() {
    state = '';
  }
}

/// Estado reactivo para la ruta de la carpeta actual en el explorador
final currentCatalogPathProvider =
    NotifierProvider<CurrentCatalogPathNotifier, String>(CurrentCatalogPathNotifier.new);

/// FutureProvider parametrizado por ruta
final filesFamilyProvider = FutureProvider.family<FileListResponse, String>((ref, path) async {
  final repository = ref.watch(catalogRepositoryProvider);
  return await repository.fetchFiles(path: path);
});

/// FutureProvider que observa automáticamente la ruta actual
final currentFilesProvider = FutureProvider<FileListResponse>((ref) async {
  final currentPath = ref.watch(currentCatalogPathProvider);
  final repository = ref.watch(catalogRepositoryProvider);
  return await repository.fetchFiles(path: currentPath);
});
