import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { uploadFile } from '../../services/api';

export default function UploadModal({ isOpen, onClose, destinationPath, onUploadComplete, addToast }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setIsUploading(false);
    setProgress(0);
    setUploadedBytes(0);
    setTotalBytes(0);
    setDragActive(false);
  };

  const handleClose = () => {
    if (isUploading) return;
    resetState();
    onClose();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const startUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setProgress(0);

      await uploadFile(destinationPath, file, (percent, loaded, total) => {
        setProgress(percent);
        setUploadedBytes(loaded);
        setTotalBytes(total);
      });

      addToast({
        type: 'success',
        title: 'Archivo subido',
        message: `"${file.name}" se subió exitosamente a ${destinationPath || 'raíz'}`
      });

      onUploadComplete();
      handleClose();
    } catch (err) {
      console.error('Error uploading file:', err);
      addToast({
        type: 'error',
        title: 'Error de subida',
        message: err.message || 'No se pudo subir el archivo'
      });
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Subir Archivo a la Nube" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Destination folder */}
        <div className="p-3 rounded-xl bg-dark-900 border border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400">Carpeta destino:</span>
          <span className="font-semibold text-brand-400 font-mono">
            PC_Storage/{destinationPath || '(raíz)'}
          </span>
        </div>

        {/* Dropzone */}
        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
              dragActive
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-slate-700/80 hover:border-slate-600 bg-dark-900/50 hover:bg-dark-900/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-200 mb-1">
              Arrastra y suelta tu archivo aquí
            </p>
            <p className="text-xs text-slate-400">o haz clic para explorar en tu equipo</p>
            <p className="text-[11px] text-slate-400 mt-3">Soporta videos MKV/MP4, archivos grandes y documentos</p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 truncate pr-2">
                <div className="p-2.5 rounded-xl bg-slate-800 text-brand-400 shrink-0">
                  <File className="w-6 h-6" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                </div>
              </div>

              {!isUploading && (
                <button
                  onClick={() => setFile(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                    Subiendo a Google Drive...
                  </span>
                  <span className="font-bold text-brand-400 font-mono">{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-600 to-brand-500 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatSize(uploadedBytes)}</span>
                  <span>{formatSize(totalBytes || file.size)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={startUpload}
            disabled={!file || isUploading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
          >
            {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isUploading ? 'Subiendo...' : 'Iniciar Subida'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
