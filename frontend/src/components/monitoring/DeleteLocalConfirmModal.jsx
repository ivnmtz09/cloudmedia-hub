import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { executeCleanupAction } from '../../services/api';

export default function DeleteLocalConfirmModal({ file, isOpen, onClose, onDeleted, addToast }) {
  const [loading, setLoading] = useState(false);

  if (!file) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      await executeCleanupAction({
        action: 'delete',
        filePath: file.filePath
      });

      addToast({
        type: 'success',
        title: 'Archivo eliminado',
        message: `"${file.name}" fue eliminado del disco local (${file.humanSize} liberados)`
      });

      onDeleted();
      onClose();
    } catch (err) {
      console.error('Error deleting local file:', err);
      addToast({
        type: 'error',
        title: 'Error al eliminar',
        message: err.message || 'No se pudo eliminar el archivo'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Borrado de Archivo Local" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30 text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-white mb-1">
              ¿Eliminar permanentemente este archivo del PC?
            </p>
            <p className="font-mono text-red-300 break-all mb-1">{file.name}</p>
            <p className="text-[11px] text-slate-300">
              Liberará <strong className="text-white">{file.humanSize}</strong> de espacio en tu disco local. Esta acción no se puede deshacer.
            </p>
          </div>
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
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/30 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{loading ? 'Eliminando...' : 'Eliminar del PC'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
