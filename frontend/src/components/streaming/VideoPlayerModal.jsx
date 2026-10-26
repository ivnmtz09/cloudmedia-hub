import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Pause, Square, Volume2, Volume1, VolumeX, Maximize, Minimize, X,
  RotateCcw, RotateCw, Music2, Subtitles, Check, Loader2, SkipForward,
  Info, Volume as VolumeIcon, Minimize2, Maximize2
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
  const lastTapRef = useRef(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [timeOffset, setTimeOffset] = useState(0); // Para seeking con ffmpeg -ss
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false); // Modo miniatura / ventana flotante
  const [showControls, setShowControls] = useState(true);
  const [showRemainingTime, setShowRemainingTime] = useState(false);

  // Volume: 0.0 a 2.0 (0% a 200%)
  const [volume, setVolume] = useState(1.0); // 1.0 = 100%
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1.0);
  const [showMobileVolumeSlider, setShowMobileVolumeSlider] = useState(false);

  // OSD Notification
  const [osdMessage, setOsdMessage] = useState(null);

  // Metadata, Audio & Subtitle Tracks
  const [mediaInfo, setMediaInfo] = useState(null);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(-1);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  const isMkv = item?.path ? item.path.toLowerCase().endsWith('.mkv') : false;

  // 1. Mostrar OSD temporal estilo VLC
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
        console.warn('Web Audio API no pudo inicializarse:', err.message);
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

  // 3. Sincronizar estado de Pantalla Completa nativo del navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFs);
      if (isFs) {
        setIsMiniMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // 4. Cargar metadatos exactos de ffprobe (duración y pistas)
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

  // 5. Guardar progreso de visualización cada 5s
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

  // 6. Manejo del tiempo con compensación de offset
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const effectiveTime = Math.min(timeOffset + video.currentTime, totalDuration || Infinity);
    setCurrentTime(effectiveTime);
  };

  // 7. Seeking preciso
  const seekTo = (targetSeconds) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedTarget = Math.max(0, Math.min(targetSeconds, totalDuration || targetSeconds));
    initWebAudio();

    if (isMkv) {
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

  // 8. Control de Volumen VLC (hasta 200%)
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

  // 9. Rueda del ratón para volumen
  const handleWheel = (e) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.05 : -0.05;
    changeVolume(step);
  };

  // 10. Alternar Pantalla Completa Real que cubre 100% de la pantalla
  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const isCurrentlyFs = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    try {
      if (!isCurrentlyFs) {
        setIsMiniMode(false);
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          await container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          await container.msRequestFullscreen();
        } else if (video && video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        }
        setIsFullscreen(true);
        triggerOsd('Pantalla Completa', null, 'maximize');
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
        triggerOsd('Vista Ventana', null, 'minimize');
      }
    } catch (err) {
      console.warn('Error alternando fullscreen nativo, aplicando fullscreen de ventana:', err);
      setIsFullscreen(!isCurrentlyFs);
    }
  };

  // 11. Alternar Modo Miniatura Flotante
  const toggleMiniMode = () => {
    if (isFullscreen) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
    setIsMiniMode((prev) => !prev);
    triggerOsd(!isMiniMode ? 'Modo Miniatura' : 'Vista Ventana', null, 'minimize');
  };

  // 12. Atajos de teclado VLC
  useEffect(() => {
    const handleKeyDown = (e) => {
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
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowSubtitleMenu((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setIsFullscreen(false);
        } else if (isMiniMode) {
          setIsMiniMode(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, volume, isMuted, isFullscreen, isMiniMode, isPlaying, totalDuration]);

  // 13. Auto-hide controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowAudioMenu(false);
        setShowSubtitleMenu(false);
        setShowMobileVolumeSlider(false);
      }
    }, 3500);
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

  // Doble toque en móvil: izquierda retrocede, derecha adelanta
  const handleVideoTouch = (e) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX) || 0;
    const isDoubleTap = now - lastTapRef.current < 300;

    if (isDoubleTap) {
      const clickRatio = (touchX - rect.left) / rect.width;
      if (clickRatio < 0.4) {
        seekRelative(-10);
      } else if (clickRatio > 0.6) {
        seekRelative(10);
      } else {
        togglePlay();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      handleUserActivity();
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

  // Color de volumen VLC adaptado al tema actual
  const volumePercentage = Math.round((isMuted ? 0 : volume) * 100);
  let volumeHex = accentColor;
  if (volumePercentage > 150) {
    volumeHex = '#ef4444'; // Rojo sobreamplificación extrema
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

  const streamSrc = getStreamUrl(item.path, selectedTrackIndex, isMkv, timeOffset);
  const remainingSeconds = Math.max(0, (totalDuration || 0) - currentTime);

  // Bloquear scroll de la página cuando no está en mini mode
  useEffect(() => {
    if (!isMiniMode) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      containerRef.current?.focus();
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isMiniMode]);

  // ================= RENDERIZADO CON PORTAL =================
  return createPortal(
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center transition-all ${
        isMiniMode ? 'pointer-events-none' : ''
      } ${isFullscreen ? 'p-0' : 'p-0 sm:p-3 md:p-6'}`}
    >
      {/* Backdrop oscuro con desenfoque (oculto en modo miniatura) */}
      {!isMiniMode && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-all duration-300 animate-fade-in"
          onClick={isFullscreen ? undefined : onClose}
          aria-hidden="true"
        />
      )}

      {/* Contenedor del Reproductor */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal={!isMiniMode}
        aria-label={`Reproductor VLC: ${item.title || item.name}`}
        tabIndex={0}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
        onWheel={handleWheel}
        className={`relative z-10 flex flex-col justify-between bg-black select-none overflow-hidden outline-none transition-all duration-200 pointer-events-auto ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-none'
            : isMiniMode
            ? 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-80 sm:w-96 aspect-video rounded-2xl border-2 shadow-2xl z-[99999] animate-scale-in'
            : 'w-full h-full sm:h-auto sm:max-w-4xl lg:max-w-5xl sm:aspect-video sm:max-h-[84vh] rounded-none sm:rounded-3xl border sm:border-theme-border shadow-2xl animate-dolly-zoom'
        }`}
        style={isMiniMode ? { borderColor: accentColor } : undefined}
      >
        {/* ================= BARRA SUPERIOR VLC ================= */}
        {!isMiniMode && (
          <div
            className={`absolute top-0 left-0 right-0 z-30 px-3 sm:px-4 py-3 bg-gradient-to-b from-black/95 via-black/60 to-transparent transition-opacity duration-300 flex items-center justify-between pt-[max(0.75rem,env(safe-area-inset-top))] ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Título y badge VLC */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-[#1e2029] border border-[#323642] text-[10px] sm:text-[11px] font-mono text-slate-300 shrink-0">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: accentColor }}
                />
                <span>VLC Engine</span>
                {isMkv && <span className="font-bold ml-1" style={{ color: accentColor }}>MKV Remux</span>}
              </div>

              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-semibold text-white tracking-wide truncate max-w-[45vw] sm:max-w-md md:max-w-xl">
                  {item.title || item.name}
                </h2>
                {mediaInfo && (
                  <div className="hidden sm:flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono">
                    <span>{mediaInfo.video?.width}x{mediaInfo.video?.height}</span>
                    <span>•</span>
                    <span>{mediaInfo.video?.codec?.toUpperCase()}</span>
                    <span>•</span>
                    <span>{mediaInfo.humanSize}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botones de Cabecera: Miniatura & Cerrar */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Botón Modo Miniatura / Preview */}
              <button
                type="button"
                onClick={toggleMiniMode}
                aria-label="Ver en miniatura"
                title="Modo miniatura flotante"
                className="min-h-10 min-w-10 flex items-center justify-center rounded-xl bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              {/* Botón Pantalla Completa */}
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                title="Pantalla completa (F)"
                className="min-h-10 min-w-10 flex items-center justify-center rounded-xl bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              {/* Botón cerrar */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar reproductor"
                className="min-h-10 min-w-10 flex items-center justify-center rounded-xl bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus-ring"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= OVERLAY MINIATURA (SI isMiniMode ESTÁ ACTIVO) ================= */}
        {isMiniMode && (
          <div className="absolute inset-0 z-30 bg-black/40 hover:bg-black/60 transition-colors flex flex-col justify-between p-2 group">
            <div className="flex items-center justify-between text-white">
              <span className="text-[11px] font-medium truncate max-w-[180px] drop-shadow">
                {item.title || item.name}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleMiniMode}
                  title="Restaurar a ventana normal"
                  className="p-1 rounded-lg bg-black/70 hover:bg-white/20 text-white transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar reproductor"
                  className="p-1 rounded-lg bg-black/70 hover:bg-red-600 text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2.5 rounded-full text-white shadow-xl transform scale-90 group-hover:scale-100 transition-all"
                style={{ backgroundColor: accentColor }}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
            </div>

            <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
                  backgroundColor: accentColor
                }}
              />
            </div>
          </div>
        )}

        {/* ================= OSD SUPERIOR DERECHO (ESTILO VLC) ================= */}
        {osdMessage && !isMiniMode && (
          <div className="absolute top-16 right-4 sm:top-20 sm:right-6 z-40 animate-fade-in pointer-events-none">
            <div className="flex items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#141414]/95 border border-[#353847] shadow-2xl backdrop-blur-md">
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
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
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  {osdMessage.title}
                </div>
                {osdMessage.value !== null && (
                  <div className="text-xs sm:text-sm font-mono font-bold text-white flex items-center gap-2">
                    <span>
                      {osdMessage.type === 'volume' ? `${osdMessage.value}%` : osdMessage.value}
                    </span>
                    {osdMessage.type === 'volume' && (
                      <div className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
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

        {/* ================= ÁREA DE VIDEO & CONTROLES CENTRALES ================= */}
        <div
          onClick={handleVideoTouch}
          onDoubleClick={toggleFullscreen}
          className="relative flex-1 flex items-center justify-center cursor-pointer bg-black overflow-hidden"
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
            className="w-full h-full object-contain max-h-screen"
            playsInline
            webkit-playsinline="true"
          />

          {/* Spinner de buffering con el color de acento del tema activo */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none z-20">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-t-transparent animate-spin"
                style={{
                  borderColor: `${accentColor}30`,
                  borderTopColor: accentColor
                }}
              />
            </div>
          )}

          {/* CONTROLES CENTRALES TÁCTILES GRANDES (Móvil y Tablet) */}
          {!isMiniMode && showControls && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center gap-6 sm:gap-10 pointer-events-auto transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Retroceder 10s */}
              <button
                type="button"
                onClick={() => seekRelative(-10)}
                aria-label="Retroceder 10 segundos"
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-90 border border-white/10"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Botón Central Play / Pause Grande */}
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full text-white flex items-center justify-center shadow-2xl transition-transform active:scale-90"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 25px ${accentColor}80`
                }}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
                ) : (
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                )}
              </button>

              {/* Adelantar 10s */}
              <button
                type="button"
                onClick={() => seekRelative(10)}
                aria-label="Adelantar 10 segundos"
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-90 border border-white/10"
              >
                <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          )}
        </div>

        {/* ================= BARRA INFERIOR DE CONTROLES VLC ================= */}
        {!isMiniMode && (
          <div
            className={`relative z-30 border-t transition-opacity duration-300 p-2.5 sm:p-4 text-slate-200 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ backgroundColor: surfaceColor, borderColor }}
          >
            {/* 1. BARRA DE PROGRESO CON TIME SCRUBBING */}
            <div className="space-y-1 mb-2">
              <div className="relative group/progress flex items-center">
                <input
                  type="range"
                  min="0"
                  max={totalDuration || 100}
                  step="0.5"
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="w-full h-2 sm:h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer hover:h-2.5 transition-all"
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

              {/* Display de tiempos estilo VLC */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-semibold">{formatTime(currentTime)}</span>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => setShowRemainingTime(!showRemainingTime)}
                    title="Alternar entre tiempo total y tiempo restante"
                    className="hover:text-white transition-colors rounded px-1"
                  >
                    {showRemainingTime ? `-${formatTime(remainingSeconds)}` : formatTime(totalDuration)}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {audioTracks[selectedTrackIndex] && (
                    <span className="truncate max-w-[140px] sm:max-w-none">
                      Audio: {audioTracks[selectedTrackIndex].language?.toUpperCase() || 'Pista 1'} ({audioTracks[selectedTrackIndex].codec?.toUpperCase() || 'AAC'})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. BOTONERA DE CONTROLES RESPONSIVA */}
            <div className="flex items-center justify-between gap-1 sm:gap-3 pt-1">
              {/* LADO IZQUIERDO: Transport Controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                  className="min-h-10 min-w-10 sm:min-h-11 sm:min-w-11 flex items-center justify-center rounded-xl text-white shadow-md transition-transform active:scale-95 focus-ring"
                  style={{
                    backgroundColor: accentColor,
                    boxShadow: `0 2px 10px ${accentColor}40`
                  }}
                >
                  {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />}
                </button>

                {/* Stop */}
                <button
                  type="button"
                  onClick={handleStop}
                  aria-label="Detener"
                  title="Detener reproducción"
                  className="min-h-10 min-w-10 sm:min-h-11 sm:min-w-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                >
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                </button>

                {/* Retroceder / Adelantar 10s (visibles en tablets y PC) */}
                <button
                  type="button"
                  onClick={() => seekRelative(-10)}
                  aria-label="Retroceder 10 segundos"
                  className="hidden md:flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => seekRelative(10)}
                  aria-label="Adelantar 10 segundos"
                  className="hidden md:flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Siguiente episodio */}
                {onNextEpisode && (
                  <button
                    type="button"
                    onClick={onNextEpisode}
                    aria-label="Siguiente episodio"
                    title="Reproducir siguiente episodio"
                    className="min-h-10 px-2.5 sm:min-h-11 sm:px-3 flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-semibold"
                  >
                    <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: accentColor }} />
                    <span className="hidden sm:inline">Siguiente</span>
                  </button>
                )}
              </div>

              {/* CENTRO: CONTROL DE VOLUMEN VLC HASTA 200% */}
              <div
                className="hidden sm:flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-xl border"
                style={{ backgroundColor: cardColor, borderColor }}
              >
                {/* Mute Button */}
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                  className="min-h-8 min-w-8 flex items-center justify-center text-slate-300 hover:text-white transition-colors rounded-lg"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" style={{ color: volumeHex }} />
                  )}
                </button>

                {/* Indicador Triangular de Volumen VLC */}
                <div
                  title="Volumen VLC hasta 200% (Clic o rueda del ratón)"
                  className="flex items-end gap-[3px] h-6 cursor-pointer py-1 px-1"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                    setVolumeDirect(ratio * 2.0);
                  }}
                >
                  {[...Array(12)].map((_, i) => {
                    const barThreshold = ((i + 1) / 12) * 2.0;
                    const isActive = (isMuted ? 0 : volume) >= barThreshold - 0.08;
                    const barHeightPct = 25 + (i / 11) * 75;

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

                {/* Porcentaje numérico */}
                <span
                  className="font-mono text-xs font-bold min-w-[42px] text-right transition-colors"
                  style={{ color: volumeHex }}
                >
                  {volumePercentage}%
                </span>
              </div>

              {/* Botón de Volumen Compacto para Móviles (< 640px) */}
              <div className="relative sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowMobileVolumeSlider((prev) => !prev)}
                  aria-label={isMuted ? 'Activar sonido' : 'Ajustar volumen'}
                  className="min-h-10 min-w-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:text-white"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" style={{ color: volumeHex }} />
                  )}
                </button>

                {showMobileVolumeSlider && (
                  <div
                    className="absolute bottom-12 left-0 p-3 rounded-xl border shadow-2xl flex items-center gap-3 z-50 w-48 animate-scale-in"
                    style={{ backgroundColor: cardColor, borderColor }}
                  >
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-1 rounded text-slate-300"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolumeDirect(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none bg-slate-800"
                      style={{ accentColor }}
                    />
                    <span className="font-mono text-[10px] font-bold text-white shrink-0">
                      {volumePercentage}%
                    </span>
                  </div>
                )}
              </div>

              {/* LADO DERECHO: Pistas de Audio, Subtítulos y Pantalla Completa */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Selector de Pistas de Audio */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAudioMenu(!showAudioMenu);
                      setShowSubtitleMenu(false);
                      setShowMobileVolumeSlider(false);
                    }}
                    aria-label="Pistas de audio"
                    title="Pistas de audio (S)"
                    className="min-h-10 min-w-10 sm:min-h-11 sm:min-w-11 flex items-center justify-center rounded-xl border transition-colors focus-ring"
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
                      className="absolute bottom-full mb-2 right-0 w-60 sm:w-64 max-w-[85vw] max-h-56 overflow-y-auto rounded-2xl border shadow-2xl p-2 z-50 text-xs animate-scale-in"
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
                            type="button"
                            onClick={() => handleSelectAudioTrack(track.index)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors"
                            style={
                              selectedTrackIndex === track.index
                                ? { backgroundColor: `${accentColor}25`, color: accentColor, fontWeight: '600' }
                                : { color: '#cbd5e1' }
                            }
                          >
                            <div className="min-w-0 pr-2">
                              <div className="truncate">{track.title || `Pista ${track.index + 1}`}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {track.language?.toUpperCase() || 'UND'} • {track.codec?.toUpperCase() || 'STEREO'}
                              </div>
                            </div>
                            {selectedTrackIndex === track.index && <Check className="w-3.5 h-3.5 shrink-0" />}
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
                      type="button"
                      onClick={() => {
                        setShowSubtitleMenu(!showSubtitleMenu);
                        setShowAudioMenu(false);
                        setShowMobileVolumeSlider(false);
                      }}
                      aria-label="Subtítulos"
                      title="Subtítulos (C)"
                      className="min-h-10 min-w-10 sm:min-h-11 sm:min-w-11 flex items-center justify-center rounded-xl border transition-colors focus-ring"
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
                        className="absolute bottom-full mb-2 right-0 w-56 sm:w-60 max-w-[85vw] max-h-56 overflow-y-auto rounded-2xl border shadow-2xl p-2 z-50 text-xs animate-scale-in"
                        style={{ backgroundColor: cardColor, borderColor }}
                      >
                        <div
                          className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b mb-1"
                          style={{ borderColor }}
                        >
                          Subtítulos
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubtitleIndex(-1);
                            setShowSubtitleMenu(false);
                            triggerOsd('Subtítulos desactivados', null, 'subtitle');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors"
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
                            type="button"
                            onClick={() => {
                              setSelectedSubtitleIndex(sub.index);
                              setShowSubtitleMenu(false);
                              triggerOsd(`Subtítulo: ${sub.title || sub.language}`, null, 'subtitle');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors"
                            style={
                              selectedSubtitleIndex === sub.index
                                ? { backgroundColor: `${accentColor}25`, color: accentColor, fontWeight: '600' }
                                : { color: '#cbd5e1' }
                            }
                          >
                            <div className="min-w-0 pr-2">
                              <div className="truncate">{sub.title || `Subtítulo ${sub.index + 1}`}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {sub.language?.toUpperCase() || 'UND'}
                              </div>
                            </div>
                            {selectedSubtitleIndex === sub.index && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Botón Pantalla Completa (F) que cubre 100% de la pantalla */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  title="Pantalla completa (F)"
                  className="min-h-10 min-w-10 sm:min-h-11 sm:min-w-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus-ring"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
