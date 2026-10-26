import React, { useState, useEffect } from 'react';
import { Edit2, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { renameItem } from '../../services/api';

export default function RenameModal({ item, isOpen, onClose, onRenamed, addToast }) {
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setNewName(item.name || '');
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || trimmed === item.name) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      // Calcular nueva ruta relativa
      const parentDir = item.path.includes('/')
        ? item.path.substring(0, item.path.lastIndexOf('/'))
        : '';
      const newPath = parentDir ? `${parentDir}/${trimmed}` : trimmed;

      await renameItem(item.path, newPath);

      addToast({
        type: 'success',
        title: 'Elemento renombrado',
        message: `Se renombró "${item.name}" a "${trimmed}"`
      });

      onRenamed();
      onClose();
    } catch (err) {
      console.error('Error renaming item:', err);
      addToast({
        type: 'error',
        title: 'Error al renombrar',
        message: err.message || 'No se pudo renombrar el elemento'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Renombrar ${item.isDirectory ? 'Carpeta' : 'Archivo'}`} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Nuevo nombre
          </label>
          <input
            type="text"
            required
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Ruta actual: {item.path}
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
            disabled={!newName.trim() || newName.trim() === item.name || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit2 className="w-3.5 h-3.5" />}
            <span>{loading ? 'Guardando...' : 'Renombrar'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
