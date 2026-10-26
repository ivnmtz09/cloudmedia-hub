import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Film, Tv, Play, X, Check, Disc, Volume2 } from 'lucide-react';

export function CommandPalette({ isOpen, onClose, catalog = [], metadata = {}, onSelectMedia }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'Peliculas' | 'Series' | 'Anime'
  const [qualityFilter, setQualityFilter] = useState('all'); // 'all' | '1080p' | '720p'
  const [audioFilter, setAudioFilter] = useState('all'); // 'all' | 'DUAL' | 'LAT'
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Flatten catalog items
  const allMediaItems = useMemo(() => {
    const items = [];
    if (catalog.movies) items.push(...catalog.movies);
    if (catalog.series) items.push(...catalog.series);
    if (catalog.anime) items.push(...catalog.anime);
    if (catalog.personal) items.push(...catalog.personal);
    if (catalog.all && items.length === 0) items.push(...catalog.all);
    return items;
  }, [catalog]);

  // Filter items
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allMediaItems.filter((item) => {
      const meta = metadata[item.path] || {};
      const cleanTitle = (meta.cleanTitle || item.title || item.name).toLowerCase();
      const synopsis = (meta.synopsis || '').toLowerCase();
      const filename = (item.name || '').toLowerCase();
      const badges = meta.badges || [];

      // Query match
      const matchesQuery = !q || cleanTitle.includes(q) || synopsis.includes(q) || filename.includes(q);
      if (!matchesQuery) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Quality filter
      if (qualityFilter !== 'all') {
        const hasQuality = badges.some((b) => b.toLowerCase().includes(qualityFilter.toLowerCase()));
        if (!hasQuality) return false;
      }

      // Audio filter
      if (audioFilter !== 'all') {
        const hasAudio = badges.some((b) => b.toUpperCase() === audioFilter.toUpperCase());
        if (!hasAudio) return false;
      }

      return true;
    });
  }, [allMediaItems, metadata, query, selectedCategory, qualityFilter, audioFilter]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelectMedia(filtered[selectedIndex]);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onSelectMedia, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/85 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden animate-scale-in text-theme-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-theme-border/60 gap-3">
          <Search className="w-5 h-5 text-theme-accent flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar por título, sinopsis, saga o calidad... (Esc para salir)"
            className="w-full bg-transparent text-sm text-theme-text placeholder-theme-muted outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-white/10 text-theme-muted hover:text-theme-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="px-4 py-2.5 border-b border-theme-border/40 bg-white/5 flex flex-wrap gap-2 text-xs">
          {/* Categorías */}
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'Todo' },
              { id: 'Peliculas', label: 'Películas' },
              { id: 'Series', label: 'Series' },
              { id: 'Anime', label: 'Anime' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-theme-accent text-white shadow-sm'
                    : 'bg-white/5 text-theme-muted hover:text-theme-text'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/10 self-center mx-1" />

          {/* Calidad */}
          <div className="flex items-center gap-1">
            {['all', '1080p', '720p'].map((q) => (
              <button
                key={q}
                onClick={() => setQualityFilter(q)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  qualityFilter === q
                    ? 'bg-theme-accent/20 text-theme-accent border border-theme-accent/30'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
              >
                {q === 'all' ? 'Cualquier calidad' : q}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/10 self-center mx-1" />

          {/* Audio */}
          <div className="flex items-center gap-1">
            {['all', 'DUAL', 'LAT'].map((a) => (
              <button
                key={a}
                onClick={() => setAudioFilter(a)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  audioFilter === a
                    ? 'bg-theme-accent/20 text-theme-accent border border-theme-accent/30'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
              >
                {a === 'all' ? 'Cualquier audio' : a}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-theme-muted">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <div className="text-sm">Sin coincidencias para la búsqueda</div>
              <div className="text-xs text-theme-muted/70 mt-1">
                Prueba ajustando los filtros de categoría o calidad
              </div>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const meta = metadata[item.path] || {};
              const isSelected = idx === selectedIndex;
              const displayTitle = meta.cleanTitle || meta.title || item.title || item.name;
              const badges = meta.badges || [];

              return (
                <div
                  key={item.path || idx}
                  onClick={() => {
                    onSelectMedia(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-theme-accent/15 border border-theme-accent/30 text-theme-text'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Thumbnail / Poster */}
                  <div className="w-11 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center border border-white/10">
                    {meta.posterUrl ? (
                      <img src={meta.posterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-5 h-5 text-theme-muted" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{displayTitle}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-theme-muted flex-shrink-0">
                        {item.category || 'video'}
                      </span>
                    </div>

                    {meta.synopsis && (
                      <p className="text-xs text-theme-muted line-clamp-1 mt-0.5">
                        {meta.synopsis}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-1">
                      {badges.map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-theme-accent/10 text-theme-accent border border-theme-accent/20"
                        >
                          {b}
                        </span>
                      ))}
                      {item.humanSize && (
                        <span className="text-[10px] text-theme-muted font-mono ml-auto">
                          {item.humanSize}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 p-2 text-theme-accent opacity-80">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-theme-border/40 text-[11px] text-theme-muted flex items-center justify-between bg-black/20">
          <span>{filtered.length} resultado(s) encontrados</span>
          <div className="flex items-center gap-3">
            <span>↑↓ Navegar</span>
            <span>↵ Reproducir</span>
            <span>Esc Cerrar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
