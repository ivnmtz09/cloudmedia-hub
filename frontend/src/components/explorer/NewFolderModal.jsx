import React, { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { createFolder } from '../../services/api';

export default function NewFolderModal({ isOpen, onClose, currentPath, onFolderCreated, addToast }) {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = folderName.trim();
    if (!name) return;

    try {
      setLoading(true);
      await createFolder(currentPath, name);
      addToast({
        type: 'success',
        title: 'Carpeta creada',
        message: `Se creó la carpeta "${name}" en ${currentPath || 'raíz'}`
      });
      setFolderName('');
      onFolderCreated();
      onClose();
    } catch (err) {
      console.error('Error creating folder:', err);
      addToast({
        type: 'error',
        title: 'Error al crear carpeta',
        message: err.message || 'No se pudo crear la carpeta'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Nueva Carpeta" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Nombre de la carpeta
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="Ej: Temporada 1, Peliculas 2026..."
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Se creará en: <span className="font-mono text-slate-300">PC_Storage/{currentPath || '(raíz)'}</span>
          </p>
        </div>

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
            type="submit"
            disabled={!folderName.trim() || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
            <span>{loading ? 'Creando...' : 'Crear Carpeta'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
