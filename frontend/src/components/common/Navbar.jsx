import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Film, FolderOpen, Search, Menu, X, Sparkles } from 'lucide-react';
import { CloudMediaLogo } from './CloudMediaLogo';
import { ThemePanel } from './ThemePanel';
import { SearchBar } from '../search/SearchBar';
import { ProfileModal } from '../profile/ProfileModal';
import NavbarAside from './NavbarAside';

export default function Navbar({
  stats,
  isRefreshingStats,
  onRefreshStats,
  onOpenSearch,
  addToast
}) {
  const location = useLocation();
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || '');
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl K';

  // Cerrar panel lateral con la tecla Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Bloquear scroll de fondo cuando el panel lateral está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Rutas principales visibles en el centro de la barra (desktop)
  const navLinks = [
    {
      to: '/',
      label: 'Cine & Series',
      Icon: Film,
      isActive: location.pathname === '/' || location.pathname.startsWith('/media')
    },
    {
      to: '/explorer',
      label: 'Explorador',
      Icon: FolderOpen,
      isActive: location.pathname.startsWith('/explorer')
    }
  ];

  const isChatActive = location.pathname === '/chat';

  return (
    <>
      {/* ================= HEADER PRINCIPAL LIVIANO & DESPEJADO ================= */}
      <header className="sticky top-0 z-40 w-full bg-theme-surface/98 backdrop-blur-md border-b border-theme-border shadow-md transition-colors">
        <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* 1. SECCIÓN IZQUIERDA: LOGOTIPO + BADGE EN LÍNEA */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="focus-ring flex items-center gap-2 cursor-pointer group rounded-xl p-1 touch-manipulation"
              aria-label="CloudMedia Hub - Inicio"
            >
              <CloudMediaLogo size={28} variant="logotype" />
            </Link>

            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>En Línea</span>
            </div>
          </div>

          {/* 2. SECCIÓN CENTRAL: RUTAS PRINCIPALES (MD+) */}
          <div className="hidden md:flex items-center justify-center flex-1 px-2">
            <nav
              role="navigation"
              aria-label="Rutas principales"
              className="flex items-center justify-center gap-1.5 rounded-xl p-1 bg-white/5 border border-white/5"
            >
              {navLinks.map(({ to, label, Icon, isActive }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={`focus-ring relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-9 ${
                    isActive
                      ? 'bg-theme-accent text-white shadow-sm'
                      : 'text-theme-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* 3. SECCIÓN DERECHA: BUSCADOR, CLOUDMEDIA Y BURGER MENU */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 min-w-0">
            
            {/* Buscador: Input expandido en pantallas grandes (LG+) */}
            <div className="hidden lg:block w-48 xl:w-64 shrink-0">
              <SearchBar onClick={onOpenSearch} />
            </div>

            {/* Buscador: Botón compacto en tablets y móviles (< LG) */}
            <button
              onClick={onOpenSearch}
              className="lg:hidden min-h-11 min-w-11 sm:min-w-0 sm:px-3 sm:h-10 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-theme-muted hover:text-white focus-ring shrink-0 touch-manipulation active:scale-95"
              aria-label="Buscar películas, series y anime"
              title={`Buscar catálogo (${shortcutLabel})`}
            >
              <Search className="w-4 h-4 text-theme-accent" />
              <span className="hidden sm:inline text-[11px] font-mono text-theme-muted/80">{shortcutLabel}</span>
            </button>

            {/* CloudMedIA en versión desktop/tablet (SM+) */}
            <Link
              to="/chat"
              className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-md shrink-0 touch-manipulation active:scale-95 ${
                isChatActive
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 text-white shadow-red-500/30 ring-2 ring-red-400'
                  : 'bg-gradient-to-r from-red-600/15 via-rose-600/15 to-purple-600/15 hover:from-red-600 hover:to-indigo-600 text-red-400 hover:text-white border border-red-500/30'
              }`}
              title="Conversar con la IA Cinéfila de CloudMedia"
            >
              <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform animate-pulse" />
              <span>CloudMedIA</span>
            </Link>

            {/* CloudMedIA en versión móvil ultra compacta (< SM) */}
            <Link
              to="/chat"
              className={`sm:hidden min-h-11 min-w-11 flex items-center justify-center rounded-xl transition-all duration-300 shadow-md shrink-0 touch-manipulation active:scale-95 ${
                isChatActive
                  ? 'bg-gradient-to-r from-red-600 to-indigo-600 text-white ring-2 ring-red-400'
                  : 'bg-gradient-to-r from-red-600/20 to-purple-600/20 text-red-400 border border-red-500/30'
              }`}
              title="Conversar con CloudMedIA"
              aria-label="CloudMedIA Chat"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </Link>

            {/* BOTÓN BURGER MENU (Abre el Aside con Servidores, Cuota, Perfil, etc.) */}
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú y configuración'}
              className="relative min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent transition-colors focus-ring touch-manipulation active:scale-95 shrink-0"
              title="Menú, servidores y configuración"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-theme-accent" />
              ) : (
                <>
                  <Menu className="w-5 h-5" />
                  {/* Indicador de servidor activo */}
                  <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-theme-card animate-pulse"
                    title="Servidor activo"
                  />
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================= ASIDE LATERAL DESLIZABLE COMPLETO ================= */}
      <NavbarAside
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        stats={stats}
        isRefreshingStats={isRefreshingStats}
        onRefreshStats={onRefreshStats}
        onOpenSearch={onOpenSearch}
        onOpenTheme={() => setIsThemePanelOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        addToast={addToast}
        shortcutLabel={shortcutLabel}
      />

      {/* Modal de Personalización de Tema */}
      <ThemePanel
        isOpen={isThemePanelOpen}
        onClose={() => setIsThemePanelOpen(false)}
      />

      {/* Modal de Edición de Perfil */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        addToast={addToast}
      />
    </>
  );
}
