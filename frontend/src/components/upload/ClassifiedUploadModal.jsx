import React, { useState, useRef } from 'react';
import { Upload, Film, Tv, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadFile } from '../../services/api';

export function ClassifiedUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [contentType, setContentType] = useState('pelicula'); // 'pelicula' | 'serie' | 'anime'
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

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

    setUploading(true);
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

      if (onUploadSuccess) onUploadSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl glass p-6 border border-white/10 shadow-2xl animate-scale-in text-theme-text">
        <div className="flex items-center justify-between pb-4 border-b border-theme-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-theme-accent/15 text-theme-accent">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-theme-text">
                Subida Clasificada de Contenido
              </h2>
              <p className="text-xs text-theme-muted">
                Asigna tipo, serie y temporada para organizar la nube
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 rounded-lg hover:bg-white/10 text-theme-muted hover:text-theme-text transition-colors focus-ring"
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
          {/* Tipo de contenido */}
          <div>
            <label className="block text-xs font-medium text-theme-muted mb-2">
              Tipo de Medio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pelicula', label: 'Película', icon: Film },
                { id: 'serie', label: 'Serie', icon: Tv },
                { id: 'anime', label: 'Anime', icon: Tv }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = contentType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setContentType(item.id)}
                    className={`min-h-12 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all focus-ring ${
                      isSelected
                        ? 'border-theme-accent bg-theme-accent/15 text-theme-accent'
                        : 'border-theme-border/60 text-theme-muted hover:text-theme-text hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Serie / Anime Campos Específicos */}
          {(contentType === 'serie' || contentType === 'anime') && (
            <div className="space-y-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
              <div>
                <label className="block text-xs font-medium text-theme-muted mb-1">
                  Nombre de la {contentType === 'anime' ? 'Serie de Anime' : 'Serie'}
                </label>
                <input
                  type="text"
                  value={seriesTitle}
                  onChange={(e) => setSeriesTitle(e.target.value)}
                  required
                  placeholder="Ej: Batman The Animated Series, Attack on Titan..."
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-theme-border/60 text-sm text-theme-text focus-ring min-h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-theme-muted mb-1">
                    Temporada
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={seasonNumber}
                    onChange={(e) => setSeasonNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-theme-border/60 text-sm text-theme-text focus-ring min-h-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-muted mb-1">
                    Episodio inicial
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-theme-border/60 text-sm text-theme-text focus-ring min-h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dropzone */}
          <div>
            <label className="block text-xs font-medium text-theme-muted mb-2">
              Archivo(s) de Video
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-theme-border/70 hover:border-theme-accent/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-white/5"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,.mkv,.mp4,.avi,.webm"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 mx-auto text-theme-muted mb-2" />
              <div className="text-xs font-medium text-theme-text">
                Haz clic o arrastra los archivos de video aquí
              </div>
              <div className="text-[11px] text-theme-muted mt-1 font-mono">
                MKV, MP4, AVI, WEBM soportados
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-2 text-xs text-theme-accent font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{selectedFiles.length} archivo(s) seleccionado(s)</span>
              </div>
            )}
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-1.5 pt-2">
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="min-h-12 px-4 py-2 rounded-xl text-xs font-semibold text-theme-muted hover:text-theme-text hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="min-h-12 px-5 py-2 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-semibold transition-all shadow-md shadow-theme-accent/25 disabled:opacity-50 flex items-center gap-1.5 focus-ring"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Subiendo...' : 'Subir a la Nube'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClassifiedUploadModal;
