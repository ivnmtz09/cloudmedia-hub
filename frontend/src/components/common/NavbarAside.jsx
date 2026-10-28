import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  X, Sparkles, HardDrive, Film, FolderOpen, Shield,
  Search, Palette, User, LogOut, RefreshCw, ChevronRight,
  Server, Wifi, ExternalLink, Settings, Compass
} from 'lucide-react';
import { CloudMediaLogo } from './CloudMediaLogo';
import ServerSelector from './ServerSelector';
import { useAuth } from '../../contexts/AuthContext';

export default function NavbarAside({
  isOpen,
  onClose,
  stats,
  isRefreshingStats,
  onRefreshStats,
  onOpenSearch,
  onOpenTheme,
  onOpenProfile,
  addToast,
  shortcutLabel
}) {
  const location = useLocation();
  const { user, hasRole, logout, setIsLoginModalOpen } = useAuth();

  if (!isOpen) return null;

  const drivePercentage = stats?.googleDrive?.percentage ?? stats?.percentage ?? 0;
  const humanUsed = stats?.googleDrive?.human_used ?? stats?.human_used ?? '0 GB';
  const humanMax = stats?.googleDrive?.human_max ?? stats?.human_max ?? '500 GB';
  const canAccessStorage = user && (user.role === 'admin' || user.role === 'moderator');

  let quotaAccent = '#10b981';
  if (drivePercentage >= 85) quotaAccent = '#ef4444';
  else if (drivePercentage >= 70) quotaAccent = '#f59e0b';

  const roleLabel = {
    admin: 'Administrador',
    moderator: 'Moderador',
    viewer: 'Usuario'
  }[user?.role] || user?.role || 'Invitado';

  const userInitial = (user?.username || 'U')[0].toUpperCase();

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

  if (canAccessStorage) {
    navLinks.push({
      to: '/quotas',
      label: 'Cuota & Limpieza',
      description: 'Monitoreo de almacenamiento y purga',
      Icon: HardDrive,
      isActive: location.pathname.startsWith('/quotas')
    });
  }

  if (hasRole('admin')) {
    navLinks.push({
      to: '/admin',
      label: 'Administración',
      description: 'Gestión de usuarios y permisos',
      Icon: Shield,
      isActive: location.pathname.startsWith('/admin')
    });
  }

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
      if (addToast) {
        addToast({
          type: 'info',
          title: 'Sesión finalizada',
          message: 'Has cerrado sesión correctamente.'
        });
      }
    } catch (err) {
      console.warn('Error al cerrar sesión:', err);
    }
  };

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
        aria-label="Menú principal y configuración de CloudMedia"
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
          
          {/* ================= 2. PERFIL DE USUARIO ================= */}
          {user ? (
            <div className="p-3.5 rounded-2xl bg-theme-card border border-theme-border shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-theme-accent text-white font-black flex items-center justify-center text-sm shadow-md flex-shrink-0 ring-2 ring-white/10">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{user.username}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-theme-muted uppercase tracking-wider font-semibold">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProfile();
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors focus-ring touch-manipulation"
                title="Editar perfil"
              >
                <User className="w-3.5 h-3.5 text-theme-accent" />
                <span>Perfil</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-theme-card border border-theme-border text-center space-y-2">
              <p className="text-xs text-theme-muted">Inicia sesión para guardar favoritos y sincronizar tu avance.</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsLoginModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Iniciar Sesión
              </button>
            </div>
          )}

          {/* ================= 3. BOTÓN DESTACADO CLOUDMEDIA (IA) ================= */}
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

          {/* ================= 4. CONEXIÓN & DOBLE SERVIDOR (FAILOVER) ================= */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-theme-muted flex items-center gap-1.5 font-bold">
                <Server className="w-3.5 h-3.5 text-theme-accent" />
                Conexión & Failover
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Activo</span>
            </div>
            <div className="p-1 rounded-2xl bg-theme-card border border-theme-border">
              <ServerSelector addToast={addToast} compact={true} />
            </div>
          </div>

          {/* ================= 5. NUBE & ALMACENAMIENTO (GOOGLE DRIVE) ================= */}
          {canAccessStorage && (
            <div className="p-3.5 rounded-2xl bg-theme-card border border-theme-border space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-theme-muted font-semibold">
                  <HardDrive className="w-3.5 h-3.5 text-theme-accent" />
                  <span>Google Drive</span>
                </div>
                <span className="font-bold font-mono text-xs" style={{ color: quotaAccent }}>
                  {drivePercentage}%
                </span>
              </div>

              {/* Barra de progreso visual */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(drivePercentage, 100)}%`,
                    backgroundColor: quotaAccent
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-theme-muted">
                <span className="font-mono">{humanUsed} / {humanMax}</span>
                <button
                  type="button"
                  onClick={onRefreshStats}
                  disabled={isRefreshingStats}
                  className="flex items-center gap-1 text-theme-accent hover:underline disabled:opacity-50 touch-manipulation py-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingStats ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= 6. RUTAS DE NAVEGACIÓN ================= */}
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

          {/* ================= 7. ACCIONES RÁPIDAS & PREFERENCIAS ================= */}
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

        {/* ================= 8. PIE DEL ASIDE (LOGOUT & VERSIÓN) ================= */}
        <div className="px-5 py-3.5 border-t border-theme-border bg-theme-surface/90 space-y-2.5 flex-shrink-0">
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 font-bold text-xs transition-colors touch-manipulation active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          )}

          <div className="flex items-center justify-between text-[10px] text-theme-muted font-mono px-1">
            <span>CloudMedia Hub v1.0</span>
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
