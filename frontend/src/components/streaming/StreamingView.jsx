import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Film, Tv, Video, RefreshCw, Sparkles, Clock, Play,
  LayoutGrid, Filter, Search
} from 'lucide-react';
import HeroBanner from './HeroBanner';
import VerticalPosterCard from './VerticalPosterCard';
import VideoPlayerModal from './VideoPlayerModal';
import { FloatingUploadFab } from '../upload/FloatingUploadFab';
import { ClassifiedUploadModal } from '../upload/ClassifiedUploadModal';
import {
  fetchCatalog,
  fetchMetadata,
  fetchWatchProgress,
  syncMetadata
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function StreamingView({ addToast }) {
  const navigate = useNavigate();
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
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'movies', 'series', 'anime', 'personal'
  const [loading, setLoading] = useState(true);
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);
  const [activeMedia, setActiveMedia] = useState(null);
  const [uploadFabContentType, setUploadFabContentType] = useState(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [catData, metaData, progData] = await Promise.all([
        fetchCatalog().catch(() => ({ movies: [], series: [], anime: [], personal: [], all: [] })),
        fetchMetadata().catch(() => ({})),
        fetchWatchProgress().catch(() => ({}))
      ]);

      setCatalog(catData);
      setMetadata(metaData || {});
      setWatchProgress(progData || {});
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
          title: 'Sincronización iniciada',
          message: 'Buscando carátulas y sinopsis en TMDB y Gemini en segundo plano...'
        });
      }
      setTimeout(loadAll, 3500);
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

  // Enriquecer lista con metadatos
  const enrich = (list) => {
    return (list || []).map((item) => {
      const meta = metadata[item.path] || {};
      return {
        ...item,
        cleanTitle: meta.cleanTitle || meta.title || item.title || item.name,
        synopsis: meta.synopsis || '',
        posterUrl: meta.posterUrl || null,
        backdropUrl: meta.backdropUrl || null,
        badges: meta.badges || [],
        year: meta.year || null,
        rating: meta.rating || meta.score || null
      };
    });
  };

  const movies = enrich(catalog.movies || []);
  const series = enrich(catalog.series || []);
  const anime = enrich(catalog.anime || []);
  const personal = enrich(catalog.personal || []);

  const allItems = [...movies, ...series, ...anime, ...personal];

  const displayedItems = (() => {
    switch (selectedFilter) {
      case 'movies':
        return movies;
      case 'series':
        return series;
      case 'anime':
        return anime;
      case 'personal':
        return personal;
      default:
        return allItems;
    }
  })();

  const featuredItem = movies[0] || series[0] || personal[0] || null;

  // Continuar viendo
  const continueWatching = Object.entries(watchProgress)
    .filter(([_, prog]) => prog && prog.percentage > 2 && prog.percentage < 92)
    .map(([pathKey, prog]) => {
      const found = allItems.find((i) => i.path === pathKey) || {
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

  const handleCardClick = (item) => {
    navigate(`/media/${encodeURIComponent(item.path)}`);
  };

  return (
    <div className="pb-16 space-y-8 animate-fade-in text-slate-100">
      {/* 1. Hero Banner Principal */}
      <HeroBanner
        movie={featuredItem}
        metadata={metadata}
        onPlay={(item) => navigate(`/media/${encodeURIComponent(item.path)}`)}
        onDetails={(item) => navigate(`/media/${encodeURIComponent(item.path)}`)}
      />

      {/* 2. Shelf: Continuar Viendo */}
      {continueWatching.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-bold tracking-tight text-white">
              Continuar Viendo
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {continueWatching.map((item, idx) => (
              <div
                key={item.path || idx}
                onClick={() => handleCardClick(item)}
                className="group relative rounded-2xl bg-dark-900 border border-slate-800 overflow-hidden cursor-pointer hover:border-red-500 transition-all shadow-md"
              >
                <div className="aspect-video bg-black/60 flex items-center justify-center relative overflow-hidden">
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-8 h-8 text-slate-500 group-hover:text-red-500 transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="p-3 rounded-full bg-red-600 text-white shadow-xl scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                    <div
                      className="h-full bg-red-600"
                      style={{ width: `${item.progress.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5">
                  <div className="text-xs font-semibold truncate text-white group-hover:text-red-400 transition-colors">
                    {item.cleanTitle}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {item.progress.percentage}% visto
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Toolbar de Filtros y Sincronización */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'Todos', count: allItems.length },
            { id: 'movies', label: 'Películas', count: movies.length },
            { id: 'series', label: 'Series', count: series.length },
            { id: 'anime', label: 'Anime', count: anime.length },
            { id: 'personal', label: 'Personales', count: personal.length }
          ].map((tab) => {
            const isActive = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'bg-dark-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasMinRole('moderator') && (
            <button
              onClick={handleSyncMeta}
              disabled={isSyncingMeta}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50"
              title="Enriquecer metadatos con TMDB y Gemini"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSyncingMeta ? 'animate-spin text-red-500' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">Enriquecer Catálogo</span>
            </button>
          )}

          <button
            onClick={loadAll}
            disabled={loading}
            className="p-2 rounded-xl bg-dark-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refrescar catálogo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. Grid de Catálogo: Tarjetas Verticales Responsivas */}
      {displayedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {displayedItems.map((item, idx) => (
            <VerticalPosterCard
              key={item.path || idx}
              item={item}
              metadata={metadata}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center rounded-3xl bg-dark-900 border border-slate-800">
          <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">
            No hay contenido disponible en esta categoría
          </h3>
          <p className="text-xs text-slate-400">
            Sube nuevos videos a través del botón flotante o sincroniza tu Google Drive.
          </p>
        </div>
      )}

      {/* FAB Flotante para subida clasificada */}
      <FloatingUploadFab onOpenUpload={(type) => setUploadFabContentType(type)} />

      {/* Modal de Subida */}
      <ClassifiedUploadModal
        isOpen={!!uploadFabContentType}
        initialContentType={uploadFabContentType || 'pelicula'}
        onClose={() => setUploadFabContentType(null)}
        onUploadSuccess={() => {
          loadAll();
          if (addToast) addToast({ type: 'success', title: 'Subida exitosa', message: 'Contenido añadido al catálogo' });
        }}
      />

      {/* Reproductor de Video Directo */}
      {activeMedia && (
        <VideoPlayerModal
          item={activeMedia}
          onClose={() => {
            setActiveMedia(null);
            fetchWatchProgress().then((p) => setWatchProgress(p || {}));
          }}
        />
      )}
    </div>
  );
}
