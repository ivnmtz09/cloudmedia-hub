import React, { useState } from 'react';
import { Plus, Film, Tv, Sparkles, X, UploadCloud } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 8. CLONING
 * Botón flotante de subida que se desdobla/clona en 3 acciones:
 * - Película
 * - Serie
 * - Anime
 */
export function FloatingUploadFab({ onOpenUpload }) {
  const [isOpen, setIsOpen] = useState(false);
  const { hasMinRole } = useAuth();

  // Solo visible para moderator y admin
  if (!hasMinRole('moderator')) return null;

  const actions = [
    {
      id: 'pelicula',
      label: 'Subir Película',
      icon: Film,
      color: 'bg-brand-500 hover:bg-brand-600',
      delay: '0ms'
    },
    {
      id: 'serie',
      label: 'Subir Serie',
      icon: Tv,
      color: 'bg-indigo-600 hover:bg-indigo-500',
      delay: '50ms'
    },
    {
      id: 'anime',
      label: 'Subir Anime',
      icon: Sparkles,
      color: 'bg-purple-600 hover:bg-purple-500',
      delay: '100ms'
    }
  ];

  const handleActionClick = (contentType) => {
    setIsOpen(false);
    if (onOpenUpload) onOpenUpload(contentType);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 select-none">
      {/* 8. CLONING: Botones hijos desdoblados del botón padre */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2.5 mb-1">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => handleActionClick(act.id)}
                style={{ animationDelay: act.delay }}
                className={`animate-clone-spawn flex items-center gap-2.5 pl-3.5 pr-4 py-2 rounded-2xl ${act.color} text-white text-xs font-semibold shadow-xl shadow-black/40 transition-transform hover:scale-105 active:scale-95 focus-ring min-h-12`}
              >
                <Icon className="w-4 h-4" />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Botón Principal Padre */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Cerrar opciones de subida' : 'Opciones de subida rápida'}
        aria-expanded={isOpen}
        title="Subida Rápida (Película, Serie, Anime)"
        className={`min-h-14 min-w-14 rounded-2xl bg-theme-accent hover:bg-theme-accent-hover text-white flex items-center justify-center shadow-2xl shadow-theme-accent/30 transition-all duration-300 transform active:scale-90 focus-ring ${
          isOpen ? 'rotate-45 bg-red-600 hover:bg-red-500' : ''
        }`}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}

export default FloatingUploadFab;
