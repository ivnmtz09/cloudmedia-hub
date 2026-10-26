import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, X,
  RotateCcw, RotateCw, Settings, Music2, Film, Check, Loader2, Sparkles, SkipForward
} from 'lucide-react';
import { fetchMediaInfo, getStreamUrl, saveWatchProgress } from '../../services/api';

export default function VideoPlayerModal({ item, onClose, onNextEpisode }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideControlsTimer = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);

  // Metadata & Audio Tracks
  const [mediaInfo, setMediaInfo] = useState(null);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  // 1. Cargar metadatos del video (ffprobe via backend)
  useEffect(() => {
    let isCancelled = false;
    if (item?.path) {
      setIsLoadingInfo(true);
      fetchMediaInfo(item.path)
        .then((data) => {
          if (!isCancelled) {
            setMediaInfo(data);
            if (data.audioTracks && data.audioTracks.length > 0) {
              setAudioTracks(data.audioTracks);
              // Pista predeterminada o la primera
              const defaultIdx = data.audioTracks.findIndex((t) => t.isDefault);
              setSelectedTrackIndex(defaultIdx !== -1 ? defaultIdx : 0);
            }
            if (data.duration) {
              setDuration(data.duration);
            }
          }
        })
        .catch((err) => {
          console.warn('Could not fetch media info:', err.message);
        })
        .finally(() => {
          if (!isCancelled) setIsLoadingInfo(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [item?.path]);

  // Guardar progreso cada 5 segundos
  const lastSavedRef = useRef(0);
  useEffect(() => {
    if (!isPlaying || !item?.path) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (v && Math.abs(v.currentTime - lastSavedRef.current) >= 4) {
        lastSavedRef.current = v.currentTime;
        saveWatchProgress({
          path: item.path,
          currentTime: v.currentTime,
          duration: v.duration || duration,
          season: item.season,
          episode: item.episode
        }).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, item?.path, duration, item?.season, item?.episode]);

  // 2. Control de tiempo y auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowAudioMenu(false);
      }
    }, 3500);
  };

  // 3. Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        seekRelative(10);
      } else if (e.key === 'ArrowLeft') {
        seekRelative(-10);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        changeVolume(0.1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        changeVolume(-0.1);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
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
  }, [isPlaying, isFullscreen, volume, isMuted]);

  // 4. Cambiar pista de audio sin perder posición
  const selectAudioTrack = (trackIndex) => {
    if (selectedTrackIndex === trackIndex) {
      setShowAudioMenu(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const savedTime = video.currentTime;
    const wasPlaying = !video.paused;

    setSelectedTrackIndex(trackIndex);
    setShowAudioMenu(false);
    setIsBuffering(true);

    // Cambiar la fuente con el parámetro audioTrack
    const newSrc = getStreamUrl(item.path, trackIndex);
    video.src = newSrc;

    // Restaurar posición una vez cargado
    const onLoadedMetadata = () => {
      video.currentTime = savedTime;
      if (wasPlaying) {
        video.play().catch(() => {});
      }
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const seekRelative = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.min(Math.max(video.currentTime + seconds, 0), duration || video.duration || 0);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const seekTo = parseFloat(e.target.value);
    video.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  const changeVolume = (delta) => {
    const video = videoRef.current;
    if (!video) return;
    const newVol = Math.min(Math.max(video.volume + delta, 0), 1);
    video.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume || 0.5;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
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

  const streamSrc = getStreamUrl(item.path, selectedTrackIndex);
  const activeTrack = audioTracks[selectedTrackIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in">
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full h-full max-w-7xl max-h-screen sm:p-4 flex flex-col justify-center select-none"
      >
        {/* Video Element */}
        <div className="relative w-full h-full bg-black rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            src={streamSrc}
            autoPlay
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={() => {
              if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
            }}
            onDurationChange={() => {
              if (videoRef.current) setDuration(videoRef.current.duration);
            }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Buffering Indicator */}
          {isBuffering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 pointer-events-none">
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-2" />
              <p className="text-xs font-semibold text-slate-300">Cargando stream (HTTP 206)...</p>
            </div>
          )}

          {/* Top Header Overlay */}
          <div
            className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-dark-950/90 via-dark-950/50 to-transparent flex items-center justify-between transition-opacity duration-300 z-30 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base sm:text-lg line-clamp-1">
                  {item.title || item.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>GoogleDrive/{item.path}</span>
                  {mediaInfo?.video && (
                    <>
                      <span>•</span>
                      <span className="text-brand-400 font-semibold">
                        {mediaInfo.video.width}x{mediaInfo.video.height} ({mediaInfo.video.codec?.toUpperCase()})
                      </span>
                    </>
                  )}
                  {activeTrack && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-400 font-medium">
                        Audio: {activeTrack.title || activeTrack.language} ({activeTrack.codec?.toUpperCase()})
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
                  title="Siguiente Episodio"
                >
                  <SkipForward className="w-4 h-4" />
                  <span className="hidden sm:inline">Siguiente Ep.</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-95"
                title="Cerrar reproductor (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Bottom Controls Overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-dark-950/95 via-dark-950/70 to-transparent transition-opacity duration-300 z-30 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Timeline Progress Slider */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xs text-slate-300 font-mono w-14 text-right">
                {formatTime(currentTime)}
              </span>

              <div className="relative flex-1 group">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-brand-500 focus:outline-none transition-all group-hover:h-2.5"
                />
              </div>

              <span className="text-xs text-slate-400 font-mono w-14">
                {formatTime(duration)}
              </span>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between">
              {/* Left: Play/Pause, Seek Buttons, Volume */}
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={togglePlay}
                  className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30 transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                <button
                  onClick={() => seekRelative(-10)}
                  className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Retroceder 10 segundos"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => seekRelative(10)}
                  className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Avanzar 10 segundos"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2 group/vol">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-red-400" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-200 focus:outline-none opacity-80 group-hover/vol:opacity-100 transition-opacity"
                  />
                </div>
              </div>

              {/* Right: Audio Tracks, Quality, Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Audio Tracks Dropdown */}
                {audioTracks.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowAudioMenu(!showAudioMenu)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all ${
                        audioTracks.length > 1
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/30'
                          : 'bg-white/10 border-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                      title="Seleccionar pista de audio (Dual Audio)"
                    >
                      <Music2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {activeTrack?.title || activeTrack?.language || `Pista ${selectedTrackIndex + 1}`}
                      </span>
                      {audioTracks.length > 1 && (
                        <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                      )}
                    </button>

                    {/* Audio Track Menu Popover */}
                    {showAudioMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-64 glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-2 z-50">
                        <div className="px-3 py-2 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between">
                          <span>Pistas de Audio Detectadas</span>
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-400">
                            {audioTracks.length} disponibles
                          </span>
                        </div>
                        <div className="py-1 max-h-56 overflow-y-auto">
                          {audioTracks.map((track, idx) => (
                            <button
                              key={track.streamIndex || idx}
                              onClick={() => selectAudioTrack(idx)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                                selectedTrackIndex === idx
                                  ? 'bg-brand-500/20 text-brand-300 font-semibold'
                                  : 'text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <p className="leading-tight">{track.title || `Pista ${idx + 1} (${track.language})`}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {track.codec?.toUpperCase()} • {track.channelLayout || `${track.channels} ch`}
                                </p>
                              </div>
                              {selectedTrackIndex === idx && <Check className="w-4 h-4 text-brand-400 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Format Pill */}
                {mediaInfo?.format && (
                  <span className="hidden md:inline-block px-2.5 py-1 rounded-lg bg-dark-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                    {mediaInfo.format.split(',')[0]}
                  </span>
                )}

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Pantalla Completa (F)"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
