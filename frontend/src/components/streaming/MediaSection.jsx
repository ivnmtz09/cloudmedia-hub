import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Film, Video, Tv, FolderPlus } from 'lucide-react';
import MediaCard from './MediaCard';

export default function MediaSection({ title, icon: Icon, items = [], onPlay, onDetails, onGoToExplorer }) {
  const scrollRef = useRef(null);

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
            <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              {title}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {items.length}
              </span>
            </h2>
          </div>
        </div>

        {/* Carousel controls */}
        {items.length > 3 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-xl bg-dark-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-xl bg-dark-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {items.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {items.map((item) => (
            <div
              key={item.id || item.path}
              className="w-[260px] sm:w-[300px] shrink-0 snap-start"
            >
              <MediaCard item={item} onPlay={onPlay} onDetails={onDetails} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center bg-dark-900/30">
          <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium mb-1">No hay videos en {title} aún</p>
          <p className="text-xs text-slate-400 mb-4">
            Puedes subir archivos a Google Drive o usar el módulo de limpieza para transferir videos pesados desde tu PC.
          </p>
          {onGoToExplorer && (
            <button
              onClick={onGoToExplorer}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-brand-400" />
              <span>Explorar o Subir Archivos</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
