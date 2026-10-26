import React, { useState, useEffect } from 'react';
import { Film, Play, Music2, Cpu, HardDrive, Calendar, Clock, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { fetchMediaInfo, getThumbnailUrl } from '../../services/api';

export default function MediaDetailsModal({ item, isOpen, onClose, onPlay }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (isOpen && item?.path) {
      setLoading(true);
      fetchMediaInfo(item.path)
        .then((data) => {
          if (!cancelled) setInfo(data);
        })
        .catch((err) => {
          console.warn('Error fetching media details:', err);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, item?.path]);

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Información y Metadatos de Medios" maxWidth="max-w-xl">
      <div className="space-y-5">
        {/* Header Preview */}
        <div className="relative rounded-2xl overflow-hidden aspect-video bg-dark-900 border border-slate-800">
          <img
            src={getThumbnailUrl(item.path)}
            alt={item.title || item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/40 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <span className="px-2 py-0.5 rounded bg-brand-500/80 text-[10px] font-bold text-white uppercase tracking-wider mb-1 inline-block">
                {item.extension?.replace('.', '') || 'VIDEO'}
              </span>
              <h4 className="text-white font-bold text-base line-clamp-1">{item.title || item.name}</h4>
              <p className="text-[11px] text-slate-300 font-mono">GoogleDrive/{item.path}</p>
            </div>
            <button
              onClick={() => {
                onClose();
                onPlay(item);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/30 transition-transform active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Reproducir</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-2" />
            <p className="text-xs">Inspeccionando contenedor con ffprobe...</p>
          </div>
        ) : info ? (
          <div className="space-y-4">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-dark-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Duración</span>
                <span className="font-semibold text-white">{info.durationFormatted || 'Desconocida'}</span>
              </div>
              <div className="p-3 rounded-xl bg-dark-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Tamaño</span>
                <span className="font-semibold text-white">{info.humanSize || item.humanSize}</span>
              </div>
              <div className="p-3 rounded-xl bg-dark-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Resolución</span>
                <span className="font-semibold text-brand-400">
                  {info.video ? `${info.video.width}x${info.video.height}` : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-dark-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">FPS</span>
                <span className="font-semibold text-white">{info.video?.fps ? `${info.video.fps} fps` : 'N/A'}</span>
              </div>
            </div>

            {/* Video Codec */}
            {info.video && (
              <div className="p-3 rounded-xl bg-dark-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Film className="w-4 h-4 text-brand-400" />
                  <span className="text-slate-300 font-medium">Códec de Video</span>
                </div>
                <span className="font-mono text-white uppercase bg-slate-800 px-2 py-0.5 rounded">
                  {info.video.codec}
                </span>
              </div>
            )}

            {/* Audio Tracks */}
            <div>
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-indigo-400" />
                Pistas de Audio Detectadas ({info.audioTracks?.length || 0})
              </h5>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {info.audioTracks?.map((track, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-dark-900/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-200">
                        {track.title || `Pista ${idx + 1}`} ({track.language})
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {track.codec?.toUpperCase()} • {track.channelLayout || `${track.channels} canales`} • {track.sampleRate} Hz
                      </p>
                    </div>
                    {track.isDefault && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">No se pudieron cargar detalles adicionales de ffprobe.</p>
        )}
      </div>
    </Modal>
  );
}
