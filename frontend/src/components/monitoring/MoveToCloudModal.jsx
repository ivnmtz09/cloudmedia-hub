import React, { useState } from 'react';
import { CloudUpload, Film, Tv, Video, ShieldCheck, FileText, Loader2, Check } from 'lucide-react';
import Modal from '../common/Modal';
import { executeCleanupAction } from '../../services/api';

const CATEGORIES = [
  { id: 'Peliculas', label: 'Películas', icon: Film, desc: 'Películas completas y cine', color: 'border-brand-500/40 text-brand-400' },
  { id: 'Series', label: 'Series', icon: Tv, desc: 'Episodios y temporadas', color: 'border-indigo-500/40 text-indigo-400' },
  { id: 'Videos_Personales', label: 'Videos Personales', icon: Video, desc: 'Grabaciones de cámara o teléfono', color: 'border-cyan-500/40 text-cyan-400' },
  { id: 'Backups_PC', label: 'Backups PC', icon: ShieldCheck, desc: 'Respaldos de sistema y archivos zip', color: 'border-amber-500/40 text-amber-400' },
  { id: 'Documentos', label: 'Documentos', icon: FileText, desc: 'Archivos PDF, ISOs y trabajos', color: 'border-emerald-500/40 text-emerald-400' },
];

export default function MoveToCloudModal({ file, isOpen, onClose, onMoved, addToast }) {
  const [selectedCategory, setSelectedCategory] = useState('Peliculas');
  const [loading, setLoading] = useState(false);

  if (!file) return null;

  const handleMove = async () => {
    try {
      setLoading(true);
      await executeCleanupAction({
        action: 'move',
        filePath: file.filePath,
        destinationCategory: selectedCategory
      });

      addToast({
        type: 'success',
        title: 'Moviendo a la nube',
        message: `"${file.name}" se está transfiriendo a PC_Storage/${selectedCategory} vía rclone`
      });

      onMoved();
      onClose();
    } catch (err) {
      console.error('Error moving file to cloud:', err);
      addToast({
        type: 'error',
        title: 'Error de transferencia',
        message: err.message || 'No se pudo mover el archivo a la nube'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mover Archivo a la Nube (Google Drive)" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* File details card */}
        <div className="p-3.5 rounded-2xl bg-dark-900 border border-slate-800 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white truncate max-w-xs">{file.name}</span>
            <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold font-mono">
              {file.humanSize}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">{file.filePath}</p>
        </div>

        {/* Category Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Selecciona la carpeta de destino en PC_Storage:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-brand-500 shadow-md shadow-brand-500/10'
                      : 'bg-dark-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl bg-dark-950 border ${cat.color} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white">{cat.label}</p>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{cat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-normal">
          Nota: El archivo será movido de forma asíncrona mediante el proceso de sincronización con Google Drive (liberará espacio en tu disco local).
        </p>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
            <span>{loading ? 'Iniciando Transferencia...' : 'Mover a la Nube'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
