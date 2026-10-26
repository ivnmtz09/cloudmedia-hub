import React, { useState, useRef, useEffect } from 'react';
import { Upload, Film, Tv, Sparkles, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadFile } from '../../services/api';
import { MorphButton } from '../common/MorphButton';

export function ClassifiedUploadModal({ isOpen, onClose, onUploadSuccess, initialContentType = 'pelicula' }) {
  const [contentType, setContentType] = useState(initialContentType); // 'pelicula' | 'serie' | 'anime'
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'loading' | 'success'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialContentType) {
      setContentType(initialContentType);
    }
  }, [initialContentType, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('Por favor selecciona al menos un archivo para subir');
      return;
    }

    if ((contentType === 'serie' || contentType === 'anime') && !seriesTitle.trim()) {
      setError('El título de la serie/anime es obligatorio');
      return;
    }

    setUploadStatus('loading');
    setProgress(0);
    setError(null);

    try {
      for (const file of selectedFiles) {
        await uploadFile(
          '',
          file,
          (pct) => setProgress(pct),
          {
            contentType,
            seriesTitle: seriesTitle.trim(),
            seasonNumber: String(seasonNumber),
            episodeNumber: String(episodeNumber)
          }
        );
      }

      setUploadStatus('success');
      setTimeout(() => {
        if (onUploadSuccess) onUploadSuccess();
        onClose();
        setUploadStatus('idle');
        setSelectedFiles([]);
        setSeriesTitle('');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Error en la subida');
      setUploadStatus('idle');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 obscure-backdrop bg-black/80 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl glass p-6 border border-white/10 shadow-2xl animate-scale-in text-theme-text max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-theme-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-theme-accent/15 text-theme-accent border border-theme-accent/25">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-theme-text">
                Subida Clasificada a la Nube
              </h2>
              <p className="text-xs text-theme-muted">
                Almacenamiento directo en Google Drive / PC_Storage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={uploadStatus === 'loading'}
            aria-label="Cerrar modal"
            className="min-h-12 min-w-12 flex items-center justify-center rounded-xl hover:bg-white/10 text-theme-muted hover:text-theme-text transition-colors focus-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Clasificación de Contenido */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-theme-muted mb-2 block">
              Tipo de Contenido
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pelicula', label: 'Película', icon: Film },
                { id: 'serie', label: 'Serie TV', icon: Tv },
                { id: 'anime', label: 'Anime', icon: Sparkles }
              ].map((type) => {
                const Icon = type.icon;
                const isSelected = contentType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setContentType(type.id)}
                    className={`min-h-12 py-2.5 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all focus-ring ${
                      isSelected
                        ? 'border-theme-accent bg-theme-accent/15 text-theme-accent shadow-sm'
                        : 'border-white/10 text-theme-muted hover:bg-white/5 hover:text-theme-text'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campos para Series y Anime */}
          {(contentType === 'serie' || contentType === 'anime') && (
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-3 animate-fade-in">
              <div>
                <label className="text-xs font-medium text-theme-text mb-1 block">
                  Título de la {contentType === 'anime' ? 'Saga / Anime' : 'Serie'}
                </label>
                <input
                  type="text"
                  value={seriesTitle}
                  onChange={(e) => setSeriesTitle(e.target.value)}
                  placeholder={contentType === 'anime' ? 'Ej. Attack on Titan' : 'Ej. Breaking Bad'}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-theme-border/60 text-theme-text focus:border-theme-accent outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-theme-muted mb-1 block">
                    Temporada #
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={seasonNumber}
                    onChange={(e) => setSeasonNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-theme-border/60 text-theme-text focus:border-theme-accent outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-theme-muted mb-1 block">
                    Episodio Inicial #
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-theme-border/60 text-theme-text focus:border-theme-accent outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dropzone de Archivo */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-theme-muted mb-2 block">
              Seleccionar Archivos de Video
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-theme-border/60 hover:border-theme-accent/60 rounded-xl p-6 text-center cursor-pointer transition-colors hover:bg-white/5"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,.mkv,.mp4,.avi,.mov,.webm"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-theme-muted mx-auto mb-2" />
              <div className="text-xs font-semibold text-theme-text">
                Arrastra tus archivos aquí o haz clic para explorar
              </div>
              <div className="text-[11px] text-theme-muted mt-1">
                Soporte para MKV, MP4, AVI, MOV (hasta 30 GB)
              </div>
            </div>
          </div>

          {/* Archivos Seleccionados */}
          {selectedFiles.length > 0 && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs">
              <span className="text-[11px] text-theme-muted uppercase font-semibold">
                Archivos a Subir ({selectedFiles.length})
              </span>
              <ul className="max-h-28 overflow-y-auto space-y-1 font-mono text-[11px]">
                {selectedFiles.map((file, i) => (
                  <li key={i} className="flex justify-between text-slate-300">
                    <span className="truncate max-w-[300px]">{file.name}</span>
                    <span className="text-theme-muted">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Barra de Progreso */}
          {uploadStatus === 'loading' && (
            <div className="space-y-1.5 pt-2 animate-fade-in">
              <div className="flex justify-between text-xs text-theme-muted font-mono">
                <span>Subiendo a Google Drive...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-theme-accent transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions: Utiliza MorphButton (4. TRANSFORMATION) */}
          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploadStatus === 'loading'}
              className="min-h-12 px-4 py-2 rounded-xl text-xs font-semibold text-theme-muted hover:text-theme-text hover:bg-white/5 transition-colors focus-ring"
            >
              Cancelar
            </button>

            <MorphButton
              type="submit"
              status={uploadStatus}
              disabled={selectedFiles.length === 0}
              idleLabel="Subir a la Nube"
              loadingLabel="Subiendo..."
              successLabel="Subida Completada"
              icon={Upload}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClassifiedUploadModal;
