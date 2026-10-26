import React from 'react';
import { Play, Info, Sparkles, Film, Disc } from 'lucide-react';
import { getThumbnailUrl } from '../../services/api';

export default function HeroBanner({ movie, onPlay, onDetails }) {
  if (!movie) {
    return (
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-slate-800/80 p-8 sm:p-12 mb-10 shadow-2xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Centro Multimedia en la Nube</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Tu Catálogo de Cine & Streaming
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
            Transmite tus películas, series y recuerdos familiares alojados en Google Drive directamente a tu navegador en alta definición, con soporte para Dual Audio y remuxing en tiempo real.
          </p>
        </div>
      </div>
    );
  }

  const thumbUrl = getThumbnailUrl(movie.path);
  const ext = (movie.extension || '').replace('.', '').toUpperCase();

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-800/80 mb-10 shadow-2xl group min-h-[380px] sm:min-h-[460px] flex items-end">
      {/* Background with thumbnail and layered gradients */}
      <div className="absolute inset-0 z-0">
        <img
          src={thumbUrl}
          alt={movie.title || movie.name}
          className="w-full h-full object-cover object-center filter brightness-60 contrast-110 group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/80 to-transparent w-full md:w-3/4" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-12 max-w-3xl">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-400 text-xs font-bold uppercase tracking-wider">
            <Film className="w-3.5 h-3.5" />
            Destacado
          </span>

          <span className="px-2.5 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/10 text-white text-xs font-semibold">
            {ext || 'VIDEO'}
          </span>

          <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            Dual Audio Ready
          </span>

          {movie.humanSize && (
            <span className="px-2.5 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-xs font-medium">
              {movie.humanSize}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-3 line-clamp-2 drop-shadow-md">
          {movie.title || movie.name}
        </h1>

        <p className="text-slate-300 text-sm sm:text-base mb-6 line-clamp-2 max-w-xl drop-shadow">
          Disponible para streaming directo vía HTTP 206 y transcodificación acelerada con FFmpeg. Ubicado en Google Drive/{movie.path}.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => onPlay(movie)}
            className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-brand-500/30 hover:shadow-glow-red transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Reproducir Ahora</span>
          </button>

          <button
            onClick={() => onDetails && onDetails(movie)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white font-semibold text-sm backdrop-blur-md border border-slate-700/60 transition-all duration-200"
          >
            <Info className="w-4 h-4" />
            <span>Metadatos & Pistas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
