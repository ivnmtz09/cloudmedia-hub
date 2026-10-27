import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Film,
  Tv,
  Sparkles,
  Star,
  Play,
  ArrowRight,
  CornerDownLeft,
  SlidersHorizontal
} from 'lucide-react';
import { fetchCatalog, fetchMetadata, getThumbnailUrl } from '../../services/api';

/**
 * Normaliza cadenas de texto para búsqueda difusa insensible a mayúsculas y acentos
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Determina el tipo y estilo del badge de categoría
 */
function getCategoryBadge(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('peli') || cat === 'movies') {
    return {
      label: 'Película',
      className: 'bg-red-500/15 text-red-400 border-red-500/30'
    };
  }
  if (cat.includes('serie')) {
    return {
      label: 'Serie',
      className: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    };
  }
  if (cat.includes('anime')) {
    return {
      label: 'Anime',
      className: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    };
  }
  return {
    label: 'Personal',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  };
}

export function QuickSearchModal({
  isOpen: propIsOpen,
  onClose: propOnClose,
  catalog: propCatalog,
  metadata: propMetadata,
  onSelectMedia
}) {
  const navigate = useNavigate();

  // Soporta uso controlado (props) o autónomo (state interno)
  const isControlled = typeof propIsOpen === 'boolean';
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? propIsOpen : internalOpen;

  const handleClose = useCallback(() => {
    if (propOnClose) {
      propOnClose();
    } else {
      setInternalOpen(false);
    }
  }, [propOnClose]);

  // Estado del catálogo y metadatos locales (se autodescargan si no se pasan como props)
  const [localCatalog, setLocalCatalog] = useState(null);
  const [localMetadata, setLocalMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de búsqueda y navegación
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const activeItemRef = useRef(null);

  // Carga automática del catálogo y metadatos si no se proporcionan por props
  useEffect(() => {
    if (propCatalog && propMetadata) return;

    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [cat, meta] = await Promise.all([
          propCatalog ? Promise.resolve(propCatalog) : fetchCatalog().catch(() => ({ movies: [], series: [], anime: [], personal: [], all: [] })),
          propMetadata ? Promise.resolve(propMetadata) : fetchMetadata().catch(() => ({}))
        ]);
        if (isMounted) {
          if (!propCatalog) setLocalCatalog(cat);
          if (!propMetadata) setLocalMetadata(meta);
        }
      } catch (err) {
        console.warn('[QuickSearchModal] Error al precargar catálogo:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [propCatalog, propMetadata]);

  // Catálogo y metadatos activos
  const activeCatalog = propCatalog || localCatalog || { movies: [], series: [], anime: [], personal: [], all: [] };
  const activeMetadata = propMetadata || localMetadata || {};

  // Aplanar todos los elementos del catálogo
  const allMediaItems = useMemo(() => {
    const items = [];
    if (Array.isArray(activeCatalog.movies)) items.push(...activeCatalog.movies);
    if (Array.isArray(activeCatalog.series)) items.push(...activeCatalog.series);
    if (Array.isArray(activeCatalog.anime)) items.push(...activeCatalog.anime);
    if (Array.isArray(activeCatalog.personal)) items.push(...activeCatalog.personal);
    if (items.length === 0 && Array.isArray(activeCatalog.all)) items.push(...activeCatalog.all);
    return items;
  }, [activeCatalog]);

  // Escucha global de atajos Ctrl+K y Cmd+K para abrir/cerrar
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          handleClose();
        } else {
          if (propOnClose && isControlled) {
            // Si es controlado pero cerrado, invoca el listener del padre si existe
            // App.jsx ya tiene su propio listener, pero esto previene omisiones
          } else {
            setInternalOpen(true);
          }
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isOpen, handleClose, isControlled, propOnClose]);

  // Foco automático en el input al abrir y reinicio de índice
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Búsqueda difusa e instantánea en el catálogo local
  const filteredResults = useMemo(() => {
    const rawQuery = query.trim();
    const normalizedQuery = normalizeText(rawQuery);
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    let candidates = allMediaItems;

    // Filtro rápido por categoría
    if (selectedCategory !== 'all') {
      candidates = candidates.filter((item) => {
        const itemCat = (item.category || '').toLowerCase();
        if (selectedCategory === 'Peliculas') return itemCat.includes('peli') || itemCat === 'movies';
        if (selectedCategory === 'Series') return itemCat.includes('serie');
        if (selectedCategory === 'Anime') return itemCat.includes('anime');
        if (selectedCategory === 'Personal') return itemCat.includes('person') || itemCat.includes('video');
        return true;
      });
    }

    if (terms.length === 0) {
      // Si no hay término, devolver los primeros 12 títulos del catálogo
      return candidates.slice(0, 12);
    }

    // Puntuación de relevancia para cada candidato
    const scored = [];

    for (const item of candidates) {
      const meta = activeMetadata[item.path] || {};
      const cleanTitle = normalizeText(meta.cleanTitle || meta.title || item.title || item.name);
      const originalTitle = normalizeText(meta.originalTitle || '');
      const year = normalizeText(meta.year || item.year || '');
      const synopsis = normalizeText(meta.synopsis || '');
      const category = normalizeText(item.category || meta.type || meta.category || '');

      // Géneros
      const genresArray = Array.isArray(meta.genres)
        ? meta.genres.map(normalizeText)
        : [normalizeText(meta.genre || '')];

      // Actores / Reparto
      const actorsArray = Array.isArray(meta.actors)
        ? meta.actors.map((a) => (typeof a === 'object' ? normalizeText(a?.name) : normalizeText(a)))
        : [normalizeText(meta.actors || '')];

      // Badges
      const badgesArray = (meta.badges || []).map(normalizeText);

      // Comprobar que todos los términos de búsqueda coincidan en al menos un campo
      const matchesAllTerms = terms.every((term) => {
        return (
          cleanTitle.includes(term) ||
          originalTitle.includes(term) ||
          year.includes(term) ||
          category.includes(term) ||
          genresArray.some((g) => g.includes(term)) ||
          actorsArray.some((a) => a.includes(term)) ||
          badgesArray.some((b) => b.includes(term)) ||
          synopsis.includes(term)
        );
      });

      if (!matchesAllTerms) continue;

      // Cálculo de puntaje de relevancia difuso
      let score = 0;

      if (cleanTitle === normalizedQuery) score += 120;
      else if (cleanTitle.startsWith(normalizedQuery)) score += 60;
      else if (cleanTitle.includes(normalizedQuery)) score += 35;

      terms.forEach((term) => {
        if (cleanTitle.includes(term)) score += 20;
        if (actorsArray.some((a) => a.includes(term))) score += 15;
        if (genresArray.some((g) => g.includes(term))) score += 12;
        if (year.includes(term)) score += 10;
        if (category.includes(term)) score += 8;
        if (synopsis.includes(term)) score += 4;
      });

      // Bonus si tiene poster y rating
      if (meta.posterUrl || meta.poster_path) score += 5;
      if (meta.rating || meta.score) score += 3;

      scored.push({ item, meta, score });
    }

    // Ordenar por score descendente y limitar a los 25 mejores resultados
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 25).map((entry) => entry.item);
  }, [allMediaItems, activeMetadata, query, selectedCategory]);

  // Ajustar selectedIndex cuando cambia la lista de resultados
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  // Hacer scroll automático al elemento activo con navegación por teclado
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  // Ejecutar selección de ítem
  const handleSelectItem = useCallback((item) => {
    if (!item) return;
    if (onSelectMedia) {
      onSelectMedia(item);
    } else {
      navigate(`/media/${encodeURIComponent(item.path)}`);
    }
    handleClose();
  }, [onSelectMedia, navigate, handleClose]);

  // Navegación con teclado: Flecha Arriba / Abajo, Enter, Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredResults.length > 0 ? (prev + 1) % filteredResults.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredResults.length > 0 ? (prev - 1 + filteredResults.length) % filteredResults.length : 0
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelectItem(filteredResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, handleSelectItem, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Buscador Global Omnibar CloudMedia Hub"
    >
      <div
        className="w-full max-w-2xl bg-slate-900/95 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col max-h-[85vh] text-slate-100 transition-all transform animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. INPUT DE BÚSQUEDA OMNIBAR ================= */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-800 gap-3 bg-slate-950/40">
          <Search className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, año, género, actores o tipo... (Esc para salir)"
            className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-400 outline-none pr-8 font-sans"
            autoComplete="off"
            spellCheck="false"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* ================= 2. FILTROS RÁPIDOS DE CATEGORÍA ================= */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/20 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar text-xs">
          <div className="flex items-center gap-1.5 flex-nowrap">
            {[
              { id: 'all', label: 'Todo el Catálogo' },
              { id: 'Peliculas', label: 'Películas' },
              { id: 'Series', label: 'Series' },
              { id: 'Anime', label: 'Anime' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap text-xs ${
                  selectedCategory === cat.id
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center text-[11px] text-slate-400 font-mono flex-shrink-0">
            <span>{filteredResults.length} {filteredResults.length === 1 ? 'coincidencia' : 'coincidencias'}</span>
          </div>
        </div>

        {/* ================= 3. LISTA DE RESULTADOS ================= */}
        <div
          ref={listRef}
          className="overflow-y-auto p-2 space-y-1.5 flex-1 max-h-[55vh] sm:max-h-[60vh] divide-y divide-slate-800/30"
        >
          {filteredResults.length === 0 ? (
            <div className="py-14 text-center text-slate-400 px-4">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-600 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-300">
                No encontramos títulos para &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Intenta buscar por el nombre de un actor, género (Acción, Terror, Sci-Fi), año o cambia el filtro de categoría.
              </p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const meta = activeMetadata[item.path] || {};
              const isSelected = idx === selectedIndex;
              const displayTitle = meta.cleanTitle || meta.title || item.title || item.name;

              // Detección de año
              const year =
                meta.year ||
                (item.name ? item.name.match(/\b(19\d\d|20\d\d)\b/)?.[1] : null);

              // Detección de rating
              const rawRating = meta.rating || meta.score || meta.vote_average;
              const rating = rawRating ? Number(rawRating).toFixed(1) : null;

              // Poster URL con fallback
              const posterUrl =
                meta.posterUrl ||
                (meta.poster_path ? `https://image.tmdb.org/t/p/w200${meta.poster_path}` : null) ||
                getThumbnailUrl(item.path);

              const categoryBadge = getCategoryBadge(item.category || meta.category);

              // Actores o géneros destacados
              const genres = Array.isArray(meta.genres) ? meta.genres.slice(0, 3).join(' • ') : '';
              const actors = Array.isArray(meta.actors)
                ? meta.actors
                    .slice(0, 2)
                    .map((a) => (typeof a === 'object' ? a.name : a))
                    .join(', ')
                : '';

              return (
                <div
                  key={item.path || idx}
                  ref={isSelected ? activeItemRef : null}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group flex items-center gap-3.5 p-2 sm:p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-red-600/15 border border-red-500/40 text-white shadow-md shadow-red-950/20'
                      : 'hover:bg-slate-800/50 border border-transparent text-slate-200'
                  }`}
                >
                  {/* Minitaura / Póster TMDB */}
                  <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center border border-slate-700/60 relative shadow-sm">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={displayTitle}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <Film className="w-6 h-6 text-slate-500" />
                    )}
                  </div>

                  {/* Información Detallada */}
                  <div className="flex-1 min-w-0 pr-2">
                    {/* Título y Año */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base text-slate-100 truncate group-hover:text-white">
                        {displayTitle}
                      </span>
                      {year && (
                        <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                          {year}
                        </span>
                      )}
                    </div>

                    {/* Badges de Tipo y Rating */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Badge Película/Serie/Anime */}
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${categoryBadge.className}`}
                      >
                        {categoryBadge.label}
                      </span>

                      {/* Rating TMDB */}
                      {rating && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded-md">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{rating}</span>
                        </span>
                      )}

                      {/* Géneros */}
                      {genres && (
                        <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                          {genres}
                        </span>
                      )}
                    </div>

                    {/* Actores / Sinopsis */}
                    {actors && (
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        <span className="text-slate-500">Reparto:</span> {actors}
                      </p>
                    )}
                  </div>

                  {/* Indicador de acción (Abrir / Enter) */}
                  <div className="flex-shrink-0 flex items-center pr-1">
                    {isSelected ? (
                      <div className="flex items-center gap-1 text-xs text-red-400 font-mono bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 animate-fade-in">
                        <span className="hidden sm:inline">Abrir</span>
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ================= 4. PIE DEL MODAL CON ATAJOS VISUALES ================= */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-slate-400">
            <span className="font-semibold text-slate-300">CloudMedia Hub</span>
            <span className="text-slate-600">•</span>
            <span>Búsqueda Rápida Instantánea</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                ↑↓
              </kbd>
              <span>Navegar</span>
            </span>

            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                Enter ↵
              </kbd>
              <span>Abrir</span>
            </span>

            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                Esc
              </kbd>
              <span>Cerrar</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickSearchModal;
