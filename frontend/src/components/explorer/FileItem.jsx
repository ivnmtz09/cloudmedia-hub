import React, { useState, useRef, useEffect } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isVideo = item.category === 'video';
  const isAudio = item.category === 'audio';
  const isMedia = isVideo || isAudio;

  // Cerrar menú al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

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

  const hasActions = isMedia || !item.isDirectory || canManage;

  // Menú desplegable con los tres puntos (...)
  const renderActionDropdown = () => {
    if (!hasActions) return null;

    return (
      <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          aria-label={`Opciones para ${item.name}`}
          aria-expanded={menuOpen}
          title="Opciones"
          className="p-1.5 rounded-xl bg-dark-900/90 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 flex items-center justify-center min-w-[32px] min-h-[32px] focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-theme-surface border border-theme-border shadow-2xl py-1.5 z-50 animate-scale-in text-xs font-medium"
            role="menu"
          >
            {isMedia && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onPlayMedia(item);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-200 hover:bg-brand-500/15 hover:text-brand-400 transition-colors text-left"
                role="menuitem"
              >
                <Play className="w-4 h-4 text-brand-400 fill-brand-400/20" />
                <span>Reproducir</span>
              </button>
            )}

            {!item.isDirectory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  handleDownload(e);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-200 hover:bg-white/5 hover:text-white transition-colors text-left"
                role="menuitem"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Descargar</span>
              </button>
            )}

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onRename(item);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-200 hover:bg-white/5 hover:text-white transition-colors text-left"
                  role="menuitem"
                >
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  <span>Editar / Renombrar</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(item);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left border-t border-slate-800/80 mt-1"
                  role="menuitem"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Eliminar</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // GRID VIEW
  if (viewMode === 'grid') {
    return (
      <div
        onClick={handlePrimaryClick}
        className="group relative rounded-2xl bg-theme-card border border-theme-border p-4 hover:border-theme-accent hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-dark-900 border border-slate-800/80 group-hover:scale-105 transition-transform">
            {getIcon()}
          </div>

          {/* Menú de 3 puntos unificado */}
          {renderActionDropdown()}
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
        <div className="flex items-center justify-end">
          {renderActionDropdown()}
        </div>
      </td>
    </tr>
  );
}
