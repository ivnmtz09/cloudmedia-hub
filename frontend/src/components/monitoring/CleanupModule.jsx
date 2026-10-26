import React, { useState, useEffect } from 'react';
import {
  Sparkles, Trash2, CloudUpload, Search, RefreshCw, FolderDown,
  Film, Music, FileText, Archive, File, AlertCircle, Loader2, CheckCircle2
} from 'lucide-react';
import MoveToCloudModal from './MoveToCloudModal';
import DeleteLocalConfirmModal from './DeleteLocalConfirmModal';
import { fetchCleanupFiles } from '../../services/api';

export default function CleanupModule({ onFileMovedOrDeleted, addToast }) {
  const [data, setData] = useState({ count: 0, totalBytes: 0, humanTotalSize: '0 B', files: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [movingFile, setMovingFile] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);

  const loadCleanup = async () => {
    try {
      setLoading(true);
      const res = await fetchCleanupFiles();
      setData(res);
    } catch (err) {
      console.error('Error fetching cleanup files:', err);
      addToast({
        type: 'error',
        title: 'Error de escaneo',
        message: err.message || 'No se pudieron escanear archivos pesados locales'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCleanup();
  }, []);

  const handleActionComplete = () => {
    loadCleanup();
    if (onFileMovedOrDeleted) onFileMovedOrDeleted();
  };

  const filteredFiles = (data.files || []).filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.filePath.toLowerCase().includes(q);
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'video':
        return <Film className="w-4 h-4 text-brand-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-indigo-400" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-purple-400" />;
      case 'document':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="glass-panel rounded-3xl border border-slate-800 p-6 shadow-2xl">
      {/* Header & Metric Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Módulo de Limpieza Local Inteligente</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Archivos Pesados Locales (&gt; 50 MB)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Escaneando <span className="font-mono text-slate-300">~/Descargas</span> y <span className="font-mono text-slate-300">~/Vídeos</span> para liberar almacenamiento local hacia Google Drive.
          </p>
        </div>

        {/* Recoverable Space Badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-dark-900 border border-slate-800 flex flex-col items-end">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Espacio Recuperable
            </span>
            <span className="text-lg font-black text-brand-400 font-mono">
              {data.humanTotalSize}
            </span>
          </div>

          <button
            onClick={loadCleanup}
            disabled={loading}
            className="p-3 rounded-2xl bg-dark-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Escanear nuevamente"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar entre los archivos pesados encontrados..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-dark-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-all"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
          <p className="text-xs">Escaneando directorios de Descargas y Vídeos...</p>
        </div>
      ) : filteredFiles.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Archivo</th>
                <th className="py-3 px-4 font-semibold">Ruta Local</th>
                <th className="py-3 px-4 font-semibold">Tamaño</th>
                <th className="py-3 px-4 font-semibold text-right">Acciones de Liberación</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr
                  key={file.filePath}
                  className="hover:bg-white/[0.02] border-b border-slate-800/60 transition-colors"
                >
                  {/* File name & Icon */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-dark-900 border border-slate-800 shrink-0">
                        {getCategoryIcon(file.category)}
                      </div>
                      <span className="font-semibold text-slate-200 truncate max-w-xs" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  </td>

                  {/* Local Path */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 truncate max-w-sm" title={file.filePath}>
                    {file.filePath}
                  </td>

                  {/* Formatted Size */}
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 font-bold font-mono text-xs">
                      {file.humanSize}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setMovingFile(file)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                        title="Transferir a Google Drive y liberar espacio local"
                      >
                        <CloudUpload className="w-3.5 h-3.5" />
                        <span>Mover a la Nube</span>
                      </button>

                      <button
                        onClick={() => setDeletingFile(file)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                        title="Borrar permanentemente del PC"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar del PC</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-white mb-1">
            {searchQuery ? 'Sin coincidencias para la búsqueda' : '¡Tu equipo está limpio!'}
          </h4>
          <p className="text-xs text-slate-400">
            {searchQuery ? 'Prueba con otro filtro de texto' : 'No se encontraron archivos mayores a 50 MB en las carpetas de Descargas o Vídeos.'}
          </p>
        </div>
      )}

      {/* Modals */}
      <MoveToCloudModal
        file={movingFile}
        isOpen={!!movingFile}
        onClose={() => setMovingFile(null)}
        onMoved={handleActionComplete}
        addToast={addToast}
      />

      <DeleteLocalConfirmModal
        file={deletingFile}
        isOpen={!!deletingFile}
        onClose={() => setDeletingFile(null)}
        onDeleted={handleActionComplete}
        addToast={addToast}
      />
    </div>
  );
}
