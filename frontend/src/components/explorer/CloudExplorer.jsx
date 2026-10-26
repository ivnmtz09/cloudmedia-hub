import React, { useState, useEffect } from 'react';
import {
  Folder, Film, Tv, Video, ShieldCheck, FileText, UploadCloud, FolderPlus,
  RefreshCw, LayoutGrid, List, Search, ArrowLeft, Loader2, Sparkles, HardDrive
} from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import FileItem from './FileItem';
import UploadModal from './UploadModal';
import NewFolderModal from './NewFolderModal';
import RenameModal from './RenameModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import VideoPlayerModal from '../streaming/VideoPlayerModal';
import ClassifiedUploadModal from '../upload/ClassifiedUploadModal';
import { fetchFiles } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const QUICK_CATEGORIES = [
  { name: 'Peliculas', label: 'Películas', icon: Film, color: 'text-brand-400' },
  { name: 'Series', label: 'Series', icon: Tv, color: 'text-indigo-400' },
  { name: 'Anime', label: 'Anime', icon: Tv, color: 'text-purple-400' },
  { name: 'Videos_Personales', label: 'Videos Personales', icon: Video, color: 'text-cyan-400' },
  { name: 'Backups_PC', label: 'Backups PC', icon: ShieldCheck, color: 'text-amber-400' },
  { name: 'Documentos', label: 'Documentos', icon: FileText, color: 'text-emerald-400' },
];

export default function CloudExplorer({ addToast }) {
  const { hasMinRole } = useAuth();
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [renamingItem, setRenamingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [playingMedia, setPlayingMedia] = useState(null);

  const loadDirectory = async (targetPath = currentPath) => {
    try {
      setLoading(true);
      const data = await fetchFiles(targetPath);
      setCurrentPath(data.currentPath || '');
      setParentPath(data.parentPath ?? null);
      setItems(data.items || []);
    } catch (err) {
      console.error('Error loading files:', err);
      addToast({
        type: 'error',
        title: 'Error de navegación',
        message: err.message || 'No se pudo cargar la carpeta'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Quick Category Jump Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setCurrentPath('')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
            currentPath === ''
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'bg-dark-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Raíz (PC_Storage)</span>
        </button>

        {QUICK_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = currentPath === cat.name || currentPath.startsWith(`${cat.name}/`);
          return (
            <button
              key={cat.name}
              onClick={() => setCurrentPath(cat.name)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                isActive
                  ? 'bg-slate-800 text-white border border-brand-500/40 shadow-sm'
                  : 'bg-dark-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="bg-theme-surface rounded-3xl border border-theme-border p-4 sm:p-6 shadow-2xl">
        {/* Navigation & Controls Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-6">
          {/* Breadcrumbs & Back */}
          <div className="flex items-center gap-2">
            {parentPath !== null && (
              <button
                onClick={() => setCurrentPath(parentPath)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Subir un nivel"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Breadcrumbs currentPath={currentPath} onNavigate={(path) => setCurrentPath(path)} />
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar carpeta actual..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-dark-950 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-dark-950 rounded-xl p-0.5 border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-slate-800 text-brand-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'list' ? 'bg-slate-800 text-brand-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Lista Detallada"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadDirectory(currentPath)}
              disabled={loading}
              className="p-2 rounded-xl bg-dark-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              title="Refrescar contenido"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            </button>

            {/* New Folder Button (Moderator / Admin) */}
            {hasMinRole('moderator') && (
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors min-h-[40px]"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Nueva Carpeta</span>
              </button>
            )}

            {/* Upload Button (Moderator / Admin) */}
            {hasMinRole('moderator') && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-bold text-white shadow-md shadow-brand-500/20 transition-all active:scale-95 min-h-[40px]"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Subir Archivo</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
            <p className="text-xs">Consultando rclone y PC_Storage...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredItems.map((item) => (
                <FileItem
                  key={item.path}
                  item={item}
                  viewMode="grid"
                  canManage={hasMinRole('admin')}
                  onOpenFolder={(path) => setCurrentPath(path)}
                  onPlayMedia={(media) => setPlayingMedia(media)}
                  onRename={(target) => setRenamingItem(target)}
                  onDelete={(target) => setDeletingItem(target)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4 font-semibold">Nombre</th>
                    <th className="py-2.5 px-4 font-semibold">Tamaño</th>
                    <th className="py-2.5 px-4 font-semibold hidden sm:table-cell">Tipo</th>
                    <th className="py-2.5 px-4 font-semibold hidden md:table-cell">Modificación</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <FileItem
                      key={item.path}
                      item={item}
                      viewMode="list"
                      canManage={hasMinRole('admin')}
                      onOpenFolder={(path) => setCurrentPath(path)}
                      onPlayMedia={(media) => setPlayingMedia(media)}
                      onRename={(target) => setRenamingItem(target)}
                      onDelete={(target) => setDeletingItem(target)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="py-16 text-center">
            <Folder className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-300 mb-1">
              {searchQuery ? 'No se encontraron coincidencias' : 'Esta carpeta está vacía'}
            </h4>
            <p className="text-xs text-slate-400 mb-5">
              {searchQuery ? 'Prueba con otro término de búsqueda' : 'Sube archivos o crea una nueva subcarpeta para comenzar.'}
            </p>
            {!searchQuery && hasMinRole('moderator') && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all min-h-[44px]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Subir archivo a esta carpeta</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ClassifiedUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={() => {
          loadDirectory(currentPath);
          addToast?.({ type: 'success', message: 'Archivo subido correctamente' });
        }}
      />

      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        currentPath={currentPath}
        onFolderCreated={() => loadDirectory(currentPath)}
        addToast={addToast}
      />

      <RenameModal
        item={renamingItem}
        isOpen={!!renamingItem}
        onClose={() => setRenamingItem(null)}
        onRenamed={() => loadDirectory(currentPath)}
        addToast={addToast}
      />

      <DeleteConfirmModal
        item={deletingItem}
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onDeleted={() => loadDirectory(currentPath)}
        addToast={addToast}
      />

      {playingMedia && (
        <VideoPlayerModal
          item={playingMedia}
          onClose={() => setPlayingMedia(null)}
        />
      )}
    </div>
  );
}
