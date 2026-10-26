import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Palette, Check, LayoutGrid, X } from 'lucide-react';

export function ThemePanel({ isOpen, onClose }) {
  const { themeId, changeTheme, gridDensity, setGridDensity, availableThemes } = useTheme();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-panel-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-theme-surface p-6 border border-theme-border shadow-2xl animate-scale-in text-theme-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-theme-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-theme-accent/15 text-theme-accent">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 id="theme-panel-title" className="text-base font-semibold text-theme-text">
                Apariencia y Visualización
              </h2>
              <p className="text-xs text-theme-muted">
                Paletas sólidas y superficies de alta definición
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-12 min-w-12 flex items-center justify-center rounded-lg hover:bg-theme-card text-theme-muted hover:text-theme-text transition-colors focus-ring"
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
                      ? 'border-theme-accent bg-theme-card shadow-sm'
                      : 'border-theme-border hover:border-theme-accent/60 bg-theme-surface hover:bg-theme-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Swatch de fondo y acento sólido */}
                    <div
                      className="w-8 h-8 rounded-lg border border-theme-border flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: t.colors.bg }}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: t.colors.accent }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-theme-text">{t.name}</div>
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
        <div className="mt-6 pt-5 border-t border-theme-border">
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
                    ? 'border-theme-accent bg-theme-card text-theme-accent font-semibold'
                    : 'border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-card'
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
