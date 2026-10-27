import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Film, HardDrive, FolderOpen, RefreshCw, Palette, Shield,
  Search, Menu, X, User, LogOut, ChevronRight, Sparkles, MessageSquare
} from 'lucide-react';
import { CloudMediaLogo } from './CloudMediaLogo';
import { ThemePanel } from './ThemePanel';
import { UserBadge } from '../auth/UserBadge';
import { SearchBar } from '../search/SearchBar';
import { ProfileModal } from '../profile/ProfileModal';
import ServerSelector from './ServerSelector';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar({
  stats,
  isRefreshingStats,
  onRefreshStats,
  onOpenSearch,
  addToast
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, hasRole } = useAuth();

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || '');
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl K';

  const drivePercentage = stats?.googleDrive?.percentage ?? stats?.percentage ?? 0;
  const humanUsed = stats?.googleDrive?.human_used ?? stats?.human_used ?? '0 GB';
  const humanMax = stats?.googleDrive?.human_max ?? stats?.human_max ?? '500 GB';

  // Close mobile drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Lock body scroll when mobile drawer is open
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

  const canAccessStorage = user && (user.role === 'admin' || user.role === 'moderator');

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

  if (canAccessStorage) {
    navLinks.push({
      to: '/quotas',
      label: 'Cuota & Limpieza',
      Icon: HardDrive,
      isActive: location.pathname.startsWith('/quotas')
    });
  }

  if (hasRole('admin')) {
    navLinks.push({
      to: '/admin',
      label: 'Administración',
      Icon: Shield,
      isActive: location.pathname.startsWith('/admin')
    });
  }

  // Quota color semantics
  let quotaAccent = '#10b981'; // green
  if (drivePercentage >= 85) {
    quotaAccent = '#ef4444';
  } else if (drivePercentage >= 70) {
    quotaAccent = '#f59e0b';
  }

  const roleLabel = {
    admin: 'Admin',
    moderator: 'Moderador',
    viewer: 'Usuario'
  }[user?.role] || user?.role || 'Invitado';

  const userInitial = (user?.username || 'U')[0].toUpperCase();

  const isChatActive = location.pathname === '/chat';

  return (
    <>
      {/* ================= HEADER PRINCIPAL FULL-WIDTH ================= */}
      <header className="sticky top-0 z-40 w-full bg-theme-surface/95 backdrop-blur-md border-b border-theme-border shadow-md transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-3">
          
          {/* 1. SECCIÓN IZQUIERDA: LOGOTIPO + ESTADO */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              to="/"
              className="focus-ring flex items-center gap-2 cursor-pointer group rounded-xl p-1"
              aria-label="CloudMedia Hub - Inicio"
            >
              <CloudMediaLogo size={28} variant="logotype" />
            </Link>

            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>En Línea</span>
            </div>
          </div>

          {/* 2. SECCIÓN CENTRAL: RUTAS DE NAVEGACIÓN */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-2">
            <nav
              role="navigation"
              aria-label="Rutas principales"
              className="flex items-center justify-center gap-1.5 rounded-xl p-1 bg-white/5 border border-white/5"
            >
              {navLinks.map(({ to, label, Icon, isActive }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={`focus-ring relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-9 ${
                    isActive
                      ? 'bg-theme-accent text-white shadow-sm'
                      : 'text-theme-muted hover:text-theme-text hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* 3. SECCIÓN DERECHA: CLOUDMEDIA BOTÓN, BUSCADOR, CUOTA, TEMA Y PERFIL */}
          <div className="flex items-center justify-end gap-2 sm:gap-2.5 flex-shrink-0 min-w-0">
            {/* BOTÓN ELEGANTE DE "CloudMedIA" (REUBICADO AL NAVBAR) */}
            <Link
              to="/chat"
              className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-md ${
                isChatActive
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 text-white shadow-red-500/30 ring-2 ring-red-400'
                  : 'bg-gradient-to-r from-red-600/15 via-rose-600/15 to-purple-600/15 hover:from-red-600 hover:to-indigo-600 text-red-400 hover:text-white border border-red-500/30'
              }`}
              title="Conversar con la IA Cinéfila de CloudMedia"
            >
              <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform animate-pulse" />
              <span>CloudMedIA</span>
            </Link>

            {/* Buscador inteligente en desktop (md+) */}
            <div className="w-36 sm:w-44 md:w-48 lg:w-56 xl:w-64 hidden md:block flex-shrink min-w-0">
              <SearchBar onClick={onOpenSearch} />
            </div>

            {/* Botón de búsqueda para móvil */}
            <button
              onClick={onOpenSearch}
              className="md:hidden min-h-10 px-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-theme-muted hover:text-theme-text focus-ring flex-shrink-0"
              aria-label="Buscar películas, series y anime"
              title={`Buscar catálogo (${shortcutLabel})`}
            >
              <Search className="w-4 h-4 text-theme-accent" />
              <span className="text-[10px] font-mono text-theme-muted/80">{shortcutLabel}</span>
            </button>

            {/* Píldora de cuota en Google Drive */}
            {canAccessStorage && (
              <>
                <Link
                  to="/quotas"
                  aria-label={`Cuota en la nube: ${humanUsed} de ${humanMax} (${drivePercentage}%). Ir a Cuota`}
                  title={`Cuota: ${humanUsed} / ${humanMax} (${drivePercentage}%)`}
                  className="focus-ring hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:scale-105 h-9 flex-shrink-0 whitespace-nowrap"
                  style={{
                    borderColor: quotaAccent + '40',
                    backgroundColor: quotaAccent + '15',
                    color: 'var(--color-text)'
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                    style={{ backgroundColor: quotaAccent }}
                    aria-hidden="true"
                  />
                  <span className="text-theme-muted hidden 2xl:inline">Nube:</span>
                  <span className="font-bold text-xs" style={{ color: quotaAccent }}>
                    {drivePercentage}%
                  </span>
                  <span className="hidden 2xl:inline text-theme-muted text-[11px]">
                    ({humanUsed})
                  </span>
                </Link>

                {/* Sincronización manual de cuota */}
                <button
                  onClick={onRefreshStats}
                  disabled={isRefreshingStats}
                  aria-label="Sincronizar cuota"
                  title="Sincronizar cuota con Google Drive"
                  className="focus-ring hidden sm:flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-theme-muted hover:text-theme-text transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshingStats ? 'animate-spin text-theme-accent' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </>
            )}

            {/* Selector de Doble Servidor / Failover (🟢 Local / 🟢 VPS) */}
            <div className="hidden sm:block flex-shrink-0">
              <ServerSelector addToast={addToast} />
            </div>

            {/* Selector de Tema */}
            <button
              onClick={() => setIsThemePanelOpen(true)}
              aria-label="Personalizar tema"
              title="Personalizar tema y apariencia"
              className="focus-ring flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-theme-muted hover:text-theme-accent transition-all active:scale-95"
            >
              <Palette className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            {/* Badge de usuario en desktop */}
            <div className="hidden sm:block">
              <UserBadge addToast={addToast} />
            </div>

            {/* Botón Burger Menu para móvil */}
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="lg:hidden min-h-10 min-w-10 flex items-center justify-center rounded-xl bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent transition-colors focus-ring"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-theme-accent" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================= BURGER MENU DRAWER MÓVIL ================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-label="Menú principal de navegación"
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-theme-surface border-l border-theme-border z-50 flex flex-col p-5 shadow-2xl overflow-y-auto"
          >
            {/* Header del Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-theme-border mb-4">
              <CloudMediaLogo size={24} variant="logotype" />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-theme-card border border-theme-border flex items-center justify-center text-theme-muted hover:text-theme-text focus-ring"
                aria-label="Cerrar panel móvil"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CloudMedIA en Drawer */}
            <Link
              to="/chat"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 text-white font-bold text-xs shadow-lg mb-4"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Hablar con CloudMedIA</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/80" />
            </Link>

            {/* Perfil del Usuario Activo */}
            {user && (
              <div className="p-3.5 rounded-xl bg-theme-card border border-theme-border mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-theme-accent text-white font-bold flex items-center justify-center text-sm shadow flex-shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-theme-text truncate">{user.username}</div>
                    <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-theme-muted uppercase tracking-wider">
                      {roleLabel}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsProfileOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-theme-text flex items-center gap-1 focus-ring"
                >
                  <User className="w-3 h-3 text-theme-accent" />
                  <span>Perfil</span>
                </button>
              </div>
            )}

            {/* Tarjeta de Cuota de Google Drive */}
            <div className="p-3.5 rounded-xl bg-theme-card border border-theme-border mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-1.5 text-theme-muted">
                  <HardDrive className="w-3.5 h-3.5 text-theme-accent" />
                  <span>Almacenamiento Nube</span>
                </div>
                <span className="font-bold text-xs" style={{ color: quotaAccent }}>
                  {drivePercentage}%
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(drivePercentage, 100)}%`,
                    backgroundColor: quotaAccent
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-theme-muted">
                <span>{humanUsed} de {humanMax}</span>
                <button
                  onClick={onRefreshStats}
                  disabled={isRefreshingStats}
                  className="flex items-center gap-1 text-theme-accent hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingStats ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
              </div>
            </div>

            {/* Selector de Servidor para móvil */}
            <div className="mb-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-theme-muted px-1 mb-2">
                Servidor Activo (Failover)
              </div>
              <ServerSelector addToast={addToast} compact={true} />
            </div>

            {/* Enlaces de Navegación del Sistema */}
            <div className="flex-1 space-y-1.5 mb-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-theme-muted px-1 mb-2">
                Navegación
              </div>

              {navLinks.map(({ to, label, Icon, isActive }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-theme-accent text-white shadow-sm'
                      : 'bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-theme-muted'}`} />
                </Link>
              ))}

              {/* Botón de búsqueda en Drawer */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSearch();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent transition-all"
                title={`Buscar en catálogo (${shortcutLabel})`}
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 text-theme-accent" />
                  <span>Buscar Multimedia</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-theme-muted">
                  {shortcutLabel}
                </span>
              </button>

              {/* Personalizar tema */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsThemePanelOpen(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Palette className="w-4 h-4 text-theme-accent" />
                  <span>Personalizar Tema</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-theme-muted" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Modal de Tema */}
      <ThemePanel
        isOpen={isThemePanelOpen}
        onClose={() => setIsThemePanelOpen(false)}
      />

      {/* Modal de Perfil */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        addToast={addToast}
      />
    </>
  );
}
