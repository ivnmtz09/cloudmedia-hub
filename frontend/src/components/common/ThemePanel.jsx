import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Palette, Check, LayoutGrid, X } from 'lucide-react';

export function ThemePanel({ isOpen, onClose }) {
  const { themeId, changeTheme, gridDensity, setGridDensity, availableThemes } = useTheme();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-panel-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl glass p-6 border border-white/10 shadow-2xl animate-scale-in text-theme-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-theme-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-theme-accent/15 text-theme-accent">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 id="theme-panel-title" className="text-base font-semibold text-theme-text">
                Apariencia y Visualización
              </h2>
              <p className="text-xs text-theme-muted">
                Personaliza la paleta cromática y la densidad de grilla
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-12 min-w-12 flex items-center justify-center rounded-lg hover:bg-white/10 text-theme-muted hover:text-theme-text transition-colors focus-ring"
            aria-label="Cerrar panel de apariencia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Temas */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-theme-muted mb-3 block">
            Temas del Sistema
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {availableThemes.map((t) => {
              const isSelected = t.id === themeId;
              return (
                <button
                  key={t.id}
                  onClick={() => changeTheme(t.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 focus-ring min-h-12 ${
                    isSelected
                      ? 'border-theme-accent bg-theme-accent/10 shadow-sm'
                      : 'border-theme-border/60 hover:border-theme-border hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Color Swatch */}
                    <div
                      className="w-7 h-7 rounded-lg border border-white/20 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: t.colors.accent }}
                    />
                    <div>
                      <div className="text-sm font-medium text-theme-text">{t.name}</div>
                      <div className="text-xs text-theme-muted">{t.description}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="p-1 rounded-full bg-theme-accent text-white">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Densidad de Grilla */}
        <div className="mt-6 pt-5 border-t border-theme-border/60">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-theme-muted flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Densidad de Contenido
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'compact', label: 'Compacta', cols: '4 columnas' },
              { id: 'normal', label: 'Normal', cols: '3 columnas' },
              { id: 'spacious', label: 'Amplia', cols: '2 columnas' }
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setGridDensity(d.id)}
                className={`min-h-12 p-2.5 rounded-xl border text-center transition-all focus-ring ${
                  gridDensity === d.id
                    ? 'border-theme-accent bg-theme-accent/15 text-theme-accent font-semibold'
                    : 'border-theme-border/60 text-theme-muted hover:text-theme-text hover:bg-white/5'
                }`}
              >
                <div className="text-xs">{d.label}</div>
                <div className="text-[10px] opacity-75">{d.cols}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThemePanel;
