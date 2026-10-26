import React, { useState } from 'react';
import { Play, Film, Info, Sparkles } from 'lucide-react';
import { getThumbnailUrl } from '../../services/api';

export default function MediaCard({ item, onPlay, onDetails }) {
  const [thumbError, setThumbError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const ext = (item.extension || '').replace('.', '').toUpperCase();

  // Genera un gradiente armónico consistente a partir del nombre si la miniatura falla o carga
  const getGradientByName = (name = '') => {
    const charCode = name.charCodeAt(0) || 0;
    if (charCode % 4 === 0) return 'from-indigo-900/80 via-purple-900/50 to-dark-900';
    if (charCode % 4 === 1) return 'from-rose-950/80 via-slate-900/60 to-dark-900';
    if (charCode % 4 === 2) return 'from-cyan-950/80 via-blue-900/50 to-dark-900';
    return 'from-emerald-950/80 via-slate-900/60 to-dark-900';
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-2xl overflow-hidden glass-card transition-all duration-300 hover:scale-[1.03] hover:shadow-glow-red hover:border-brand-500/40 cursor-pointer flex flex-col h-full"
      onClick={() => onPlay(item)}
    >
      {/* Thumbnail Aspect Ratio 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-dark-900 flex items-center justify-center">
        {!thumbError ? (
          <img
            src={getThumbnailUrl(item.path)}
            alt={item.title || item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setThumbError(true)}
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getGradientByName(item.name)} flex flex-col items-center justify-center p-4 text-center`}>
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
              <Film className="w-6 h-6 text-slate-400 group-hover:text-brand-400 transition-colors" />
            </div>
            <span className="text-xs text-slate-400 font-medium line-clamp-1">{item.title || item.name}</span>
          </div>
        )}

        {/* Hover overlay with Play Button */}
        <div className={`absolute inset-0 bg-dark-950/60 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/40 transform scale-90 group-hover:scale-100 transition-all duration-300">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Format & Size Badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {ext && (
            <span className="px-2 py-0.5 rounded-md bg-dark-950/80 backdrop-blur-md text-[10px] font-bold text-slate-200 border border-white/10 uppercase tracking-wide">
              {ext}
            </span>
          )}
        </div>

        {item.humanSize && (
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="px-2 py-0.5 rounded-md bg-dark-950/80 backdrop-blur-md text-[10px] font-medium text-slate-300 border border-white/10">
              {item.humanSize}
            </span>
          </div>
        )}
      </div>

      {/* Info Details */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <h3 className="font-semibold text-sm text-slate-100 group-hover:text-brand-400 transition-colors line-clamp-1 mb-1" title={item.title || item.name}>
            {item.title || item.name}
          </h3>
          <p className="text-[11px] text-slate-400 line-clamp-1">
            {item.path}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-brand-400" />
            HD Streaming
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetails(item);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Ver metadatos y pistas de audio"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
