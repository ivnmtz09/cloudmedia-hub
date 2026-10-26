import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Square, Volume2, Volume1, VolumeX, Maximize, Minimize, X,
  RotateCcw, RotateCw, Music2, Subtitles, Check, Loader2, SkipForward,
  Info, Volume as VolumeIcon
} from 'lucide-react';
import { fetchMediaInfo, getStreamUrl, saveWatchProgress } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function VideoPlayerModal({ item, onClose, onNextEpisode }) {
  const { currentTheme } = useTheme();
  const accentColor = currentTheme?.colors?.accent || '#E50914';
  const surfaceColor = currentTheme?.colors?.surface || '#1a1a1a';
  const cardColor = currentTheme?.colors?.card || '#1f1f1f';
  const borderColor = currentTheme?.colors?.border || '#2d2d2d';
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);

  const hideControlsTimer = useRef(null);
  const osdTimer = useRef(null);
  const lastSavedRef = useRef(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [timeOffset, setTimeOffset] = useState(0); // Para seeking del servidor con ffmpeg -ss
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showRemainingTime, setShowRemainingTime] = useState(false);

  // Volume: 0.0 a 2.0 (0% a 200%)
  const [volume, setVolume] = useState(1.0); // 1.0 = 100%
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1.0);

  // OSD Notification
  const [osdMessage, setOsdMessage] = useState(null);

  // Metadata, Audio & Subtitle Tracks
  const [mediaInfo, setMediaInfo] = useState(null);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(-1); // -1 = desactivado
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  const isMkv = item?.path ? item.path.toLowerCase().endsWith('.mkv') : false;

  // 1. Mostrar OSD temporal
  const triggerOsd = useCallback((title, value = null, type = 'volume') => {
    setOsdMessage({ title, value, type });
    if (osdTimer.current) clearTimeout(osdTimer.current);
    osdTimer.current = setTimeout(() => {
      setOsdMessage(null);
    }, 1800);
  }, []);

  // 2. Inicializar Web Audio API para volumen hasta 200%
  const initWebAudio = useCallback(() => {
    if (!videoRef.current) return;
    if (!audioCtxRef.current) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const gain = ctx.createGain();
          const source = ctx.createMediaElementSource(videoRef.current);
          source.connect(gain);
          gain.connect(ctx.destination);

          gain.gain.value = isMuted ? 0 : volume;
          audioCtxRef.current = ctx;
          gainNodeRef.current = gain;
          sourceNodeRef.current = source;
        }
      } catch (err) {
        console.warn('Web Audio API no pudo inicializarse (posiblemente ya conectado):', err.message);
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, [volume, isMuted]);

  // Actualizar GainNode al cambiar volumen o mute
  useEffect(() => {
    const targetGain = isMuted ? 0 : volume;
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = targetGain;
    }
    if (videoRef.current) {
      videoRef.current.volume = Math.min(targetGain, 1.0);
    }
  }, [volume, isMuted]);

  // 3. Cargar metadatos exactos de ffprobe (fijar duración real)
  useEffect(() => {
    let isCancelled = false;
    if (item?.path) {
      setIsLoadingInfo(true);
      fetchMediaInfo(item.path)
        .then((data) => {
          if (!isCancelled) {
            setMediaInfo(data);
            if (data.duration && data.duration > 0) {
              setTotalDuration(data.duration);
            }
            if (data.audioTracks && data.audioTracks.length > 0) {
              setAudioTracks(data.audioTracks);
              const defaultIdx = data.audioTracks.findIndex((t) => t.isDefault);
              setSelectedTrackIndex(defaultIdx !== -1 ? defaultIdx : 0);
            }
            if (data.subtitleTracks && data.subtitleTracks.length > 0) {
              setSubtitleTracks(data.subtitleTracks);
            }
          }
        })
        .catch((err) => {
          console.warn('Error al obtener metadatos multimedia:', err.message);
        })
        .finally(() => {
          if (!isCancelled) setIsLoadingInfo(false);
        });
    }

    return () => {
      isCancelled = true;
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [item?.path]);

  // 4. Guardar progreso de visualización cada 5s
  useEffect(() => {
    if (!isPlaying || !item?.path) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (v) {
        const computedTime = timeOffset + v.currentTime;
        if (Math.abs(computedTime - lastSavedRef.current) >= 4) {
          lastSavedRef.current = computedTime;
          saveWatchProgress({
            path: item.path,
            currentTime: computedTime,
            duration: totalDuration || v.duration || 0,
            season: item.season,
            episode: item.episode
          }).catch(() => {});
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, item?.path, timeOffset, totalDuration, item?.season, item?.episode]);

  // 5. Manejo del tiempo con compensación de offset
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const effectiveTime = Math.min(timeOffset + video.currentTime, totalDuration || Infinity);
    setCurrentTime(effectiveTime);
  };

  // 6. Seeking preciso con soporte para remux ffmpeg -ss
  const seekTo = (targetSeconds) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedTarget = Math.max(0, Math.min(targetSeconds, totalDuration || targetSeconds));
    initWebAudio();

    if (isMkv) {
      // Para MKV remuxeado: pasamos &start=<segundos> al backend para que ffmpeg aplique -ss antes de -i
      setIsBuffering(true);
      setTimeOffset(clampedTarget);
      setCurrentTime(clampedTarget);

      const wasPlaying = !video.paused;
      const newSrc = getStreamUrl(item.path, selectedTrackIndex, true, clampedTarget);
      video.src = newSrc;
      video.load();

      const onCanPlay = () => {
        setIsBuffering(false);
        if (wasPlaying) {
          video.play().catch(() => {});
        }
        video.removeEventListener('canplay', onCanPlay);
      };
      video.addEventListener('canplay', onCanPlay);
    } else {
      // Para MP4 directo con soporte de Range 206
      video.currentTime = clampedTarget;
      setCurrentTime(clampedTarget);
    }

    triggerOsd(
      'Salto de tiempo',
      formatTime(clampedTarget),
      'seek'
    );
  };

  const seekRelative = (seconds) => {
    seekTo(currentTime + seconds);
  };

  // 7. Control de Volumen VLC (hasta 200%)
  const changeVolume = (delta) => {
    initWebAudio();
    let newVol = Math.round((volume + delta) * 100) / 100;
    newVol = Math.max(0, Math.min(newVol, 2.0)); // 0% a 200%

    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
    triggerOsd('Volumen', Math.round(newVol * 100), 'volume');
  };

  const setVolumeDirect = (val) => {
    initWebAudio();
    const clamped = Math.max(0, Math.min(val, 2.0));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
    triggerOsd('Volumen', Math.round(clamped * 100), 'volume');
  };

  const toggleMute = () => {
    initWebAudio();
    if (isMuted) {
      setIsMuted(false);
      triggerOsd('Volumen', Math.round((previousVolume || 1.0) * 100), 'volume');
    } else {
      setPreviousVolume(volume);
      setIsMuted(true);
      triggerOsd('Silencio', 0, 'volume');
    }
  };

  // 8. Rueda del ratón para volumen hasta 200%
  const handleWheel = (e) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.05 : -0.05;
    changeVolume(step);
  };

  // 9. Atajos de teclado estilo VLC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;
        const focusableSelectors = [
          'button:not([disabled])',
          'input:not([disabled])',
          '[tabindex]:not([tabindex="-1"])'
        ].join(',');
        const focusableElements = Array.from(container.querySelectorAll(focusableSelectors));
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !container.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !container.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.code === 'Space' || e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        seekRelative(10);
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        seekRelative(-10);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        changeVolume(0.05);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        changeVolume(-0.05);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setShowAudioMenu((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, volume, isMuted, isFullscreen, isPlaying, totalDuration]);

  // 10. Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowAudioMenu(false);
        setShowSubtitleMenu(false);
      }
    }, 3200);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    initWebAudio();

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        triggerOsd('Reproducir', null, 'play');
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      triggerOsd('Pausa', null, 'pause');
    }
  };

  const handleStop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    seekTo(0);
    triggerOsd('Detenido', null, 'stop');
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Formato de tiempo VLC: HH:MM:SS o MM:SS
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const totalSec = Math.floor(seconds);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Color del indicador de volumen VLC adaptado al tema actual (0-100%, 100-150%, 150-200%)
  const volumePercentage = Math.round((isMuted ? 0 : volume) * 100);
  let volumeHex = accentColor;
  if (volumePercentage > 150) {
    volumeHex = '#ef4444'; // Rojo boost extremo
  } else if (volumePercentage > 100) {
    volumeHex = '#f59e0b'; // Ámbar sobreamplificación
  }

  // Selección de pista de audio
  const handleSelectAudioTrack = (idx) => {
    setSelectedTrackIndex(idx);
    setShowAudioMenu(false);
    const track = audioTracks[idx];
    triggerOsd(`Audio: ${track?.title || `Pista ${idx + 1}`}`, null, 'audio');
    seekTo(currentTime);
  };

  // Stream URL inicial
  const streamSrc = getStreamUrl(item.path, selectedTrackIndex, isMkv, timeOffset);

  // Remaining time vs Total time
  const remainingSeconds = Math.max(0, (totalDuration || 0) - currentTime);

  // Lock body scroll and set focus on player container
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    containerRef.current?.focus();
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      {/* Dimmed & Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-all duration-300 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Reproductor VLC: ${item.title || item.name}`}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        className="relative z-10 w-full h-full max-w-7xl max-h-screen flex flex-col justify-between bg-black select-none overflow-hidden animate-dolly-zoom border border-theme-border shadow-2xl outline-none focus:ring-1 focus:ring-theme-accent/50"
      >
        {/* ================= BARRA SUPERIOR VLC ================= */}
        <div
          className={`absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 flex items-center justify-between ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Título y badge VLC */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2029] border border-[#323642] text-[11px] font-mono text-slate-300 shadow-sm">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: accentColor }}
              />
              <span>VLC Engine</span>
              {isMkv && <span className="font-bold ml-1" style={{ color: accentColor }}>MKV Remux</span>}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide truncate max-w-md md:max-w-xl">
                {item.title || item.name}
              </h2>
              {mediaInfo && (
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{mediaInfo.video?.width}x{mediaInfo.video?.height}</span>
                  <span>•</span>
                  <span>{mediaInfo.video?.codec?.toUpperCase()}</span>
                  <span>•</span>
                  <span>{mediaInfo.humanSize}</span>
                </div>
              )}
            </div>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            aria-label="Cerrar reproductor"
            className="min-h-12 min-w-12 flex items-center justify-center rounded-xl bg-black/70 hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= OSD SUPERIOR DERECHO (ESTILO VLC) ================= */}
        {osdMessage && (
          <div className="absolute top-20 right-6 z-40 animate-fade-in pointer-events-none">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#141414] border border-[#353847] shadow-2xl">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: volumeHex + '25', color: volumeHex }}
              >
                {osdMessage.type === 'play' ? (
                  <Play className="w-4 h-4 fill-current" />
                ) : osdMessage.type === 'pause' ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : osdMessage.type === 'stop' ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : osdMessage.type === 'audio' ? (
                  <Music2 className="w-4 h-4" />
                ) : osdMessage.type === 'subtitle' ? (
                  <Subtitles className="w-4 h-4" />
                ) : osdMessage.type === 'volume' ? (
                  <VolumeIcon className="w-4 h-4" />
                ) : osdMessage.type === 'seek' ? (
                  <RotateCw className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  {osdMessage.title}
                </div>
                {osdMessage.value !== null && (
                  <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                    <span>
                      {osdMessage.type === 'volume' ? `${osdMessage.value}%` : osdMessage.value}
                    </span>
                    {/* Barra mini OSD */}
                    {osdMessage.type === 'volume' && (
                      <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-150"
                          style={{
                            width: `${Math.min(100, (osdMessage.value / 200) * 100)}%`,
                            backgroundColor: volumeHex
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= ÁREA DE VIDEO ================= */}
        <div
          onClick={togglePlay}
          className="relative flex-1 flex items-center justify-center cursor-pointer bg-black"
        >
          <video
            ref={videoRef}
            src={streamSrc}
            onTimeUpdate={handleTimeUpdate}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              setIsPlaying(true);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (onNextEpisode) onNextEpisode();
            }}
            className="w-full h-full max-h-screen object-contain"
            playsInline
          />

          {/* Spinner de buffering limpio y elegante con el color de acento del tema activo */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none z-20">
              <div
                className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
                style={{
                  borderColor: `${accentColor}30`,
                  borderTopColor: accentColor
                }}
              />
            </div>
          )}
        </div>

        {/* ================= BARRA INFERIOR DE CONTROLES VLC ================= */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 border-t transition-opacity duration-300 p-3 sm:p-4 text-slate-200 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ backgroundColor: surfaceColor, borderColor }}
        >
          {/* BARRA DE PROGRESO CON TIME SCRUBBING */}
          <div className="space-y-1 mb-2">
            <div className="relative group/progress flex items-center">
              <input
                type="range"
                min="0"
                max={totalDuration || 100}
                step="0.5"
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer hover:h-2.5 transition-all"
                style={{
                  accentColor: accentColor,
                  background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${
                    totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0
                  }%, #2d313d ${
                    totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0
                  }%, #2d313d 100%)`
                }}
              />
            </div>

            {/* Display de tiempos estilo VLC (Click para alternar restante) */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1">
                <span className="text-white font-semibold">{formatTime(currentTime)}</span>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => setShowRemainingTime(!showRemainingTime)}
                  title="Clic para alternar entre tiempo total y tiempo restante"
                  className="hover:text-white transition-colors focus-ring rounded px-1"
                >
                  {showRemainingTime ? `-${formatTime(remainingSeconds)}` : formatTime(totalDuration)}
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                {audioTracks[selectedTrackIndex] && (
                  <span>
                    Audio: {audioTracks[selectedTrackIndex].language?.toUpperCase()} ({audioTracks[selectedTrackIndex].codec?.toUpperCase()})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* BOTONERA PRINCIPAL DE CONTROLES */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* LADO IZQUIERDO: Transport Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                className="min-h-12 min-w-12 flex items-center justify-center rounded-xl text-white shadow-md transition-transform active:scale-95 focus-ring"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 4px 14px ${accentColor}40`
                }}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              {/* Stop (VLC classic) */}
              <button
                onClick={handleStop}
                aria-label="Detener"
                title="Detener reproducción (detiene y vuelve a 0)"
                className="min-h-12 min-w-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus-ring"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>

              {/* Seek Backward 10s */}
              <button
                onClick={() => seekRelative(-10)}
                aria-label="Retroceder 10 segundos"
                title="Retroceder 10s (Flecha Izq o J)"
                className="min-h-12 min-w-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus-ring"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Seek Forward 10s */}
              <button
                onClick={() => seekRelative(10)}
                aria-label="Adelantar 10 segundos"
                title="Adelantar 10s (Flecha Der o L)"
                className="min-h-12 min-w-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus-ring"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Next Episode (si aplica) */}
              {onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  aria-label="Siguiente episodio"
                  title="Reproducir siguiente episodio"
                  className="min-h-12 px-3 flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus-ring text-xs font-semibold"
                >
                  <SkipForward className="w-4 h-4" style={{ color: accentColor }} />
                  <span className="hidden md:inline">Siguiente</span>
                </button>
              )}
            </div>

            {/* CENTRO: CONTROL DE VOLUMEN VLC HASTA 200% */}
            <div
              className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-xl border"
              style={{ backgroundColor: cardColor, borderColor }}
            >
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                className="min-h-10 min-w-10 flex items-center justify-center text-slate-300 hover:text-white transition-colors focus-ring rounded-lg"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" style={{ color: volumeHex }} />
                )}
              </button>

              {/* Indicador Triangular de Volumen VLC */}
              <div
                title="Volumen VLC hasta 200% (Usa rueda del ratón o haz clic)"
                className="flex items-end gap-[3px] h-6 cursor-pointer py-1 px-1"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  setVolumeDirect(ratio * 2.0); // mapeado a 200%
                }}
              >
                {[...Array(12)].map((_, i) => {
                  // Cada barra representa ~16.6% del volumen (hasta 200%)
                  const barThreshold = ((i + 1) / 12) * 2.0;
                  const isActive = (isMuted ? 0 : volume) >= barThreshold - 0.08;
                  const barHeightPct = 25 + (i / 11) * 75; // Altura triangular del 25% al 100%

                  let barStyle = { backgroundColor: '#334155' };
                  if (isActive) {
                    if (barThreshold > 1.5) {
                      barStyle = { backgroundColor: '#ef4444' };
                    } else if (barThreshold > 1.0) {
                      barStyle = { backgroundColor: '#f59e0b' };
                    } else {
                      barStyle = { backgroundColor: accentColor };
                    }
                  }

                  return (
                    <div
                      key={i}
                      className="w-[4px] sm:w-[5px] rounded-t-sm transition-all duration-100"
                      style={{ height: `${barHeightPct}%`, ...barStyle }}
                    />
                  );
                })}
              </div>

              {/* Porcentaje numérico de volumen (0% a 200%) */}
              <span
                className="font-mono text-xs font-bold min-w-[42px] text-right transition-colors"
                style={{ color: volumeHex }}
              >
                {volumePercentage}%
              </span>
            </div>

            {/* LADO DERECHO: Pistas de Audio, Subtítulos y Fullscreen */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Selector de Pistas de Audio */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubtitleMenu(false);
                  }}
                  aria-label="Pistas de audio"
                  title="Seleccionar pista de audio (S)"
                  className="min-h-12 min-w-12 flex items-center justify-center rounded-xl border transition-colors focus-ring"
                  style={
                    showAudioMenu
                      ? { backgroundColor: `${accentColor}25`, borderColor: `${accentColor}50`, color: accentColor }
                      : { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1' }
                  }
                >
                  <Music2 className="w-4 h-4" />
                </button>

                {showAudioMenu && (
                  <div
                    className="absolute bottom-14 right-0 w-60 rounded-xl border shadow-2xl p-2 z-50 text-xs animate-scale-in"
                    style={{ backgroundColor: cardColor, borderColor }}
                  >
                    <div
                      className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b mb-1"
                      style={{ borderColor }}
                    >
                      Pistas de Audio VLC
                    </div>
                    {audioTracks.length > 0 ? (
                      audioTracks.map((track) => (
                        <button
                          key={track.index}
                          onClick={() => handleSelectAudioTrack(track.index)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors"
                          style={
                            selectedTrackIndex === track.index
                              ? { backgroundColor: `${accentColor}25`, color: accentColor, fontWeight: '600' }
                              : { color: '#cbd5e1' }
                          }
                        >
                          <div>
                            <div>{track.title || `Pista ${track.index + 1}`}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {track.language?.toUpperCase()} • {track.codec?.toUpperCase()}
                            </div>
                          </div>
                          {selectedTrackIndex === track.index && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-slate-400 text-[11px]">
                        Pista estéreo predeterminada
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selector de Subtítulos */}
              {subtitleTracks.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSubtitleMenu(!showSubtitleMenu);
                      setShowAudioMenu(false);
                    }}
                    aria-label="Subtítulos"
                    title="Seleccionar subtítulo"
                    className="min-h-12 min-w-12 flex items-center justify-center rounded-xl border transition-colors focus-ring"
                    style={
                      showSubtitleMenu
                        ? { backgroundColor: `${accentColor}25`, borderColor: `${accentColor}50`, color: accentColor }
                        : { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1' }
                    }
                  >
                    <Subtitles className="w-4 h-4" />
                  </button>

                  {showSubtitleMenu && (
                    <div
                      className="absolute bottom-14 right-0 w-56 rounded-xl border shadow-2xl p-2 z-50 text-xs animate-scale-in"
                      style={{ backgroundColor: cardColor, borderColor }}
                    >
                      <div
                        className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b mb-1"
                        style={{ borderColor }}
                      >
                        Subtítulos
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSubtitleIndex(-1);
                          setShowSubtitleMenu(false);
                          triggerOsd('Subtítulos desactivados', null, 'subtitle');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors"
                        style={
                          selectedSubtitleIndex === -1
                            ? { backgroundColor: `${accentColor}25`, color: accentColor, fontWeight: '600' }
                            : { color: '#cbd5e1' }
                        }
                      >
                        <span>Desactivados</span>
                        {selectedSubtitleIndex === -1 && <Check className="w-3.5 h-3.5" />}
                      </button>

                      {subtitleTracks.map((sub) => (
                        <button
                          key={sub.index}
                          onClick={() => {
                            setSelectedSubtitleIndex(sub.index);
                            setShowSubtitleMenu(false);
                            triggerOsd(`Subtítulo: ${sub.title || sub.language}`, null, 'subtitle');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors"
                          style={
                            selectedSubtitleIndex === sub.index
                              ? { backgroundColor: `${accentColor}25`, color: accentColor, fontWeight: '600' }
                              : { color: '#cbd5e1' }
                          }
                        >
                          <div>
                            <div>{sub.title || `Subtítulo ${sub.index + 1}`}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {sub.language?.toUpperCase()}
                            </div>
                          </div>
                          {selectedSubtitleIndex === sub.index && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                title="Pantalla completa (F)"
                className="min-h-12 min-w-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus-ring"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
