import React from 'react';
import {
  Folder, Film, Music, FileText, Archive, Image, File,
  Play, Download, Edit2, Trash2, MoreVertical
} from 'lucide-react';
import { getDownloadUrl } from '../../services/api';

export default function FileItem({
  item,
  viewMode = 'grid',
  onOpenFolder,
  onPlayMedia,
  onRename,
  onDelete,
  canManage = false
}) {
  const isVideo = item.category === 'video';
  const isAudio = item.category === 'audio';
  const isMedia = isVideo || isAudio;

  const getIcon = () => {
    if (item.isDirectory) return <Folder className="w-8 h-8 text-amber-400 fill-amber-400/20" />;
    switch (item.category) {
      case 'video':
        return <Film className="w-8 h-8 text-brand-400" />;
      case 'audio':
        return <Music className="w-8 h-8 text-indigo-400" />;
      case 'image':
        return <Image className="w-8 h-8 text-emerald-400" />;
      case 'document':
        return <FileText className="w-8 h-8 text-cyan-400" />;
      case 'archive':
        return <Archive className="w-8 h-8 text-purple-400" />;
      default:
        return <File className="w-8 h-8 text-slate-400" />;
    }
  };

  const getSmallIcon = () => {
    if (item.isDirectory) return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
    switch (item.category) {
      case 'video':
        return <Film className="w-4 h-4 text-brand-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-indigo-400" />;
      case 'image':
        return <Image className="w-4 h-4 text-emerald-400" />;
      case 'document':
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-purple-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  const handlePrimaryClick = () => {
    if (item.isDirectory) {
      onOpenFolder(item.path);
    } else if (isMedia) {
      onPlayMedia(item);
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const downloadUrl = getDownloadUrl(item.path);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  // GRID VIEW
  if (viewMode === 'grid') {
    return (
      <div
        onClick={handlePrimaryClick}
        className="group relative rounded-2xl glass-card p-4 hover:border-brand-500/40 hover:shadow-glow-red transition-all duration-200 cursor-pointer flex flex-col justify-between"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-dark-900 border border-slate-800/80 group-hover:scale-110 transition-transform">
            {getIcon()}
          </div>

          {/* Quick Actions Menu */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            {isMedia && (
              <button
                onClick={() => onPlayMedia(item)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-500 text-slate-300 hover:text-white transition-colors"
                title="Reproducir"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}

            {!item.isDirectory && (
              <button
                onClick={handleDownload}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Descargar archivo"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {canManage && (
              <>
                <button
                  onClick={() => onRename(item)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Renombrar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDelete(item)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <h4
            className="font-medium text-sm text-slate-100 group-hover:text-brand-400 transition-colors truncate mb-1"
            title={item.name}
          >
            {item.name}
          </h4>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{item.humanSize || '-'}</span>
            <span>{formatDate(item.modifiedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <tr
      onClick={handlePrimaryClick}
      className="group hover:bg-white/[0.03] border-b border-slate-800/60 cursor-pointer transition-colors"
    >
      <td className="py-3 px-4 flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-dark-900 border border-slate-800 shrink-0">
          {getSmallIcon()}
        </div>
        <span
          className="text-sm font-medium text-slate-200 group-hover:text-brand-400 transition-colors truncate max-w-xs sm:max-w-md"
          title={item.name}
        >
          {item.name}
        </span>
      </td>

      <td className="py-3 px-4 text-xs text-slate-400 font-mono">
        {item.humanSize || '-'}
      </td>

      <td className="py-3 px-4 text-xs text-slate-400 hidden sm:table-cell">
        {item.extension ? item.extension.toUpperCase().replace('.', '') : (item.isDirectory ? 'Carpeta' : '-')}
      </td>

      <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell">
        {formatDate(item.modifiedAt)}
      </td>

      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {isMedia && (
            <button
              onClick={() => onPlayMedia(item)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-brand-500 text-slate-300 hover:text-white transition-colors"
              title="Reproducir"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          {!item.isDirectory && (
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Descargar"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {canManage && (
            <>
              <button
                onClick={() => onRename(item)}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Renombrar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onDelete(item)}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
