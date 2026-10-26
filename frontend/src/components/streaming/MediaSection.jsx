import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Film, FolderPlus } from 'lucide-react';
import MediaCard from './MediaCard';

export default function MediaSection({ title, icon: Icon, items = [], metadata = {}, onPlay, onDetails, onGoToExplorer }) {
  const scrollRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // 3. PARENTING: Sincroniza el scroll del carrusel con la posición y escala de los indicadores hijos
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
      setScrollProgress(progress);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-2 rounded-xl bg-theme-accent/15 border border-theme-accent/25 text-theme-accent">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-theme-text tracking-tight flex items-center gap-2">
              {title}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-theme-muted border border-white/10">
                {items.length}
              </span>
            </h2>
          </div>
        </div>

        {/* Carousel controls & Parenting indicator */}
        {items.length > 3 && (
          <div className="flex items-center gap-3">
            {/* Barra de progreso de Parenting */}
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
              <div
                className="h-full bg-theme-accent transition-all duration-150 parent-sync rounded-full"
                style={{
                  width: `${Math.max(15, (1 / Math.ceil(items.length / 2)) * 100)}%`,
                  transform: `translateX(${scrollProgress * 150}%)`
                }}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scroll('left')}
                aria-label="Desplazar a la izquierda"
                className="min-h-10 min-w-10 flex items-center justify-center rounded-xl bg-theme-surface hover:bg-theme-card text-theme-muted hover:text-theme-text transition-colors border border-theme-border focus-ring"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                aria-label="Desplazar a la derecha"
                className="min-h-10 min-w-10 flex items-center justify-center rounded-xl bg-theme-surface hover:bg-theme-card text-theme-muted hover:text-theme-text transition-colors border border-theme-border focus-ring"
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {items.length > 0 ? (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {items.map((item, index) => (
            <div
              key={item.id || item.path}
              className="w-[260px] sm:w-[300px] shrink-0 snap-start"
            >
              {/* 2. OFFSET & DELAY: Pasamos staggerIndex para escalonar 60ms por card */}
              <MediaCard
                item={item}
                metadata={metadata}
                staggerIndex={index % 8}
                onPlay={onPlay}
                onDetails={onDetails}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-theme-border p-8 text-center bg-theme-surface">
          <Film className="w-10 h-10 text-theme-muted mx-auto mb-3" />
          <p className="text-sm text-theme-muted font-medium mb-1">No hay videos en {title} aún</p>
          <p className="text-xs text-theme-muted mb-4">
            Puedes subir archivos a Google Drive o usar el módulo de subida clasificada para añadir películas, series o anime.
          </p>
          {onGoToExplorer && (
            <button
              onClick={onGoToExplorer}
              className="min-h-12 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-semibold shadow-md transition-colors focus-ring"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Explorar o Subir Archivos</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
