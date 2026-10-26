import React, { useState, useRef, useEffect } from 'react';
import {
  Film, HardDrive, FolderOpen, RefreshCw, Palette, Shield,
  Search, Menu, X, User, LogOut, ChevronRight, Sliders
} from 'lucide-react';
import { CloudMediaLogo } from './CloudMediaLogo';
import { ThemePanel } from './ThemePanel';
import { UserBadge } from '../auth/UserBadge';
import { SearchBar } from '../search/SearchBar';
import { ProfileModal } from '../profile/ProfileModal';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar({
  activeTab,
  setActiveTab,
  stats,
  isRefreshingStats,
  onRefreshStats,
  onOpenSearch,
  addToast
}) {
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const tabsRef = useRef([]);

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

  const tabs = [
    { id: 'streaming', label: 'Cine & Series', Icon: Film },
    { id: 'explorer', label: 'Explorador', Icon: FolderOpen }
  ];

  if (canAccessStorage) {
    tabs.push({ id: 'monitoring', label: 'Cuota & Limpieza', Icon: HardDrive });
  }

  if (hasRole('admin')) {
    tabs.push({ id: 'users', label: 'Administración', Icon: Shield });
  }

  // Bottom navigation items (exactly 4 items, no redundant search button)
  const bottomNavItems = [
    {
      id: 'streaming',
      label: 'Cine',
      Icon: Film,
      action: () => setActiveTab('streaming'),
      isActive: activeTab === 'streaming'
    },
    {
      id: 'explorer',
      label: 'Archivos',
      Icon: FolderOpen,
      action: () => setActiveTab('explorer'),
      isActive: activeTab === 'explorer'
    }
  ];

  if (canAccessStorage) {
    bottomNavItems.push({
      id: 'monitoring',
      label: 'Cuota',
      Icon: HardDrive,
      action: () => setActiveTab('monitoring'),
      isActive: activeTab === 'monitoring'
    });
  }

  if (hasRole('admin')) {
    bottomNavItems.push({
      id: 'users',
      label: 'Admin',
      Icon: Shield,
      action: () => setActiveTab('users'),
      isActive: activeTab === 'users'
    });
  } else {
    bottomNavItems.push({
      id: 'menu',
      label: 'Menú',
      Icon: Menu,
      action: () => setIsMobileMenuOpen(true),
      isActive: isMobileMenuOpen
    });
  }

  // Quota color semantics
  let quotaAccent = '#10b981'; // green
  if (drivePercentage >= 85) {
    quotaAccent = '#ef4444';
  } else if (drivePercentage >= 70) {
    quotaAccent = '#f59e0b';
  }

  function handleTabKeyDown(e, index) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (index + 1) % tabs.length;
      tabsRef.current[next]?.focus();
      setActiveTab(tabs[next].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (index - 1 + tabs.length) % tabs.length;
      tabsRef.current[prev]?.focus();
      setActiveTab(tabs[prev].id);
    }
  }

  const roleLabel = {
    admin: 'Admin',
    moderator: 'Moderador',
    viewer: 'Usuario'
  }[user?.role] || user?.role || 'Invitado';

  const userInitial = (user?.username || 'U')[0].toUpperCase();

  return (
    <>
      {/* ================= HEADER PRINCIPAL FULL-WIDTH ================= */}
      <header className="sticky top-0 z-40 w-full bg-theme-surface border-b border-theme-border shadow-md transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-3">
          
          {/* 1. SECCIÓN IZQUIERDA: LOGOTIPO + ESTADO */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              onClick={() => setActiveTab('streaming')}
              role="button"
              tabIndex={0}
              aria-label="CloudMedia Hub - Ir a Inicio"
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('streaming')}
              className="focus-ring flex items-center gap-2 cursor-pointer group rounded-xl p-1"
            >
              <CloudMediaLogo size={28} variant="logotype" />
            </div>

            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>En Línea</span>
            </div>
          </div>

          {/* 2. SECCIÓN CENTRAL: PESTAÑAS DE NAVEGACIÓN CENTRADAS NATURALMENTE */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-2">
            <nav
              role="tablist"
              aria-label="Secciones principales"
              className="flex items-center justify-center gap-1.5 rounded-xl p-1 bg-white/5 border border-white/5"
            >
              {tabs.map(({ id, label, Icon }, index) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    ref={(el) => (tabsRef.current[index] = el)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${id}`}
                    id={`tab-${id}`}
                    onClick={() => setActiveTab(id)}
                    onKeyDown={(e) => handleTabKeyDown(e, index)}
                    className={`focus-ring relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-9 ${
                      isActive
                        ? 'bg-theme-accent text-white shadow-sm'
                        : 'text-theme-muted hover:text-theme-text hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 3. SECCIÓN DERECHA: BÚSQUEDA, CUOTA, TEMA, USUARIO Y BURGER MENU */}
          <div className="flex items-center justify-end gap-2 sm:gap-2.5 flex-shrink-0 min-w-0">
            {/* Buscador inteligente en desktop (md+) */}
            <div className="w-36 sm:w-44 md:w-48 lg:w-56 xl:w-64 hidden md:block flex-shrink min-w-0">
              <SearchBar onClick={onOpenSearch} />
            </div>

            {/* Botón de búsqueda exclusivo para móvil (arriba) */}
            <button
              onClick={onOpenSearch}
              className="md:hidden min-h-10 min-w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-theme-muted hover:text-theme-text focus-ring flex-shrink-0"
              aria-label="Buscar películas, series y anime"
              title="Buscar (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-theme-accent" />
            </button>

            {/* Píldora de cuota en Google Drive y botón de sincronización (solo admin o moderator) */}
            {canAccessStorage && (
              <>
                <button
                  onClick={() => setActiveTab('monitoring')}
                  aria-label={`Cuota en la nube: ${humanUsed} de ${humanMax} (${drivePercentage}%). Ir a Monitor`}
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
                </button>

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

            {/* Selector de Tema */}
            <button
              onClick={() => setIsThemePanelOpen(true)}
              aria-label="Personalizar tema"
              title="Personalizar tema y apariencia"
              className="focus-ring flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-theme-muted hover:text-theme-accent transition-all active:scale-95"
            >
              <Palette className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            {/* Badge de usuario en pantallas grandes */}
            <div className="hidden sm:block">
              <UserBadge addToast={addToast} />
            </div>

            {/* Botón Burger Menu para dispositivos móviles/tablets */}
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
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
          {/* Backdrop con cierre */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Panel Deslizable Lateral Sólido */}
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

              {/* Barra de progreso sólida */}
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

            {/* Enlaces de Navegación del Sistema */}
            <div className="flex-1 space-y-1.5 mb-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-theme-muted px-1 mb-2">
                Navegación
              </div>

              {tabs.map(({ id, label, Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      setIsMobileMenuOpen(false);
                    }}
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
                  </button>
                );
              })}

              {/* Botón de búsqueda en Drawer */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSearch();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-theme-card border border-theme-border text-theme-text hover:border-theme-accent transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 text-theme-accent" />
                  <span>Buscar Multimedia</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-theme-muted">
                  Ctrl+K
                </span>
              </button>

              {/* Botón de personalización de tema */}
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

            {/* Logout en pie de drawer */}
            {user && (
              <button
                onClick={async () => {
                  setIsMobileMenuOpen(false);
                  await logout();
                  addToast({
                    type: 'info',
                    title: 'Sesión Finalizada',
                    message: 'Has vuelto a la página principal de CloudMedia Hub'
                  });
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold transition-colors focus-ring"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </aside>
        </div>
      )}

      {/* ================= TOPBAR INFERIOR (BOTTOM NAV CON 4 ITEMS) ================= */}
      <nav
        role="navigation"
        aria-label="Barra de navegación inferior móvil"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-theme-surface border-t border-theme-border shadow-2xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4 h-16 max-w-full items-center">
          {bottomNavItems.map(({ id, label, Icon, action, isActive }) => (
            <button
              key={id}
              onClick={action}
              id={`mobile-tab-${id}`}
              aria-label={label}
              className={`flex flex-col items-center justify-center gap-1 h-full min-h-12 transition-all focus-ring ${
                isActive
                  ? 'text-theme-accent font-bold'
                  : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? 'w-8 h-8 bg-theme-card border border-theme-border text-theme-accent'
                    : 'w-7 h-7'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className={`text-[10px] tracking-tight leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modal de Tema y Perfil */}
      <ThemePanel isOpen={isThemePanelOpen} onClose={() => setIsThemePanelOpen(false)} />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        addToast={addToast}
      />
    </>
  );
}
