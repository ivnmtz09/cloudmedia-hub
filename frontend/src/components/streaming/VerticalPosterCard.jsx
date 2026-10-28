import React, { useState } from 'react';
import { Film, Tv, Play, Star } from 'lucide-react';
import { getThumbnailUrl } from '../../services/api';

export default function VerticalPosterCard({
  item,
  metadata = {},
  onClick
}) {
  const [imgError, setImgError] = useState(false);

  const meta = metadata[item.path] || item.metadata || {};
  const cleanTitle = meta.cleanTitle || meta.title || item.cleanTitle || item.title || item.name?.replace(/\.[^/.]+$/, '').replace(/[\._-]/g, ' ') || 'Sin Título';
  const year = meta.year || item.year || null;
  const rating = meta.rating || meta.score || null;
  const posterUrl = meta.posterUrl || item.posterUrl || (imgError ? null : getThumbnailUrl(item.path));

  const isSeries = item.category === 'Series' || meta.type === 'serie' || item.path?.startsWith('Series');
  const isAnime = item.category === 'Anime' || meta.type === 'anime' || item.path?.startsWith('Anime');

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer transition-transform duration-300 transform hover:-translate-y-1.5 focus:outline-none"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
    >
      {/* 1. Contenedor del Póster Vertical 2:3 */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-dark-900 border border-slate-800/90 group-hover:border-red-500/60 shadow-lg group-hover:shadow-2xl group-hover:shadow-red-600/25 transition-all duration-300">
        {posterUrl && !imgError ? (
          <img
            src={posterUrl}
            alt={cleanTitle}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-3 text-center">
            {isAnime ? (
              <Tv className="w-10 h-10 text-purple-400/60 mb-2" />
            ) : isSeries ? (
              <Tv className="w-10 h-10 text-indigo-400/60 mb-2" />
            ) : (
              <Film className="w-10 h-10 text-red-500/60 mb-2" />
            )}
            <span className="text-[11px] text-slate-400 line-clamp-2 px-1 font-medium">
              {cleanTitle}
            </span>
          </div>
        )}

        {/* Overlay Scrim al Hover con botón Play */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Badge de tipo */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md border shadow-sm ${
            isAnime
              ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
              : isSeries
              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
              : 'bg-red-950/80 text-red-300 border-red-500/40'
          }`}>
            {isAnime ? 'Anime' : isSeries ? 'Serie' : 'Película'}
          </span>
        </div>

        {/* Rating */}
        {rating && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-dark-950/85 backdrop-blur-md border border-amber-500/40 text-[10px] font-bold text-amber-300 shadow-sm pointer-events-none">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              {rating}
            </span>
          </div>
        )}
      </div>

      {/* 2. Textos Debajo del Póster: Solo Título Limpio y Año */}
      <div className="mt-2.5 px-0.5 min-w-0">
        <h3
          className="text-xs sm:text-sm font-semibold text-white group-hover:text-red-400 transition-colors truncate"
          title={cleanTitle}
        >
          {cleanTitle}
        </h3>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
          {year || 'Disponible'}
        </p>
      </div>
    </div>
  );
}
