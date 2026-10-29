import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  X, Sparkles, Film, FolderOpen,
  Search, Palette, ChevronRight, Wifi
} from 'lucide-react';
import { CloudMediaLogo } from './CloudMediaLogo';

export default function NavbarAside({
  isOpen,
  onClose,
  onOpenSearch,
  onOpenTheme,
  shortcutLabel
}) {
  const location = useLocation();

  if (!isOpen) return null;

  const navLinks = [
    {
      to: '/',
      label: 'Cine & Series',
      description: 'Catálogo de películas, series y anime',
      Icon: Film,
      isActive: location.pathname === '/' || location.pathname.startsWith('/media')
    },
    {
      to: '/explorer',
      label: 'Explorador de Archivos',
      description: 'Navegador de almacenamiento en la nube',
      Icon: FolderOpen,
      isActive: location.pathname.startsWith('/explorer')
    }
  ];

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop con desenfoque suave */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel Lateral Deslizante (Aside) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal de CloudMedia"
        className="fixed top-0 right-0 bottom-0 w-84 sm:w-96 max-w-[88vw] bg-theme-surface/98 border-l border-theme-border shadow-2xl flex flex-col z-50 animate-slide-left pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-theme-text overflow-hidden"
      >
        {/* ================= 1. CABECERA DEL ASIDE ================= */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <CloudMediaLogo size={26} variant="logotype" />
          </div>

          <button
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-muted hover:text-white hover:border-theme-accent transition-colors focus-ring active:scale-95 touch-manipulation"
            aria-label="Cerrar panel lateral"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= CONTENIDO CON SCROLL FLUIDO ================= */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin">

          {/* ================= 2. BOTÓN DESTACADO CLOUDMEDIA (IA) ================= */}
          <div>
            <Link
              to="/chat"
              onClick={onClose}
              className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 text-white font-bold text-xs shadow-xl shadow-red-600/20 border border-white/20 transition-all duration-300 transform active:scale-98 touch-manipulation overflow-hidden"
            >
              <div className="flex items-center gap-3 z-10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
                </div>
                <div>
                  <div className="font-black text-sm tracking-wide">CloudMedIA</div>
                  <div className="text-[10px] text-white/80 font-normal">Asistente cinéfilo con Gemini</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform z-10" />
            </Link>
          </div>

          {/* ================= 3. RUTAS DE NAVEGACIÓN ================= */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-theme-muted px-1 font-bold">
              Navegación Principal
            </div>

            <div className="space-y-1.5">
              {navLinks.map(({ to, label, description, Icon, isActive }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all touch-manipulation ${
                    isActive
                      ? 'bg-theme-accent text-white shadow-md shadow-red-600/20'
                      : 'bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20' : 'bg-white/5 text-theme-accent'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="truncate">{label}</div>
                      <div className={`text-[10px] font-normal truncate ${
                        isActive ? 'text-white/80' : 'text-theme-muted'
                      }`}>
                        {description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-theme-muted'}`} />
                </Link>
              ))}
            </div>
          </div>

          {/* ================= 4. HERRAMIENTAS & AJUSTES ================= */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-theme-muted px-1 font-bold">
              Herramientas & Ajustes
            </div>

            <div className="space-y-1.5">
              {/* Buscador Omnibar */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSearch();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent transition-all touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-theme-accent">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Buscador Global</div>
                    <div className="text-[10px] text-theme-muted">Explorar películas, actores y géneros</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-theme-muted font-bold">
                  {shortcutLabel}
                </span>
              </button>

              {/* Personalizar Tema */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTheme();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent transition-all touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-theme-accent">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Apariencia & Colores</div>
                    <div className="text-[10px] text-theme-muted">Temas Dark, Redflix, Cyberpunk, etc.</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-theme-muted" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= 5. PIE DEL ASIDE ================= */}
        <div className="px-5 py-3.5 border-t border-theme-border bg-theme-surface/90 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] text-theme-muted font-mono px-1">
            <span>CloudMedia Hub v1.0 &bull; Serverless</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3 h-3" />
              Online
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
