import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Star, Calendar, HardDrive, Film, Tv,
  Shield, User, ChevronDown, CheckCircle2, Clock, Bookmark,
  BookmarkCheck, Sparkles
} from 'lucide-react';
import {
  fetchMediaItemMetadata,
  fetchSeriesTree,
  fetchFavorites,
  toggleFavorite,
  fetchCatalog,
  fetchMetadata
} from '../../services/api';
import VideoPlayerModal from '../streaming/VideoPlayerModal';
import VerticalPosterCard from '../streaming/VerticalPosterCard';

export default function MediaDetailsView({ media: propMedia, onBack: propOnBack, onPlay: propOnPlay }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Resolver la ruta del medio a partir del parámetro de URL o del prop
  const mediaPath = id ? decodeURIComponent(id) : propMedia?.path;
  const mediaName = propMedia?.name || mediaPath?.split('/').pop() || 'Multimedia';

  const [metadata, setMetadata] = useState(propMedia?.metadata || null);
  const [loading, setLoading] = useState(true);
  const [playingItem, setPlayingItem] = useState(null);

  // Estados para Favoritos y Títulos Similares
  const [favorites, setFavorites] = useState([]);
  const [isTogglingFav, setIsTogglingFav] = useState(false);
  const [similarTitles, setSimilarTitles] = useState([]);
  const [catalogMetadata, setCatalogMetadata] = useState({});

  // Estados para Series y Anime
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const [seriesLoading, setSeriesLoading] = useState(false);

  // Cargar metadatos del medio
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!mediaPath) return;

      try {
        setLoading(true);
        const data = await fetchMediaItemMetadata(mediaPath, mediaName, propMedia?.isDirectory);
        if (isMounted && data) {
          setMetadata(data);
        }
      } catch (err) {
        console.warn('Error cargando detalles:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [mediaPath, mediaName]);

  // Cargar lista de favoritos del usuario
  useEffect(() => {
    fetchFavorites()
      .then((favs) => setFavorites(favs || []))
      .catch(() => {});
  }, []);

  const isFavorite = favorites.includes(mediaPath);

  const handleToggleFavorite = async () => {
    if (isTogglingFav || !mediaPath) return;
    setIsTogglingFav(true);
    try {
      const res = await toggleFavorite(mediaPath);
      setFavorites(res.favorites || []);
    } catch (e) {
      console.warn('Error alternando favorito:', e);
    } finally {
      setIsTogglingFav(false);
    }
  };

  // Si es Serie o Anime, cargar árbol de temporadas y episodios
  const isSeries = metadata?.type === 'serie' || mediaPath?.startsWith('Series');
  const isAnime = metadata?.type === 'anime' || mediaPath?.startsWith('Anime');

  // Cargar y calcular Títulos Similares en base a géneros, temática y catálogo
  useEffect(() => {
    let isMounted = true;
    async function loadSimilar() {
      try {
        const [catData, metaData] = await Promise.all([
          fetchCatalog().catch(() => ({ movies: [], series: [], anime: [], personal: [] })),
          fetchMetadata().catch(() => ({}))
        ]);

        if (!isMounted) return;
        setCatalogMetadata(metaData || {});

        const allMedia = [
          ...(catData.movies || []),
          ...(catData.series || []),
          ...(catData.anime || [])
        ];

        // Filtrar excluyendo el medio actual
        const candidates = allMedia.filter((item) => item.path && item.path !== mediaPath);

        const currentGenres = (metadata?.genres || []).map((g) => g.toLowerCase());
        const currentType = isAnime ? 'anime' : isSeries ? 'serie' : 'película';
        const currentTitle = (metadata?.cleanTitle || metadata?.title || mediaName || '').toLowerCase();
        const currentKeywords = currentTitle.split(/[\s:_\.-]+/).filter((w) => w.length > 3);

        const scored = candidates.map((cand) => {
          const candMeta = metaData[cand.path] || {};
          let score = 0;

          // Categoría o tipo coincidente
          const candType = (candMeta.type || cand.category || (cand.path?.startsWith('Anime') ? 'anime' : cand.path?.startsWith('Series') ? 'serie' : 'película')).toLowerCase();
          if (candType === currentType) {
            score += 5;
          }

          // Coincidencia de géneros
          const candGenres = (candMeta.genres || []).map((g) => g.toLowerCase());
          for (const g of currentGenres) {
            if (candGenres.includes(g)) score += 4;
          }

          // Coincidencia por palabras clave en títulos (ej. franquicias: Dragon Ball, Batman, etc.)
          const candTitle = (candMeta.cleanTitle || candMeta.title || cand.name || '').toLowerCase();
          for (const kw of currentKeywords) {
            if (candTitle.includes(kw)) score += 6;
          }

          // Factor desempate TMDB rating
          if (candMeta.rating) score += Math.min(2, candMeta.rating / 5);

          return { cand, score, meta: candMeta };
        });

        // Filtrar con score relevante (> 3) y ordenar de mayor a menor
        const topSimilar = scored
          .filter((s) => s.score >= 4)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map((s) => s.cand);

        if (isMounted) {
          setSimilarTitles(topSimilar);
        }
      } catch (err) {
        console.warn('Error calculando títulos similares:', err);
      }
    }

    if (metadata) {
      loadSimilar();
    }

    return () => {
      isMounted = false;
    };
  }, [mediaPath, metadata, isAnime, isSeries, mediaName]);

  useEffect(() => {
    let isMounted = true;

    async function loadSeriesStructure() {
      if (!isSeries && !isAnime) return;

      try {
        setSeriesLoading(true);
        const category = isAnime ? 'Anime' : 'Series';
        const trees = await fetchSeriesTree(category).catch(() => []);

        // Encontrar la serie correspondiente en el árbol
        // La ruta es por ejemplo "Series/Naruto" o "Series/Naruto/Temporada 1/..."
        const pathParts = (mediaPath || '').split('/').filter(Boolean);
        const targetSeriesName = pathParts[1] || metadata?.cleanTitle || mediaName;

        const matchedTree = trees.find(
          (t) =>
            t.title?.toLowerCase() === targetSeriesName.toLowerCase() ||
            targetSeriesName.toLowerCase().includes(t.title?.toLowerCase())
        );

        if (isMounted && matchedTree?.seasons?.length) {
          setSeasons(matchedTree.seasons);
          setSelectedSeasonNumber(matchedTree.seasons[0]?.number || 1);
        } else if (isMounted) {
          // Generar una temporada predeterminada si no hay estructura jerárquica
          setSeasons([
            {
              number: 1,
              name: 'Temporada 1',
              episodes: [
                {
                  name: mediaName,
                  cleanTitle: metadata?.cleanTitle || mediaName,
                  path: mediaPath,
                  season: 1,
                  episode: 1
                }
              ]
            }
          ]);
        }
      } catch (err) {
        console.warn('Error cargando estructura de episodios:', err);
      } finally {
        if (isMounted) setSeriesLoading(false);
      }
    }

    loadSeriesStructure();
    return () => {
      isMounted = false;
    };
  }, [mediaPath, isSeries, isAnime, metadata]);

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
    } else {
      navigate(-1);
    }
  };

  const handlePlayMedia = (itemToPlay) => {
    if (propOnPlay) {
      propOnPlay(itemToPlay);
    } else {
      setPlayingItem(itemToPlay);
    }
  };

  const title = metadata?.title || metadata?.cleanTitle || mediaName.replace(/\.[^/.]+$/, '').replace(/[\._-]/g, ' ');
  const synopsis = metadata?.synopsis || 'Sinopsis cinematográfica no disponible en este momento.';
  const posterUrl = metadata?.posterUrl || (metadata?.poster_path ? `https://image.tmdb.org/t/p/w500${metadata.poster_path}` : null);
  const backdropUrl = metadata?.backdropUrl || (metadata?.backdrop_path ? `https://image.tmdb.org/t/p/original${metadata.backdrop_path}` : null);
  const genres = metadata?.genres && metadata.genres.length > 0 ? metadata.genres : ['Película', 'Acción'];
  const actors = metadata?.actors || [];
  const year = metadata?.year || null;
  const rating = metadata?.rating || null;

  const currentSeason = seasons.find((s) => s.number === selectedSeasonNumber) || seasons[0];
  const currentEpisodes = currentSeason?.episodes || [];

  // Siguiente episodio para autoplay (Binge-Watching estilo Netflix)
  const nextEpisode = useMemo(() => {
    if (!playingItem || !currentEpisodes?.length) return null;
    const currentIdx = currentEpisodes.findIndex(
      (ep) => (ep.path && ep.path === playingItem.path) || (ep.name && ep.name === playingItem.name)
    );
    if (currentIdx !== -1 && currentIdx + 1 < currentEpisodes.length) {
      const next = currentEpisodes[currentIdx + 1];
      return {
        ...next,
        season: next.season || selectedSeasonNumber,
        posterUrl: next.posterUrl || posterUrl || backdropUrl
      };
    }
    // Si terminó la temporada actual y existe una siguiente temporada
    if (currentIdx !== -1 && currentIdx + 1 >= currentEpisodes.length && seasons?.length) {
      const currentSeasonIdx = seasons.findIndex((s) => s.number === selectedSeasonNumber);
      if (currentSeasonIdx !== -1 && currentSeasonIdx + 1 < seasons.length) {
        const nextSeason = seasons[currentSeasonIdx + 1];
        if (nextSeason?.episodes?.length > 0) {
          const next = nextSeason.episodes[0];
          return {
            ...next,
            season: next.season || nextSeason.number,
            posterUrl: next.posterUrl || posterUrl || backdropUrl
          };
        }
      }
    }
    return null;
  }, [playingItem, currentEpisodes, seasons, selectedSeasonNumber, posterUrl, backdropUrl]);

  const handleNextEpisode = useCallback(() => {
    if (nextEpisode) {
      if (nextEpisode.season && nextEpisode.season !== selectedSeasonNumber) {
        setSelectedSeasonNumber(nextEpisode.season);
      }
      setPlayingItem(nextEpisode);
    }
  }, [nextEpisode, selectedSeasonNumber]);

  return (
    <div className="min-h-screen bg-gray-900 text-slate-100 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 -mt-6 sm:-mt-8 pb-20 animate-fade-in relative selection:bg-red-600 selection:text-white">
      {/* ================= 1. HEADER HERO: BACKDROP A ANCHO COMPLETO CON DEGRADADO A BG-GRAY-900 ================= */}
      <div className="relative w-full h-[380px] sm:h-[480px] md:h-[560px] overflow-hidden bg-black">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={title}
            className="w-full h-full object-cover object-center filter blur-0 scale-100 transition-transform duration-1000 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-gray-900 to-black" />
        )}

        {/* Degradado oscuro (Fade to bottom hacia bg-gray-900) */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-transparent to-gray-900/40" />

        {/* Botón flotante Volver */}
        <div className="absolute top-4 sm:top-6 left-4 sm:left-8 z-30 pt-[env(safe-area-inset-top)]">
          <button
            onClick={handleBack}
            className="group flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/10 text-white backdrop-blur-md shadow-2xl transition-all active:scale-95 touch-manipulation"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4 text-red-500 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs sm:text-sm font-bold">Volver</span>
          </button>
        </div>
      </div>

      {/* ================= 2. INFORMACIÓN PRINCIPAL SOBRE EL DEGRADADO ================= */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-44 sm:-mt-56 md:-mt-64">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* Póster Vertical a la Izquierda (2:3 Aspect Ratio) */}
          <div className="w-48 sm:w-60 md:w-72 lg:w-80 shrink-0 mx-auto md:mx-0 shadow-2xl">
            <div className="relative aspect-[2/3] w-full rounded-3xl overflow-hidden bg-dark-900 border border-white/10 ring-1 ring-white/10 shadow-2xl shadow-black/90">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                  <Film className="w-16 h-16 text-red-500/60 mb-2" />
                  <span className="text-xs text-slate-400 font-medium">{title}</span>
                </div>
              )}

              {/* Tag de Tipo superpuesto */}
              <div className="absolute top-3 left-3">
                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md border ${
                  isAnime
                    ? 'bg-purple-900/90 text-purple-200 border-purple-500/40'
                    : isSeries
                    ? 'bg-indigo-900/90 text-indigo-200 border-indigo-500/40'
                    : 'bg-red-950/90 text-red-200 border-red-500/40'
                }`}>
                  {isAnime ? 'Anime' : isSeries ? 'Serie' : 'Película'}
                </span>
              </div>
            </div>
          </div>

          {/* Información a la Derecha */}
          <div className="flex-1 space-y-6 pt-2 md:pt-16">
            {/* Metadatos Superiores */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {year && (
                  <span className="flex items-center gap-1 font-mono text-slate-300 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-red-500" />
                    {year}
                  </span>
                )}
                {rating && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {rating} TMDB
                  </span>
                )}
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono">
                  <Shield className="w-3.5 h-3.5" />
                  HTTP 206 Direct
                </span>
              </div>

              {/* Título Principal */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                {title}
              </h1>

              {mediaName && mediaName !== title && (
                <p className="text-xs text-slate-400 font-mono truncate" title={mediaPath}>
                  Fuente: {mediaPath}
                </p>
              )}
            </div>

            {/* Chips con los Géneros */}
            <div className="flex flex-wrap gap-2">
              {genres.map((g, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-red-300 border border-red-500/30 shadow-sm"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* BOTONES DE ACCIÓN: "Reproducir" y "Guardar en Mi Lista" */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => handlePlayMedia(propMedia || { path: mediaPath, name: mediaName, title })}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-3.5 sm:gap-4 px-6 sm:px-12 py-3.5 sm:py-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-base sm:text-xl shadow-2xl shadow-red-600/40 border border-white/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 touch-manipulation"
              >
                <div className="w-10 h-10 rounded-full bg-white text-red-600 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block tracking-wide truncate">
                    {isSeries || isAnime ? 'Reproducir Primer Episodio' : 'Reproducir Película'}
                  </span>
                  <span className="block text-[11px] font-normal text-red-100 opacity-90 truncate">
                    Transmisión nativa sin cortes en alta fidelidad
                  </span>
                </div>
              </button>

              {/* Botón Favorito / Mi Lista */}
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={isTogglingFav}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 sm:py-5 rounded-2xl font-bold text-sm sm:text-base border transition-all duration-200 active:scale-95 touch-manipulation shadow-lg ${
                  isFavorite
                    ? 'bg-red-950/80 hover:bg-red-900/90 text-red-300 border-red-500/50 shadow-red-600/20'
                    : 'bg-gray-800/80 hover:bg-gray-700/80 text-slate-200 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {isFavorite ? (
                  <BookmarkCheck className="w-5 h-5 text-red-500 fill-red-500" />
                ) : (
                  <Bookmark className="w-5 h-5 text-slate-300" />
                )}
                <span>{isFavorite ? 'En Mi Lista' : 'Guardar en Mi Lista'}</span>
              </button>
            </div>

            {/* Sinopsis */}
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Film className="w-4 h-4 text-red-500" />
                Sinopsis
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-4xl font-normal">
                {synopsis}
              </p>
            </div>

            {/* Fila / Cuadrícula de Actores Principales */}
            {actors.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-red-500" />
                  Reparto Principal
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {actors.slice(0, 10).map((actor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-800/80 border border-slate-700/80 shadow-md backdrop-blur-md"
                    >
                      {actor.profilePath ? (
                        <img
                          src={actor.profilePath}
                          alt={actor.name}
                          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-600"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gray-700 border border-slate-600 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{actor.name}</p>
                        {actor.character && (
                          <p className="text-[11px] text-slate-400 truncate" title={actor.character}>
                            {actor.character}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= 3. LÓGICA DE SERIES / ANIME: SELECTOR DE TEMPORADAS Y LISTA DE EPISODIOS ================= */}
        {(isSeries || isAnime) && (
          <div className="mt-16 pt-10 border-t border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Tv className="w-6 h-6 text-red-500" />
                  Episodios y Temporadas
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Selecciona una temporada para explorar los capítulos disponibles en la nube.
                </p>
              </div>

              {/* Selector Desplegable de Temporadas */}
              {seasons.length > 0 && (
                <div className="relative w-full sm:w-72 shrink-0">
                  <select
                    value={selectedSeasonNumber}
                    onChange={(e) => setSelectedSeasonNumber(parseInt(e.target.value, 10))}
                    className="w-full appearance-none bg-gray-800 border border-slate-700 hover:border-red-500 text-white font-bold text-sm rounded-2xl px-4 py-3 pr-10 shadow-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer"
                  >
                    {seasons.map((s) => (
                      <option key={s.number} value={s.number} className="bg-gray-900 text-white">
                        {s.name || `Temporada ${s.number}`} ({s.episodes?.length || 0} episodios)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-5 h-5 text-red-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Lista de Episodios en Tarjetas Horizontales */}
            <div className="space-y-3">
              {currentEpisodes.length > 0 ? (
                currentEpisodes.map((ep, idx) => (
                  <div
                    key={ep.path || idx}
                    onClick={() => handlePlayMedia(ep)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-gray-800/60 hover:bg-gray-800 border border-slate-800 hover:border-red-500/60 transition-all cursor-pointer shadow-lg active:scale-[0.99] touch-manipulation"
                  >
                    {/* Preview / Badge de Episodio */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-20 sm:w-36 aspect-video rounded-xl bg-black/60 border border-slate-700 group-hover:border-red-500/60 flex items-center justify-center shrink-0 relative overflow-hidden shadow-inner">
                        <span className="font-mono text-xs sm:text-sm font-black text-slate-400 group-hover:text-red-400">
                          {ep.episode ? `E${ep.episode}` : `Ep. ${idx + 1}`}
                        </span>
                        <div className="absolute inset-0 bg-red-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white drop-shadow" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-white group-hover:text-red-400 transition-colors truncate">
                            {ep.cleanTitle || ep.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1 font-mono">
                          Temporada {ep.season || selectedSeasonNumber} &bull; Episodio {ep.episode || idx + 1}
                        </p>
                      </div>
                    </div>

                    {/* Botón de reproducción rápida */}
                    <div className="w-full sm:w-auto flex items-center justify-end sm:justify-start gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-slate-700/40">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayMedia(ep);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 touch-manipulation"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Ver Ahora</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-gray-800/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No hay episodios detectados en esta temporada.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= 4. TÍTULOS SIMILARES EN TU CATÁLOGO ================= */}
        {similarTitles.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                  <Sparkles className="w-6 h-6 text-red-500" />
                  Títulos Similares en tu Catálogo
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Recomendaciones seleccionadas de tu biblioteca basadas en temática, género y categoría.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {similarTitles.map((item, idx) => (
                <VerticalPosterCard
                  key={item.path || idx}
                  item={item}
                  metadata={catalogMetadata}
                  isFavorite={favorites.includes(item.path)}
                  onToggleFavorite={async (toggledItem) => {
                    const res = await toggleFavorite(toggledItem.path);
                    setFavorites(res.favorites || []);
                  }}
                  onClick={() => {
                    navigate(`/media/${encodeURIComponent(item.path)}`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Reproducción Nativo HTTP 206 */}
      {playingItem && (
        <VideoPlayerModal
          item={playingItem}
          onClose={() => setPlayingItem(null)}
          onNextEpisode={nextEpisode ? handleNextEpisode : undefined}
          nextEpisode={nextEpisode}
        />
      )}
    </div>
  );
}
