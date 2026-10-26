import React, { useState, useEffect } from 'react';
import { Play, Info, Sparkles, Film } from 'lucide-react';
import { getThumbnailUrl } from '../../services/api';

export default function HeroBanner({ movie, metadata = {}, onPlay, onDetails }) {
  const [scrollY, setScrollY] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 25; // max 12.5px
    const y = (clientY / innerHeight - 0.5) * 25; // max 12.5px
    setMouseOffset({ x, y });
  };

  if (!movie) {
    return (
      <div className="relative rounded-3xl overflow-hidden bg-theme-surface border border-theme-border p-8 sm:p-12 mb-10 shadow-2xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-theme-accent/15 border border-theme-accent/25 text-theme-accent text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Centro Multimedia en la Nube</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-theme-text tracking-tight mb-4">
            Tu Catálogo de Cine & Streaming
          </h1>
          <p className="text-theme-muted text-sm sm:text-base leading-relaxed mb-6">
            Transmite tus películas, series y anime alojados en Google Drive directamente con VLC Engine en alta definición, con soporte para Dual Audio y remuxing en tiempo real.
          </p>
        </div>
      </div>
    );
  }

  const meta = metadata[movie.path] || {};
  const cleanTitle = meta.cleanTitle || movie.title || movie.name;
  const synopsis = meta.synopsis || `Disponible para streaming directo vía HTTP 206 y transcodificación acelerada con FFmpeg. Ubicado en Google Drive/${movie.path}.`;
  const thumbUrl = meta.posterUrl || getThumbnailUrl(movie.path);
  const ext = (movie.extension || '').replace('.', '').toUpperCase();

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative rounded-3xl overflow-hidden border border-white/10 mb-10 shadow-2xl group min-h-[380px] sm:min-h-[480px] flex items-end bg-[#0d0e12]"
    >
      {/* 10. PARALLAX: Fondo a velocidad diferencial 0.4x con scroll y movimiento del ratón */}
      <div
        className="parallax-layer absolute -inset-8 z-0 pointer-events-none"
        style={{
          transform: `translate3d(${mouseOffset.x}px, ${scrollY * 0.4 + mouseOffset.y}px, 0) scale(1.1)`
        }}
      >
        <img
          src={thumbUrl}
          alt={cleanTitle}
          className="w-full h-full object-cover object-center filter brightness-[0.45] contrast-110 group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-theme-bg via-theme-bg/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-theme-bg via-theme-bg/80 to-transparent w-full md:w-3/4" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-12 max-w-3xl">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-theme-accent/20 border border-theme-accent/40 text-theme-accent text-xs font-bold uppercase tracking-wider">
            <Film className="w-3.5 h-3.5" />
            Destacado
          </span>

          <span className="px-2.5 py-0.5 rounded-md bg-theme-card border border-theme-border text-white text-xs font-semibold">
            {ext || 'VIDEO'}
          </span>

          <span className="px-2.5 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-semibold">
            VLC Engine 200%
          </span>

          {movie.humanSize && (
            <span className="px-2.5 py-0.5 rounded-md bg-black/60 text-slate-300 text-xs font-mono">
              {movie.humanSize}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-3 line-clamp-2 drop-shadow-md">
          {cleanTitle}
        </h1>

        <p className="text-slate-300 text-sm sm:text-base mb-6 line-clamp-2 max-w-xl drop-shadow leading-relaxed">
          {synopsis}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => onPlay(movie)}
            className="min-h-12 flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-theme-accent hover:bg-theme-accent-hover text-white font-bold text-sm tracking-wide shadow-lg shadow-theme-accent/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 focus-ring"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Reproducir Ahora</span>
          </button>

          <button
            onClick={() => onDetails && onDetails(movie)}
            className="min-h-12 flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-theme-card hover:bg-theme-border/60 text-slate-200 hover:text-white font-semibold text-sm border border-theme-border transition-all duration-200 focus-ring"
          >
            <Info className="w-4 h-4" />
            <span>Metadatos &amp; Pistas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
