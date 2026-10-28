import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Pause, Square, Volume2, VolumeX, Maximize, Minimize, X,
  RotateCcw, RotateCw, Music2, Subtitles, Check, SkipForward,
  Info, Volume as VolumeIcon, Minimize2, Maximize2
} from 'lucide-react';
import { fetchMediaInfo, getStreamUrl, getSubtitleUrl, saveWatchProgress } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function VideoPlayerModal({ item, onClose, onNextEpisode, nextEpisode }) {
  const { currentTheme } = useTheme();
  const accentColor = currentTheme?.colors?.accent || '#E50914';
  const surfaceColor = currentTheme?.colors?.surface || '#141414';
  const cardColor = currentTheme?.colors?.card || '#1f1f1f';
  const borderColor = currentTheme?.colors?.border || '#2d2d2d';

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);

  const idleTimerRef = useRef(null);
  const osdTimerRef = useRef(null);
  const lastSavedBackendRef = useRef(0);
  const lastLocalSavedTimeRef = useRef(0);
  const hasRestoredProgressRef = useRef(false);
  const lastTapRef = useRef(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [timeOffset, setTimeOffset] = useState(0); // Para seeking con ffmpeg -ss
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [isIdle, setIsIdle] = useState(false); // Inactividad del usuario
  const [showRemainingTime, setShowRemainingTime] = useState(false);

  // Binge-Watching: Autoplay Siguiente Episodio estilo Netflix
  const NEXT_EPISODE_COUNTDOWN_DURATION = 10;
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(NEXT_EPISODE_COUNTDOWN_DURATION);
  const [nextThumbError, setNextThumbError] = useState(false);

  const dismissedNextEpisodeRef = useRef(false);
  const hasTriggeredNextEpisodeRef = useRef(false);
  const nextEpisodeTimerRef = useRef(null);
  const onNextEpisodeRef = useRef(onNextEpisode);

  // Sincronizar referencia actualizada de onNextEpisode
  useEffect(() => {
    onNextEpisodeRef.current = onNextEpisode;
  }, [onNextEpisode]);

  // Reiniciar estado de cuenta regresiva cuando cambie de episodio o video
  useEffect(() => {
    dismissedNextEpisodeRef.current = false;
    hasTriggeredNextEpisodeRef.current = false;
    setShowNextOverlay(false);
    setCountdownSeconds(NEXT_EPISODE_COUNTDOWN_DURATION);
    setNextThumbError(false);
    if (nextEpisodeTimerRef.current) {
      clearInterval(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
    }
  }, [item?.path]);

  // Reiniciar error de miniatura si cambia el posterUrl del siguiente episodio
  useEffect(() => {
    setNextThumbError(false);
  }, [nextEpisode?.posterUrl]);

  // Disparar overlay de cuenta regresiva
  const triggerNextEpisodeOverlay = useCallback(() => {
    if (!onNextEpisodeRef.current) return;
    if (dismissedNextEpisodeRef.current || hasTriggeredNextEpisodeRef.current) return;
    hasTriggeredNextEpisodeRef.current = true;
    setCountdownSeconds(NEXT_EPISODE_COUNTDOWN_DURATION);
    setShowNextOverlay(true);
  }, []);

  // Botón primario: Reproducir Ahora (ejecuta inmediatamente y cancela temporizador)
  const handlePlayNextEpisodeNow = useCallback(() => {
    if (nextEpisodeTimerRef.current) {
      clearInterval(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
    }
    setShowNextOverlay(false);
    if (onNextEpisodeRef.current) {
      onNextEpisodeRef.current();
    }
  }, []);

  // Botón secundario: Cancelar (descarta overlay y previene disparo automático para este episodio)
  const handleCancelNextEpisode = useCallback(() => {
    if (nextEpisodeTimerRef.current) {
      clearInterval(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
    }
    setShowNextOverlay(false);
    dismissedNextEpisodeRef.current = true;
  }, []);

  // Manejo de la cuenta regresiva segundo a segundo
  useEffect(() => {
    if (!showNextOverlay) {
      if (nextEpisodeTimerRef.current) {
        clearInterval(nextEpisodeTimerRef.current);
        nextEpisodeTimerRef.current = null;
      }
      return;
    }

    nextEpisodeTimerRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(nextEpisodeTimerRef.current);
          nextEpisodeTimerRef.current = null;
          setShowNextOverlay(false);
          if (onNextEpisodeRef.current) {
            onNextEpisodeRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (nextEpisodeTimerRef.current) {
        clearInterval(nextEpisodeTimerRef.current);
        nextEpisodeTimerRef.current = null;
      }
    };
  }, [showNextOverlay]);

  // Limpieza de temporizadores al desmontar el componente
  useEffect(() => {
    return () => {
      if (nextEpisodeTimerRef.current) {
        clearInterval(nextEpisodeTimerRef.current);
        nextEpisodeTimerRef.current = null;
      }
    };
  }, []);

  // Volume: 0.0 a 2.0 (0% a 200%)
  const [volume, setVolume] = useState(1.0);
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
  const progressStorageKey = item?.path ? `cloudmedia_progress_${item.path}` : null;

  // 1. OSD Temporal estilo VLC
  const triggerOsd = useCallback((title, value = null, type = 'volume') => {
    setOsdMessage({ title, value, type });
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setOsdMessage(null);
    }, 1800);
  }, []);

  // 2. Control de Inactividad (isIdle) con timeout de 2.8 segundos
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      setShowAudioMenu(false);
      setShowSubtitleMenu(false);
      setShowMobileVolumeSlider(false);
    }, 2800);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onUserActivity = () => {
      resetIdleTimer();
    };

    container.addEventListener('mousemove', onUserActivity);
    container.addEventListener('pointermove', onUserActivity);
    container.addEventListener('touchstart', onUserActivity, { passive: true });
    container.addEventListener('keydown', onUserActivity);

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      container.removeEventListener('mousemove', onUserActivity);
      container.removeEventListener('pointermove', onUserActivity);
      container.removeEventListener('touchstart', onUserActivity);
      container.removeEventListener('keydown', onUserActivity);
    };
  }, [resetIdleTimer]);

  // 3. Web Audio API para amplificación de volumen VLC hasta 200%
  const initWebAudio = useCallback(() => {
    if (!videoRef.current) return;
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return;
    }
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
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Web Audio API fallback (usando audio nativo):', err.message);
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const targetGain = isMuted ? 0 : volume;
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = targetGain;
    }
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = Math.max(0, Math.min(targetGain, 1.0));
    }
  }, [volume, isMuted]);

  // 4. Sincronizar estado de Pantalla Completa nativo en el documento
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFs);
      if (isFs) setIsMiniMode(false);
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

  // 5. Cargar metadatos técnicos (duración, audio y subtítulos)
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

  // 6. Guardar progreso de visualización local (localStorage) y remoto (backend)
  const saveLocalProgress = useCallback((seconds) => {
    if (!progressStorageKey || isNaN(seconds) || seconds < 0) return;
    try {
      // Si el video está casi terminado (más del 95% o últimos 25s), limpiamos el progreso
      if (totalDuration > 0 && (seconds / totalDuration > 0.95 || totalDuration - seconds < 25)) {
        localStorage.removeItem(progressStorageKey);
      } else if (seconds > 3) {
        localStorage.setItem(progressStorageKey, seconds.toString());
      }
    } catch (e) {
      console.warn('Error guardando progreso local:', e);
    }
  }, [progressStorageKey, totalDuration]);

  // Sincronización en backend cada 5s
  useEffect(() => {
    if (!isPlaying || !item?.path) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (v) {
        const computedTime = timeOffset + v.currentTime;
        if (Math.abs(computedTime - lastSavedBackendRef.current) >= 4) {
          lastSavedBackendRef.current = computedTime;
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

  // Guardar progreso al desmontar el reproductor
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        const effectiveTime = timeOffset + videoRef.current.currentTime;
        saveLocalProgress(effectiveTime);
      }
    };
  }, [saveLocalProgress, timeOffset]);

  // 7. Evento onLoadedMetadata: Reanudar desde localStorage automáticamente
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.duration && !totalDuration) {
      setTotalDuration(video.duration);
    }

    if (!hasRestoredProgressRef.current && progressStorageKey) {
      try {
        const savedTimeStr = localStorage.getItem(progressStorageKey);
        if (savedTimeStr) {
          const savedTime = parseFloat(savedTimeStr);
          if (!isNaN(savedTime) && savedTime > 3) {
            hasRestoredProgressRef.current = true;
            if (!isMkv) {
              video.currentTime = savedTime;
              setCurrentTime(savedTime);
            } else {
              seekTo(savedTime);
            }
            triggerOsd('Continuar Viendo', formatTime(savedTime), 'seek');
          }
        }
      } catch (err) {
        console.warn('Error leyendo progreso guardado de localStorage:', err);
      }
    }
  };

  // 8. Evento onTimeUpdate: Actualiza el estado y guarda en localStorage cada 2s
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const effectiveTime = Math.min(timeOffset + video.currentTime, totalDuration || Infinity);
    setCurrentTime(effectiveTime);

    if (Math.abs(effectiveTime - lastLocalSavedTimeRef.current) >= 2) {
      lastLocalSavedTimeRef.current = effectiveTime;
      saveLocalProgress(effectiveTime);
    }

    // Autoplay Siguiente Episodio: cuando faltan 20 segundos o menos para terminar
    const effectiveDuration = totalDuration || video.duration || 0;
    if (
      onNextEpisode &&
      effectiveDuration > 0 &&
      effectiveDuration - effectiveTime <= 20 &&
      !dismissedNextEpisodeRef.current &&
      !hasTriggeredNextEpisodeRef.current
    ) {
      triggerNextEpisodeOverlay();
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      const effectiveTime = timeOffset + videoRef.current.currentTime;
      saveLocalProgress(effectiveTime);
    }
  };

  // 9. Seeking preciso (soporta remuxing ffmpeg con timeOffset)
  const seekTo = (targetSeconds) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedTarget = Math.max(0, Math.min(targetSeconds, totalDuration || targetSeconds));
    if (volume > 1.0) {
      initWebAudio();
    }

    // Si el usuario rebobina antes de los últimos 20 segundos y el overlay estaba abierto
    const effectiveDuration = totalDuration || video.duration || 0;
    if (
      effectiveDuration > 0 &&
      effectiveDuration - clampedTarget > 20 &&
      showNextOverlay &&
      !dismissedNextEpisodeRef.current
    ) {
      setShowNextOverlay(false);
      hasTriggeredNextEpisodeRef.current = false;
      if (nextEpisodeTimerRef.current) {
        clearInterval(nextEpisodeTimerRef.current);
        nextEpisodeTimerRef.current = null;
      }
    }

    const isDriveStream = Boolean(item?.fileId || item?.streamUrl || item?.webContentLink);

    if (isMkv && !isDriveStream) {
      setIsBuffering(true);
      setTimeOffset(clampedTarget);
      setCurrentTime(clampedTarget);

      const wasPlaying = !video.paused;
      const newSrc = getStreamUrl(item, selectedTrackIndex, true, clampedTarget);
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

    saveLocalProgress(clampedTarget);
    triggerOsd('Salto de tiempo', formatTime(clampedTarget), 'seek');
  };

  const seekRelative = (seconds) => {
    seekTo(currentTime + seconds);
  };

  // 10. Control de Volumen VLC (hasta 200%)
  const changeVolume = (delta) => {
    let newVol = Math.round((volume + delta) * 100) / 100;
    newVol = Math.max(0, Math.min(newVol, 2.0));
    if (newVol > 1.0) initWebAudio();

    setVolume(newVol);
    if (newVol > 0 && isMuted) setIsMuted(false);
    triggerOsd('Volumen', Math.round(newVol * 100), 'volume');
  };

  const setVolumeDirect = (val) => {
    const clamped = Math.max(0, Math.min(val, 2.0));
    if (clamped > 1.0) initWebAudio();
    setVolume(clamped);
    if (clamped > 0 && isMuted) setIsMuted(false);
    triggerOsd('Volumen', Math.round(clamped * 100), 'volume');
  };

  const toggleMute = () => {
    if (volume > 1.0) initWebAudio();
    if (isMuted) {
      setIsMuted(false);
      triggerOsd('Volumen', Math.round((previousVolume || 1.0) * 100), 'volume');
    } else {
      setPreviousVolume(volume);
      setIsMuted(true);
      triggerOsd('Silencio', 0, 'volume');
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.05 : -0.05;
    changeVolume(step);
  };

  // 11. PANTALLA COMPLETA REAL: Aplicada al div CONTENEDOR principal (containerRef), NO a la etiqueta <video>
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
        // Solicitamos fullscreen al contenedor para que los controles se mantengan superpuestos
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          await container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          await container.msRequestFullscreen();
        } else if (video && video.webkitEnterFullscreen) {
          // Fallback exclusivo para Safari iOS
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
        triggerOsd('Vista Normal', null, 'minimize');
      }
    } catch (err) {
      console.warn('Fullscreen alternado en modo ventana:', err);
      setIsFullscreen(!isCurrentlyFs);
    }
  };

  const toggleMiniMode = () => {
    if (isFullscreen) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
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
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
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

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (volume > 1.0) initWebAudio();

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

  // Toques en pantalla en dispositivos móviles
  const handleVideoTouch = (e) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX) || 0;
    const isDoubleTap = now - lastTapRef.current < 300;

    if (isDoubleTap) {
      const clickRatio = (touchX - rect.left) / rect.width;
      if (clickRatio < 0.35) {
        seekRelative(-10);
      } else if (clickRatio > 0.65) {
        seekRelative(10);
      } else {
        togglePlay();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Alternar visibilidad de controles en móvil
      if (isIdle) {
        resetIdleTimer();
      } else {
        setIsIdle(true);
      }
    }
  };

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

  const volumePercentage = Math.round((isMuted ? 0 : volume) * 100);
  let volumeHex = accentColor;
  if (volumePercentage > 150) volumeHex = '#ef4444';
  else if (volumePercentage > 100) volumeHex = '#f59e0b';

  const handleSelectAudioTrack = (idx) => {
    setSelectedTrackIndex(idx);
    setShowAudioMenu(false);
    const track = audioTracks[idx];
    triggerOsd(`Audio: ${track?.title || `Pista ${idx + 1}`}`, null, 'audio');
    seekTo(currentTime);
  };

  const streamSrc = getStreamUrl(item, selectedTrackIndex, isMkv, timeOffset);
  const remainingSeconds = Math.max(0, (totalDuration || 0) - currentTime);

  // Subtítulos
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncTracks = () => {
      if (!video.textTracks || video.textTracks.length === 0) return;
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        track.mode = selectedSubtitleIndex >= 0 ? 'showing' : 'disabled';
      }
    };

    syncTracks();
    video.addEventListener('loadeddata', syncTracks);
    return () => video.removeEventListener('loadeddata', syncTracks);
  }, [selectedSubtitleIndex, timeOffset, isMkv]);

  useEffect(() => {
    if (!isMiniMode) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      containerRef.current?.focus();
      return () => { document.body.style.overflow = orig; };
    }
  }, [isMiniMode]);

  return createPortal(
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center transition-all ${
        isMiniMode ? 'pointer-events-none' : ''
      } ${isFullscreen ? 'p-0 bg-black' : 'p-0 sm:p-3 md:p-6'}`}
    >
      {/* Backdrop */}
      {!isMiniMode && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md transition-all duration-300"
          onClick={isFullscreen ? undefined : onClose}
          aria-hidden="true"
        />
      )}

      {/* ================= CONTENEDOR PRINCIPAL DEL REPRODUCTOR (WRAPPER FULLSCREEN) ================= */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal={!isMiniMode}
        aria-label={`Reproductor: ${item.title || item.name}`}
        tabIndex={0}
        onWheel={handleWheel}
        className={`relative z-10 bg-black select-none overflow-hidden outline-none pointer-events-auto transition-all duration-300 ${
          isIdle ? 'cursor-none' : 'cursor-default'
        } ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-none'
            : isMiniMode
            ? 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-80 sm:w-96 aspect-video rounded-2xl border-2 shadow-2xl z-[99999]'
            : 'w-full h-full sm:h-auto sm:max-w-4xl lg:max-w-5xl sm:aspect-video sm:max-h-[86vh] rounded-none sm:rounded-3xl border sm:border-slate-800 shadow-2xl'
        }`}
        style={isMiniMode ? { borderColor: accentColor } : undefined}
      >
        {/* ================= BARRA SUPERIOR VLC FLOTANTE ================= */}
        {!isMiniMode && (
          <div
            className={`absolute top-0 inset-x-0 z-30 px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-b from-black/95 via-black/70 to-transparent transition-all duration-300 ease-in-out flex items-center justify-between pt-[max(0.75rem,env(safe-area-inset-top))] ${
              isIdle ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'
            }`}
          >
            {/* Título y Badge */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-[10px] sm:text-[11px] font-mono text-slate-200 shrink-0 shadow-md">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                <span className="font-bold">CloudMedia</span>
                {isMkv && <span className="font-bold ml-1 text-red-400">MKV</span>}
              </div>

              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-[42vw] sm:max-w-md md:max-w-xl drop-shadow">
                  {item.title || item.name}
                </h2>
                {mediaInfo && (
                  <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>{mediaInfo.video?.width}x{mediaInfo.video?.height}</span>
                    <span>•</span>
                    <span>{mediaInfo.video?.codec?.toUpperCase()}</span>
                    <span>•</span>
                    <span>{mediaInfo.humanSize}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones de Cabecera */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleMiniMode}
                aria-label="Modo miniatura"
                className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Miniatura flotante"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Pantalla completa (F)"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar reproductor"
                className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-black/60 hover:bg-red-600 text-slate-300 hover:text-white transition-colors shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= OVERLAY MODO MINIATURA ================= */}
        {isMiniMode && (
          <div className="absolute inset-0 z-30 bg-black/40 hover:bg-black/60 transition-colors flex flex-col justify-between p-3 group">
            <div className="flex items-center justify-between text-white">
              <span className="text-xs font-semibold truncate max-w-[190px] drop-shadow">
                {item.title || item.name}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={toggleMiniMode} className="p-1.5 rounded-lg bg-black/70 hover:bg-white/20 text-white">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={togglePlay}
                className="p-3 rounded-full text-white shadow-xl bg-red-600 hover:bg-red-700 transition-all"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
            </div>

            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600"
                style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* ================= OSD NOTIFICACIÓN ESTILO VLC ================= */}
        {osdMessage && !isMiniMode && (
          <div className="absolute top-16 right-4 sm:top-20 sm:right-6 z-40 animate-fade-in pointer-events-none">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/95 border border-slate-700 shadow-2xl backdrop-blur-md">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: volumeHex + '25', color: volumeHex }}
              >
                {osdMessage.type === 'play' ? <Play className="w-4 h-4 fill-current" /> :
                 osdMessage.type === 'pause' ? <Pause className="w-4 h-4 fill-current" /> :
                 osdMessage.type === 'stop' ? <Square className="w-4 h-4 fill-current" /> :
                 osdMessage.type === 'audio' ? <Music2 className="w-4 h-4" /> :
                 osdMessage.type === 'subtitle' ? <Subtitles className="w-4 h-4" /> :
                 osdMessage.type === 'volume' ? <VolumeIcon className="w-4 h-4" /> :
                 osdMessage.type === 'seek' ? <RotateCw className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{osdMessage.title}</div>
                {osdMessage.value !== null && (
                  <div className="text-xs sm:text-sm font-mono font-black text-white flex items-center gap-2">
                    <span>{osdMessage.type === 'volume' ? `${osdMessage.value}%` : osdMessage.value}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= ÁREA DE VIDEO & ELEMENTO HTML5 (FONDO COMPLETO) ================= */}
        <div
          onClick={handleVideoTouch}
          onDoubleClick={toggleFullscreen}
          className="absolute inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden z-0"
        >
          {/* ETIQUETA VIDEO NATIVA CON CLASES SOLICITADAS: w-full h-full object-contain bg-black */}
          <video
            ref={videoRef}
            crossOrigin="anonymous"
            src={streamSrc}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              setIsPlaying(true);
            }}
            onPause={handlePause}
            onEnded={() => {
              setIsPlaying(false);
              if (onNextEpisode && !dismissedNextEpisodeRef.current) {
                if (!hasTriggeredNextEpisodeRef.current) {
                  triggerNextEpisodeOverlay();
                }
              }
            }}
            className="w-full h-full object-contain bg-black"
            playsInline
            webkit-playsinline="true"
          >
            {selectedSubtitleIndex >= 0 && (
              <track
                key={`sub-${selectedSubtitleIndex}-${isMkv ? timeOffset : 0}`}
                kind="subtitles"
                src={getSubtitleUrl(item.path, selectedSubtitleIndex, isMkv ? timeOffset : 0)}
                srcLang={subtitleTracks[selectedSubtitleIndex]?.language || 'es'}
                label={subtitleTracks[selectedSubtitleIndex]?.title || 'Subtítulos'}
                default
              />
            )}
          </video>

          {/* Buffering Spinner */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none z-20">
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }}
              />
            </div>
          )}

          {/* CONTROLES TÁCTILES CENTRALES (Adelantar/Retroceder/Play) */}
          {!isMiniMode && (
            <div
              className={`absolute inset-0 z-20 flex items-center justify-center gap-6 sm:gap-10 pointer-events-auto transition-all duration-300 ease-in-out ${
                isIdle ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => seekRelative(-10)}
                aria-label="Retroceder 10 segundos"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-90 border border-white/10 shadow-lg"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full text-white flex items-center justify-center shadow-2xl transition-transform active:scale-95 bg-red-600 hover:bg-red-700 shadow-red-600/50"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={() => seekRelative(10)}
                aria-label="Adelantar 10 segundos"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-90 border border-white/10 shadow-lg"
              >
                <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          )}
        </div>

        {/* ================= BARRA INFERIOR DE CONTROLES FLOTANTE Y SEMITRANSPARENTE ================= */}
        {!isMiniMode && (
          <div
            className={`absolute bottom-0 inset-x-0 z-30 transition-all duration-300 ease-in-out p-3 sm:p-5 text-slate-200 bg-gradient-to-t from-black/95 via-black/80 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-auto select-none ${
              isIdle ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'
            }`}
          >
            {/* 1. Scrubbing Bar de Progreso Adaptada a Móvil */}
            <div className="space-y-1.5 mb-2.5">
              <div className="relative group/progress flex items-center py-1">
                <input
                  type="range"
                  min="0"
                  max={totalDuration || 100}
                  step="0.5"
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="w-full h-2.5 sm:h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer hover:h-3 transition-all"
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

              {/* Tiempos */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold">{formatTime(currentTime)}</span>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => setShowRemainingTime(!showRemainingTime)}
                    className="hover:text-white transition-colors"
                  >
                    {showRemainingTime ? `-${formatTime(remainingSeconds)}` : formatTime(totalDuration)}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {audioTracks[selectedTrackIndex] && (
                    <span className="truncate max-w-[130px] sm:max-w-none">
                      {audioTracks[selectedTrackIndex].language?.toUpperCase() || 'Audio'} ({audioTracks[selectedTrackIndex].codec?.toUpperCase() || 'AAC'})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Botonera Responsiva con Targets Táctiles de 44px */}
            <div className="flex items-center justify-between gap-1 sm:gap-3">
              {/* Controles de Transporte */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-white shadow-md transition-transform active:scale-95 bg-red-600 hover:bg-red-700"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleStop}
                  aria-label="Detener"
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>

                {onNextEpisode && (
                  <button
                    type="button"
                    onClick={handlePlayNextEpisodeNow}
                    aria-label="Siguiente episodio"
                    className="min-h-11 px-3 flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-bold"
                  >
                    <SkipForward className="w-4 h-4 text-red-500" />
                    <span className="hidden sm:inline">Siguiente</span>
                  </button>
                )}
              </div>

              {/* Control de Volumen VLC (Desktop) */}
              <div
                className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-xl border"
                style={{ backgroundColor: cardColor, borderColor }}
              >
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                  className="min-h-8 min-w-8 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" style={{ color: volumeHex }} />}
                </button>

                {/* Gráfico de Barras VLC hasta 200% */}
                <div
                  title="Volumen VLC hasta 200%"
                  className="flex items-end gap-[3px] h-6 cursor-pointer py-1 px-1"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setVolumeDirect(ratio * 2.0);
                  }}
                >
                  {[...Array(12)].map((_, i) => {
                    const barThreshold = ((i + 1) / 12) * 2.0;
                    const isActive = (isMuted ? 0 : volume) >= barThreshold - 0.08;
                    const barHeightPct = 25 + (i / 11) * 75;
                    let barStyle = { backgroundColor: '#334155' };
                    if (isActive) {
                      barStyle = { backgroundColor: barThreshold > 1.5 ? '#ef4444' : barThreshold > 1.0 ? '#f59e0b' : accentColor };
                    }
                    return (
                      <div
                        key={i}
                        className="w-[5px] rounded-t-sm transition-all duration-100"
                        style={{ height: `${barHeightPct}%`, ...barStyle }}
                      />
                    );
                  })}
                </div>

                <span className="font-mono text-xs font-bold min-w-[42px] text-right" style={{ color: volumeHex }}>
                  {volumePercentage}%
                </span>
              </div>

              {/* Botón de Volumen para Móviles */}
              <div className="relative sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowMobileVolumeSlider((prev) => !prev)}
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-white/5 text-slate-300"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" style={{ color: volumeHex }} />}
                </button>

                {showMobileVolumeSlider && (
                  <div
                    className="absolute bottom-14 left-0 p-3 rounded-2xl border shadow-2xl flex items-center gap-3 z-50 w-52 bg-slate-900 border-slate-700"
                  >
                    <button type="button" onClick={toggleMute} className="p-1 text-slate-300">
                      {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolumeDirect(parseFloat(e.target.value))}
                      className="w-full h-2 rounded-lg bg-slate-800"
                      style={{ accentColor }}
                    />
                    <span className="font-mono text-xs font-bold text-white shrink-0">
                      {volumePercentage}%
                    </span>
                  </div>
                )}
              </div>

              {/* Audio, Subtítulos y Pantalla Completa */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Selector de Audio */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAudioMenu(!showAudioMenu);
                      setShowSubtitleMenu(false);
                      setShowMobileVolumeSlider(false);
                    }}
                    aria-label="Pistas de audio"
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border transition-colors bg-white/5 hover:bg-white/10 text-slate-300 border-slate-800"
                  >
                    <Music2 className="w-4 h-4" />
                  </button>

                  {showAudioMenu && (
                    <div
                      className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-0 w-64 max-w-[88vw] max-h-56 overflow-y-auto rounded-2xl border shadow-2xl p-2 z-50 text-xs bg-slate-900 border-slate-700"
                    >
                      <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                        Pistas de Audio VLC
                      </div>
                      {audioTracks.length > 0 ? (
                        audioTracks.map((track) => (
                          <button
                            key={track.index}
                            type="button"
                            onClick={() => handleSelectAudioTrack(track.index)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                              selectedTrackIndex === track.index
                                ? 'bg-red-600/20 text-red-400 font-bold'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
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
                        <div className="px-3 py-2 text-slate-400 text-xs">Pista predeterminada</div>
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
                      className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border transition-colors bg-white/5 hover:bg-white/10 text-slate-300 border-slate-800"
                    >
                      <Subtitles className="w-4 h-4" />
                    </button>

                    {showSubtitleMenu && (
                      <div
                        className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-0 w-60 max-w-[88vw] max-h-56 overflow-y-auto rounded-2xl border shadow-2xl p-2 z-50 text-xs bg-slate-900 border-slate-700"
                      >
                        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                          Subtítulos
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubtitleIndex(-1);
                            setShowSubtitleMenu(false);
                            triggerOsd('Subtítulos desactivados', null, 'subtitle');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                            selectedSubtitleIndex === -1 ? 'bg-red-600/20 text-red-400 font-bold' : 'text-slate-300 hover:bg-slate-800'
                          }`}
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
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                              selectedSubtitleIndex === sub.index ? 'bg-red-600/20 text-red-400 font-bold' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="truncate">{sub.title || `Subtítulo ${sub.index + 1}`}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{sub.language?.toUpperCase() || 'UND'}</div>
                            </div>
                            {selectedSubtitleIndex === sub.index && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Botón Pantalla Completa Real */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= OVERLAY AUTOPLAY SIGUIENTE EPISODIO (ESTILO NETFLIX) ================= */}
        {showNextOverlay && !isMiniMode && (
          <aside
            role="region"
            aria-label="Siguiente episodio"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-20 sm:bottom-24 right-3 sm:right-6 z-50 w-[calc(100%-1.5rem)] max-w-sm sm:max-w-md bg-black/90 border border-slate-700 backdrop-blur-md rounded-2xl p-4 shadow-2xl animate-fade-in pointer-events-auto cursor-default"
          >
            {/* Barra de progreso de cuenta regresiva */}
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-red-600 transition-all duration-1000 ease-linear rounded-full"
                style={{
                  width: `${(countdownSeconds / NEXT_EPISODE_COUNTDOWN_DURATION) * 100}%`
                }}
              />
            </div>

            {/* Cabecera del Overlay */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                  Siguiente episodio en{' '}
                  <span className="font-mono text-red-500 font-extrabold text-sm sm:text-base">
                    {countdownSeconds}s
                  </span>
                  ...
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelNextEpisode}
                aria-label="Descartar siguiente episodio"
                className="p-1 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Información del Siguiente Episodio (si existe prop nextEpisode) */}
            {nextEpisode && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 mb-3.5">
                {/* Miniatura con fallback */}
                {nextEpisode.posterUrl && !nextThumbError ? (
                  <img
                    src={nextEpisode.posterUrl}
                    alt={nextEpisode.title || nextEpisode.name || 'Siguiente episodio'}
                    className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg object-cover bg-slate-900 border border-slate-700/80 shrink-0 shadow-md"
                    onError={() => setNextThumbError(true)}
                  />
                ) : (
                  <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg bg-slate-800/90 border border-slate-700/80 flex flex-col items-center justify-center shrink-0 text-slate-400 shadow-inner">
                    <Play className="w-4 h-4 text-red-500 fill-current mb-0.5" />
                    {nextEpisode.episode !== undefined && nextEpisode.episode !== null && (
                      <span className="text-[10px] font-mono font-bold text-slate-300">
                        E{nextEpisode.episode}
                      </span>
                    )}
                  </div>
                )}

                {/* Título y Temporada/Episodio */}
                <div className="min-w-0 flex-1">
                  {(nextEpisode.season !== undefined || nextEpisode.episode !== undefined) && (
                    <div className="text-[10px] sm:text-[11px] font-mono font-bold text-red-400 uppercase tracking-wide truncate">
                      {nextEpisode.season !== undefined && `Temporada ${nextEpisode.season}`}
                      {nextEpisode.season !== undefined && nextEpisode.episode !== undefined && ' • '}
                      {nextEpisode.episode !== undefined && `Episodio ${nextEpisode.episode}`}
                    </div>
                  )}
                  <div className="text-xs sm:text-sm font-bold text-white truncate drop-shadow mt-0.5">
                    {nextEpisode.title || nextEpisode.cleanTitle || nextEpisode.name || 'Siguiente episodio'}
                  </div>
                </div>
              </div>
            )}

            {/* Botones Primario y Secundario */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handlePlayNextEpisodeNow}
                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 transition-all cursor-pointer min-h-[40px]"
              >
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0" />
                <span>Reproducir Ahora</span>
              </button>

              <button
                type="button"
                onClick={handleCancelNextEpisode}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition-all border border-slate-700/80 cursor-pointer min-h-[40px]"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Cancelar</span>
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>,
    document.body
  );
}
