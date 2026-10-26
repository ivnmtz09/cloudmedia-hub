import React, { useState, useRef } from 'react';
import { Play, Film, Info, Sparkles, RotateCw, Volume2, HardDrive, Clock, Check } from 'lucide-react';
import { getThumbnailUrl } from '../../services/api';

export default function MediaCard({ item, metadata = {}, onPlay, onDetails, staggerIndex = 0 }) {
  const [thumbError, setThumbError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const cardRef = useRef(null);

  const ext = (item.extension || '').replace('.', '').toUpperCase();
  const meta = metadata[item.path] || {};
  const cleanTitle = meta.cleanTitle || item.title || item.name;
  const badges = meta.badges || [];
  const synopsis = meta.synopsis || '';
  const posterUrl = meta.posterUrl || (thumbError ? null : getThumbnailUrl(item.path));

  // 3D Tilt calculation
  const handleMouseMove = (e) => {
    if (isFlipped || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // x pos within card
    const y = e.clientY - rect.top;  // y pos within card

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // max -10 to 10 deg
    const rotateY = ((x - centerX) / centerX) * 10;  // max -10 to 10 deg

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const toggleFlip = (e) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        animationDelay: `${staggerIndex * 60}ms`
      }}
      className="perspective-container relative w-full h-[360px] animate-stagger-item group"
    >
      <div
        className={`flip-card-inner transition-transform-spring duration-500 w-full h-full ${
          isFlipped ? 'flip-card-flipped' : ''
        }`}
        style={{
          transform: isFlipped
            ? 'rotateY(180deg)'
            : `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${
                isHovered ? 1.03 : 1
              }, ${isHovered ? 1.03 : 1}, 1)`
        }}
      >
        {/* ================= CARA FRONTAL ================= */}
        <div
          onClick={() => onPlay(item)}
          className="flip-card-front mask-card flex flex-col justify-between border border-theme-border hover:border-theme-accent card-glow cursor-pointer overflow-hidden bg-theme-card"
        >
          {/* Póster / Thumbnail Aspect Ratio 16:9 o Póster */}
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/80 flex items-center justify-center">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={cleanTitle}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={() => setThumbError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-theme-surface flex flex-col items-center justify-center p-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-theme-card border border-theme-border flex items-center justify-center mb-2">
                  <Film className="w-6 h-6 text-theme-accent" />
                </div>
                <span className="text-xs text-theme-muted font-medium line-clamp-1">{cleanTitle}</span>
              </div>
            )}

            {/* Scrim y Botón Play al hover */}
            <div
              className={`absolute inset-0 bg-black/70 flex items-center justify-center transition-opacity duration-300 ${
                isHovered && !isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="w-13 h-13 rounded-full bg-theme-accent text-white flex items-center justify-center shadow-xl shadow-theme-accent/40 transform scale-90 group-hover:scale-100 transition-all duration-300">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
            </div>

            {/* Badges de calidad y formato */}
            <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1 z-10">
              {ext && (
                <span className="px-2 py-0.5 rounded-md bg-theme-surface text-[10px] font-bold text-slate-200 border border-theme-border uppercase tracking-wide">
                  {ext}
                </span>
              )}
              {badges.filter(b => b === '1080P' || b === '720P' || b === '4K').map(b => (
                <span key={b} className="px-1.5 py-0.5 rounded-md bg-theme-accent text-white text-[10px] font-bold shadow-sm">
                  {b}
                </span>
              ))}
            </div>

            {item.humanSize && (
              <div className="absolute bottom-2.5 left-2.5 z-10">
                <span className="px-2 py-0.5 rounded-md bg-theme-surface text-[10px] font-mono text-slate-300 border border-theme-border">
                  {item.humanSize}
                </span>
              </div>
            )}
          </div>

          {/* Información y Título */}
          <div className="p-4 flex flex-col justify-between flex-1">
            <div>
              <h3
                className="font-bold text-sm text-theme-text group-hover:text-theme-accent transition-colors line-clamp-1 mb-1"
                title={cleanTitle}
              >
                {cleanTitle}
              </h3>
              {synopsis ? (
                <p className="text-xs text-theme-muted line-clamp-2 leading-relaxed">
                  {synopsis}
                </p>
              ) : (
                <p className="text-[11px] text-theme-muted font-mono truncate">
                  {item.path}
                </p>
              )}
            </div>

            {/* Barra inferior: Botón 3D Flip para ver reverso técnico */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-theme-border/60 text-xs text-theme-muted">
              <div className="flex items-center gap-1.5 flex-wrap">
                {badges.filter(b => b === 'DUAL' || b === 'LAT').map(b => (
                  <span key={b} className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {b}
                  </span>
                ))}
              </div>

              {/* Botón 3D Flip técnico */}
              <button
                type="button"
                onClick={toggleFlip}
                aria-label="Giro 3D info técnica"
                title="Girar tarjeta para ver detalles técnicos y códecs"
                className="p-1.5 rounded-lg text-theme-muted hover:text-white hover:bg-white/10 transition-colors focus-ring"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= CARA TRASERA (3D FLIP 180°) ================= */}
        <div className="flip-card-back mask-card flex flex-col justify-between border border-theme-border p-5 bg-theme-surface text-theme-text">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-theme-border/60">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-theme-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-theme-accent">
                  Ficha Técnica
                </span>
              </div>
              <button
                type="button"
                onClick={toggleFlip}
                aria-label="Volver al frente"
                title="Volver a la portada"
                className="p-1.5 rounded-lg hover:bg-white/10 text-theme-muted hover:text-white transition-colors focus-ring"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5 text-xs">
              <div>
                <span className="text-theme-muted block text-[10px] uppercase font-semibold">Título Completo</span>
                <span className="font-medium text-slate-200 line-clamp-2">{cleanTitle}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-theme-muted block text-[10px]">Contenedor</span>
                  <span className="text-theme-accent font-bold">{ext || 'MKV'}</span>
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-theme-muted block text-[10px]">Tamaño</span>
                  <span className="text-slate-200">{item.humanSize || '-'}</span>
                </div>
              </div>

              {badges.length > 0 && (
                <div>
                  <span className="text-theme-muted block text-[10px] uppercase font-semibold mb-1">Insignias detectadas</span>
                  <div className="flex flex-wrap gap-1">
                    {badges.map((b) => (
                      <span key={b} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {meta.source && (
                <div className="text-[10px] text-theme-muted flex items-center gap-1 pt-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Indexado vía {meta.source.toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-theme-border/60">
            <button
              onClick={() => onPlay(item)}
              className="w-full min-h-12 flex items-center justify-center gap-2 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-semibold shadow-md transition-all focus-ring active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Reproducir con VLC Engine</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
