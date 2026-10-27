import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../ai_search/data/ai_search_repository.dart';
import '../../ai_search/domain/ai_metadata_model.dart';
import '../../ai_search/presentation/ai_search_delegate.dart';
import '../../auth/domain/user_model.dart';
import '../../auth/presentation/auth_notifier.dart';
import '../../auth/presentation/widgets/server_mode_selector.dart';
import '../../media/data/catalog_repository.dart';
import '../../media/domain/media_item_model.dart';
import '../../media/presentation/player/video_player_screen.dart';
import '../../storage_quotas/presentation/widgets/role_guard.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final user = authState.user;
    final currentPath = ref.watch(currentCatalogPathProvider);
    final filesAsync = ref.watch(currentFilesProvider);
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 700;
    final canEnrichWithAi = user?.role == UserRole.admin || user?.role == UserRole.moderator;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.cloud_circle_rounded, color: AppColors.accent, size: 22),
            ),
            const SizedBox(width: 10),
            const Text(
              'CloudMedia Hub',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        actions: [
          // Botón de Búsqueda Semántica con Gemini AI
          IconButton(
            icon: const Icon(Icons.auto_awesome, color: AppColors.accent),
            tooltip: 'Búsqueda Semántica con IA',
            onPressed: () {
              showSearch(
                context: context,
                delegate: AiSearchDelegate(ref: ref),
              );
            },
          ),
          if (!isMobile) ...[
            const Center(
              child: SizedBox(
                width: 250,
                child: ServerModeSelector(),
              ),
            ),
            const SizedBox(width: 12),
          ],
          if (user != null)
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.account_circle_outlined, size: 18, color: Colors.white70),
                    const SizedBox(width: 6),
                    Text(
                      user.username,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: user.role == UserRole.admin
                            ? Colors.purple.withValues(alpha: 0.25)
                            : (user.role == UserRole.moderator
                                ? Colors.blue.withValues(alpha: 0.25)
                                : Colors.grey.withValues(alpha: 0.25)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        user.role.name.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: user.role == UserRole.admin
                              ? Colors.purpleAccent
                              : (user.role == UserRole.moderator ? Colors.lightBlueAccent : Colors.white70),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.white70),
            tooltip: 'Cerrar Sesión',
            onPressed: () => ref.read(authNotifierProvider.notifier).logout(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.accent,
        backgroundColor: AppColors.cardSurface,
        onRefresh: () async {
          ref.invalidate(currentFilesProvider);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Header: Selector en versión móvil + Cuotas administrativas
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isMobile) ...[
                      const ServerModeSelector(),
                      const SizedBox(height: 16),
                    ],

                    // Panel administrativo protegido por roles
                    RoleGuard(
                      minimumRole: UserRole.moderator,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 20),
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: AppColors.cardSurface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.storage_rounded, color: AppColors.accent, size: 20),
                                const SizedBox(width: 8),
                                const Text(
                                  'Dashboard de Almacenamiento & Cuotas',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'ADMIN / MOD ONLY',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.amber,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'Monitoreo activo de Google Drive (PC_Storage), Disco Local y Módulo de Limpieza.',
                              style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Encabezado del Catálogo Multimedia
                    Row(
                      children: [
                        const Icon(Icons.video_library_rounded, color: AppColors.accent, size: 22),
                        const SizedBox(width: 10),
                        const Text(
                          'Catálogo Multimedia',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.refresh_rounded, color: Colors.white70, size: 20),
                          tooltip: 'Recargar archivos',
                          onPressed: () => ref.invalidate(currentFilesProvider),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Barra de migas de pan (Breadcrumbs)
                    filesAsync.maybeWhen(
                      data: (response) => _buildBreadcrumbs(
                        context,
                        ref,
                        currentPath,
                        response.parentPath,
                      ),
                      orElse: () => _buildBreadcrumbs(
                        context,
                        ref,
                        currentPath,
                        null,
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),

            // Contenido dinámico del catálogo
            filesAsync.when(
              loading: () => const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: AppColors.accent),
                      SizedBox(height: 16),
                      Text(
                        'Cargando catálogo multimedia...',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
              error: (err, stack) => SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.cloud_off_rounded, color: AppColors.statusOffline, size: 48),
                          const SizedBox(height: 14),
                          const Text(
                            'Error al conectar con el servidor',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            err.toString(),
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 18),
                          ElevatedButton.icon(
                            onPressed: () => ref.invalidate(currentFilesProvider),
                            icon: const Icon(Icons.refresh_rounded, size: 18),
                            label: const Text('Reintentar'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.accent,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              data: (response) {
                final items = response.items;

                if (items.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32.0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.folder_open_rounded, size: 60, color: AppColors.textSubtle),
                            const SizedBox(height: 16),
                            const Text(
                              'Esta carpeta está vacía',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'No se encontraron archivos de video ni subcarpetas en esta ruta.',
                              style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                              textAlign: TextAlign.center,
                            ),
                            if (currentPath.isNotEmpty) ...[
                              const SizedBox(height: 16),
                              OutlinedButton.icon(
                                onPressed: () => ref
                                    .read(currentCatalogPathProvider.notifier)
                                    .navigateUp(response.parentPath),
                                icon: const Icon(Icons.arrow_back_rounded, size: 16),
                                label: const Text('Volver al nivel superior'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.white70,
                                  side: const BorderSide(color: AppColors.border),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 210,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      childAspectRatio: 0.84,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final item = items[index];
                        return _MediaGridCard(
                          item: item,
                          canEnrich: canEnrichWithAi,
                          onEnrichWithAi: () => _showAiEnrichDialog(context, ref, item),
                          onTap: () {
                            if (item.isFolder) {
                              ref.read(currentCatalogPathProvider.notifier).setPath(item.path);
                            } else if (item.isVideo) {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => VideoPlayerScreen(item: item),
                                ),
                              );
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Formato no soportado para streaming: ${item.name}'),
                                  duration: const Duration(seconds: 2),
                                ),
                              );
                            }
                          },
                        );
                      },
                      childCount: items.length,
                    ),
                  ),
                );
              },
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: 32),
            ),
          ],
        ),
      ),
    );
  }

  void _showAiEnrichDialog(BuildContext context, WidgetRef ref, MediaItemModel item) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        final repository = ref.read(aiSearchRepositoryProvider);

        return Dialog(
          backgroundColor: AppColors.cardSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.border),
          ),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 520),
            padding: const EdgeInsets.all(24),
            child: FutureBuilder<AiMetadataModel>(
              future: repository.enrichMetadata(item.name),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.accent.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.auto_awesome, color: AppColors.accent, size: 36),
                      ),
                      const SizedBox(height: 20),
                      const CircularProgressIndicator(color: AppColors.accent),
                      const SizedBox(height: 20),
                      const Text(
                        'Gemini AI analizando metadatos...',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        item.name,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                    ],
                  );
                }

                if (snapshot.hasError) {
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          color: AppColors.statusOffline, size: 48),
                      const SizedBox(height: 14),
                      const Text(
                        'Error al enriquecer con IA',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        snapshot.error.toString(),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () => Navigator.of(dialogContext).pop(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.surface,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Cerrar'),
                      ),
                    ],
                  );
                }

                final meta = snapshot.data!;

                return SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.accent.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.auto_awesome, color: AppColors.accent, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  meta.cleanTitle,
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const Text(
                                  'Metadatos generados con Google Gemini',
                                  style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(color: AppColors.border, height: 1),
                      const SizedBox(height: 16),

                      // Sinopsis
                      const Text(
                        'Sinopsis:',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.white70,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        meta.synopsis,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.white,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Géneros
                      if (meta.genres.isNotEmpty) ...[
                        const Text(
                          'Géneros:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: meta.genres.map((g) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Text(
                                g,
                                style: const TextStyle(fontSize: 11, color: Colors.white70),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Elenco Principal
                      if (meta.mainCast.isNotEmpty) ...[
                        const Text(
                          'Elenco principal:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          meta.mainCast.join(', '),
                          style: const TextStyle(fontSize: 12.5, color: Colors.white70),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Palabras clave
                      if (meta.keywords.isNotEmpty) ...[
                        const Text(
                          'Etiquetas clave:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: meta.keywords.map((k) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.purple.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: Colors.purple.withValues(alpha: 0.3)),
                              ),
                              child: Text(
                                '#$k',
                                style: const TextStyle(fontSize: 10.5, color: Colors.purpleAccent),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 16),
                      ],

                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: ElevatedButton(
                          onPressed: () => Navigator.of(dialogContext).pop(),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Cerrar'),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildBreadcrumbs(
    BuildContext context,
    WidgetRef ref,
    String currentPath,
    String? parentPath,
  ) {
    if (currentPath.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.folder_shared_rounded, size: 16, color: AppColors.accent),
            SizedBox(width: 8),
            Text(
              'Directorio Raíz (PC_Storage)',
              style: TextStyle(fontSize: 12.5, color: Colors.white70, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    final segments = currentPath.split('/').where((s) => s.isNotEmpty).toList();
    final breadcrumbWidgets = <Widget>[];

    // Botón Volver al nivel anterior
    breadcrumbWidgets.add(
      InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => ref.read(currentCatalogPathProvider.notifier).navigateUp(parentPath),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.border),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.arrow_back_rounded, size: 14, color: Colors.white),
              SizedBox(width: 4),
              Text('Atrás', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ),
    );

    breadcrumbWidgets.add(const SizedBox(width: 8));

    // Botón Raíz
    breadcrumbWidgets.add(
      InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: () => ref.read(currentCatalogPathProvider.notifier).reset(),
        child: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.home_rounded, size: 15, color: AppColors.accent),
              SizedBox(width: 4),
              Text('Raíz', style: TextStyle(color: Colors.white70, fontSize: 12.5)),
            ],
          ),
        ),
      ),
    );

    String accumulated = '';
    for (int i = 0; i < segments.length; i++) {
      final seg = segments[i];
      accumulated = accumulated.isEmpty ? seg : '$accumulated/$seg';
      final pathTarget = accumulated;
      final isLast = i == segments.length - 1;

      breadcrumbWidgets.add(
        const Icon(Icons.chevron_right_rounded, size: 16, color: AppColors.textSubtle),
      );

      breadcrumbWidgets.add(
        InkWell(
          borderRadius: BorderRadius.circular(6),
          onTap: isLast ? null : () => ref.read(currentCatalogPathProvider.notifier).setPath(pathTarget),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
            child: Text(
              seg,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isLast ? FontWeight.bold : FontWeight.w500,
                color: isLast ? Colors.white : AppColors.textMuted,
              ),
            ),
          ),
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: breadcrumbWidgets,
      ),
    );
  }
}

class _MediaGridCard extends StatelessWidget {
  final MediaItemModel item;
  final bool canEnrich;
  final VoidCallback? onEnrichWithAi;
  final VoidCallback onTap;

  const _MediaGridCard({
    required this.item,
    this.canEnrich = false,
    this.onEnrichWithAi,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isFolder = item.isFolder;
    final isVideo = item.isVideo;

    Color iconBgColor;
    Color iconColor;
    IconData displayIcon;
    String badgeText;

    if (isFolder) {
      iconBgColor = Colors.amber.withValues(alpha: 0.12);
      iconColor = Colors.amber.shade400;
      displayIcon = Icons.folder_rounded;
      badgeText = 'CARPETA';
    } else if (isVideo) {
      iconBgColor = AppColors.accent.withValues(alpha: 0.15);
      iconColor = AppColors.accent;
      displayIcon = Icons.movie_filter_rounded;
      badgeText = item.extension.isNotEmpty
          ? item.extension.replaceFirst('.', '').toUpperCase()
          : 'VIDEO';
    } else {
      iconBgColor = Colors.blueGrey.withValues(alpha: 0.15);
      iconColor = Colors.blueGrey.shade300;
      displayIcon = Icons.insert_drive_file_rounded;
      badgeText = 'ARCHIVO';
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          splashColor: AppColors.accent.withValues(alpha: 0.1),
          highlightColor: Colors.white.withValues(alpha: 0.05),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Sección superior: Ícono visual, Badge y Menú de IA
              Expanded(
                flex: 5,
                child: Container(
                  color: iconBgColor,
                  child: Stack(
                    children: [
                      Center(
                        child: Icon(
                          displayIcon,
                          size: 46,
                          color: iconColor,
                        ),
                      ),

                      // Badge de formato o tipo
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.white12),
                          ),
                          child: Text(
                            badgeText,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 9.5,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ),

                      // Menú contextual para administradores / moderadores en archivos de video
                      if (isVideo && canEnrich && onEnrichWithAi != null)
                        Positioned(
                          top: 4,
                          right: 4,
                          child: PopupMenuButton<String>(
                            icon: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: Colors.white12),
                              ),
                              child: const Icon(
                                Icons.more_vert_rounded,
                                color: Colors.white70,
                                size: 16,
                              ),
                            ),
                            color: AppColors.cardSurface,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: const BorderSide(color: AppColors.border),
                            ),
                            tooltip: 'Opciones de IA',
                            onSelected: (val) {
                              if (val == 'enrich') {
                                onEnrichWithAi!();
                              }
                            },
                            itemBuilder: (context) => [
                              const PopupMenuItem<String>(
                                value: 'enrich',
                                child: Row(
                                  children: [
                                    Icon(Icons.auto_awesome, color: AppColors.accent, size: 16),
                                    SizedBox(width: 8),
                                    Text(
                                      'Enriquecer con IA',
                                      style: TextStyle(color: Colors.white, fontSize: 13),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // Sección inferior: Título limpio y tamaño
              Expanded(
                flex: 4,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isFolder ? item.name : item.cleanTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            isFolder ? Icons.folder_open_rounded : Icons.sd_storage_rounded,
                            size: 13,
                            color: AppColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              isFolder
                                  ? (item.humanSize != '-' ? item.humanSize : 'Directorio')
                                  : item.humanSize,
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 11,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
