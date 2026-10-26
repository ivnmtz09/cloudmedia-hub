import React, { useState, useEffect } from 'react';
import { Film, Tv, Video, RefreshCw, Sparkles, Clock, Play } from 'lucide-react';
import HeroBanner from './HeroBanner';
import MediaSection from './MediaSection';
import VideoPlayerModal from './VideoPlayerModal';
import MediaDetailsModal from './MediaDetailsModal';
import SeriesView from './SeriesView';
import { FloatingUploadFab } from '../upload/FloatingUploadFab';
import { ClassifiedUploadModal } from '../upload/ClassifiedUploadModal';
import { fetchCatalog, fetchMetadata, fetchWatchProgress, syncMetadata, fetchSeriesTree } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function StreamingView({ onGoToExplorer, addToast }) {
  const { user, hasMinRole } = useAuth();
  const [catalog, setCatalog] = useState({
    movies: [],
    series: [],
    anime: [],
    personal: [],
    all: []
  });
  const [metadata, setMetadata] = useState({});
  const [watchProgress, setWatchProgress] = useState({});
  const [seriesTrees, setSeriesTrees] = useState([]);
  const [activeSeries, setActiveSeries] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);
  const [activeMedia, setActiveMedia] = useState(null);
  const [detailsMedia, setDetailsMedia] = useState(null);
  const [uploadFabContentType, setUploadFabContentType] = useState(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [catData, metaData, progData, sTrees] = await Promise.all([
        fetchCatalog().catch(() => ({ movies: [], series: [], anime: [], personal: [], all: [] })),
        fetchMetadata().catch(() => ({})),
        fetchWatchProgress().catch(() => ({})),
        fetchSeriesTree('Series').catch(() => [])
      ]);

      setCatalog(catData);
      setMetadata(metaData || {});
      setWatchProgress(progData || {});
      setSeriesTrees(sTrees || []);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
      if (addToast) {
        addToast({
          type: 'error',
          title: 'Error de catálogo',
          message: 'No se pudo sincronizar el catálogo multimedia'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAll();
    }
  }, [user]);

  const handleSyncMeta = async () => {
    try {
      setIsSyncingMeta(true);
      await syncMetadata();
      if (addToast) {
        addToast({
          type: 'info',
          title: 'Sincronización en proceso',
          message: 'Buscando carátulas y sinopsis en iTunes, Jikan y Wikipedia...'
        });
      }
      setTimeout(loadAll, 4000);
    } catch (err) {
      if (addToast) {
        addToast({
          type: 'error',
          title: 'Error',
          message: err.message || 'Fallo al iniciar sincronización'
        });
      }
    } finally {
      setIsSyncingMeta(false);
    }
  };

  // Enhance items with metadata
  const enrich = (list) => {
    return (list || []).map((item) => {
      const meta = metadata[item.path] || {};
      return {
        ...item,
        cleanTitle: meta.cleanTitle || meta.title || item.title || item.name,
        synopsis: meta.synopsis || '',
        posterUrl: meta.posterUrl || null,
        badges: meta.badges || [],
        year: meta.year || null,
        score: meta.score || null
      };
    });
  };

  const movies = enrich(catalog.movies || []);
  const series = enrich(catalog.series || []);
  const anime = enrich(catalog.anime || []);
  const personal = enrich(catalog.personal || []);

  // Continue Watching items
  const continueWatching = Object.entries(watchProgress)
    .filter(([_, prog]) => prog && prog.percentage > 2 && prog.percentage < 92)
    .map(([pathKey, prog]) => {
      const found = (catalog.all || []).find((i) => i.path === pathKey) || {
        path: pathKey,
        name: pathKey.split('/').pop(),
        title: pathKey.split('/').pop()
      };
      const meta = metadata[pathKey] || {};
      return {
        ...found,
        cleanTitle: meta.cleanTitle || meta.title || found.title || found.name,
        posterUrl: meta.posterUrl || null,
        progress: prog
      };
    });

  const featuredItem = movies[0] || series[0] || personal[0] || null;

  return (
    <div className="pb-16 space-y-8 animate-fade-in text-theme-text">
      {/* If drilling down into a Series */}
      {activeSeries ? (
        <div className="space-y-4">
          <button
            onClick={() => setActiveSeries(null)}
            className="min-h-12 px-4 py-2 rounded-xl text-xs font-semibold text-theme-accent hover:bg-theme-accent/10 border border-theme-accent/30 transition-all flex items-center gap-1.5 focus-ring"
          >
            ← Volver al Catálogo Principal
          </button>
          <SeriesView
            series={activeSeries}
            watchProgress={watchProgress}
            onPlayEpisode={(ep) => setActiveMedia(ep)}
            onBack={() => setActiveSeries(null)}
          />
        </div>
      ) : (
        <>
          {/* Top Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-theme-muted font-medium">
              <span>Catálogo: </span>
              <span className="text-theme-text font-semibold">
                {movies.length} Película(s) • {series.length} Serie(s) • {anime.length} Anime(s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasMinRole('moderator') && (
                <button
                  onClick={handleSyncMeta}
                  disabled={isSyncingMeta}
                  className="min-h-12 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-theme-text transition-all focus-ring disabled:opacity-50"
                  title="Sincronizar carátulas con iTunes, Jikan y Wikipedia"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isSyncingMeta ? 'animate-spin text-theme-accent' : 'text-amber-400'}`} />
                  <span className="hidden sm:inline">Sincronizar Carátulas</span>
                </button>
              )}

              <button
                onClick={loadAll}
                disabled={loading}
                className="min-h-12 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-theme-muted hover:text-theme-text transition-all focus-ring disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-theme-accent' : ''}`} />
                <span className="hidden sm:inline">Refrescar</span>
              </button>
            </div>
          </div>

          {/* Hero Banner con Parallax y Metadatos */}
          <HeroBanner
            movie={featuredItem}
            metadata={metadata}
            onPlay={(item) => setActiveMedia(item)}
            onDetails={(item) => setDetailsMedia(item)}
          />

          {/* Shelf: Continuar Viendo (si hay progreso guardado) */}
          {continueWatching.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 px-1">
                <Clock className="w-4 h-4 text-theme-accent" />
                <h2 className="text-base font-bold tracking-tight text-theme-text">
                  Continuar Viendo
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {continueWatching.map((item, idx) => (
                  <div
                    key={item.path || idx}
                    onClick={() => setActiveMedia(item)}
                    className="group relative rounded-xl glass border border-white/10 overflow-hidden cursor-pointer hover:border-theme-accent/50 card-glow transition-all"
                  >
                    <div className="aspect-video bg-black/40 flex items-center justify-center relative overflow-hidden">
                      {item.posterUrl ? (
                        <img src={item.posterUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Film className="w-8 h-8 text-theme-muted group-hover:text-theme-accent transition-colors" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="p-3 rounded-full bg-theme-accent text-white shadow-xl scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      </div>

                      {/* Progress bar overlay */}
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                        <div
                          className="h-full bg-theme-accent"
                          style={{ width: `${item.progress.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-2.5">
                      <div className="text-xs font-semibold truncate text-theme-text group-hover:text-theme-accent transition-colors">
                        {item.cleanTitle}
                      </div>
                      <div className="text-[10px] font-mono text-theme-muted mt-0.5">
                        {item.progress.percentage}% completado
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categorized Sections con Parenting y Offset/Delay */}
          <div className="space-y-6 pt-2">
            <MediaSection
              title="Películas"
              icon={Film}
              items={movies}
              metadata={metadata}
              onPlay={(item) => setActiveMedia(item)}
              onDetails={(item) => setDetailsMedia(item)}
              onGoToExplorer={onGoToExplorer}
            />

            <MediaSection
              title="Series de TV"
              icon={Tv}
              items={series}
              metadata={metadata}
              onPlay={(item) => setActiveMedia(item)}
              onDetails={(item) => setDetailsMedia(item)}
              onGoToExplorer={onGoToExplorer}
            />

            {anime.length > 0 && (
              <MediaSection
                title="Anime"
                icon={Tv}
                items={anime}
                metadata={metadata}
                onPlay={(item) => setActiveMedia(item)}
                onDetails={(item) => setDetailsMedia(item)}
                onGoToExplorer={onGoToExplorer}
              />
            )}

            <MediaSection
              title="Videos Personales"
              icon={Video}
              items={personal}
              metadata={metadata}
              onPlay={(item) => setActiveMedia(item)}
              onDetails={(item) => setDetailsMedia(item)}
              onGoToExplorer={onGoToExplorer}
            />
          </div>

          {/* 8. CLONING: FAB Flotante para subida clasificada */}
          <FloatingUploadFab onOpenUpload={(type) => setUploadFabContentType(type)} />

          {/* Modal de Subida activado desde el FAB */}
          <ClassifiedUploadModal
            isOpen={!!uploadFabContentType}
            initialContentType={uploadFabContentType || 'pelicula'}
            onClose={() => setUploadFabContentType(null)}
            onUploadSuccess={() => {
              loadAll();
              if (addToast) addToast({ type: 'success', title: 'Subida exitosa', message: 'Contenido añadido al catálogo' });
            }}
          />
        </>
      )}

      {/* Video Player Modal */}
      {activeMedia && (
        <VideoPlayerModal
          item={activeMedia}
          onClose={() => {
            setActiveMedia(null);
            fetchWatchProgress().then((p) => setWatchProgress(p || {}));
          }}
        />
      )}

      {/* Media Details Modal */}
      {detailsMedia && (
        <MediaDetailsModal
          item={detailsMedia}
          isOpen={!!detailsMedia}
          onClose={() => setDetailsMedia(null)}
          onPlay={(item) => setActiveMedia(item)}
        />
      )}
    </div>
  );
}
