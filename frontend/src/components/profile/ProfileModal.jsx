import React, { useState, useEffect } from 'react';
import {
  User, Shield, KeyRound, Clock, Film, Check, AlertCircle, X,
  Save, Eye, EyeOff, BarChart2, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile, changePassword, fetchProfileStats } from '../../services/api';

export function ProfileModal({ isOpen, onClose, addToast }) {
  const { user, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'security' | 'stats'

  // Account form
  const [username, setUsername] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Errors & success
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'stats') {
      setLoadingStats(true);
      fetchProfileStats()
        .then((data) => setStats(data.stats))
        .catch(() => setStats(null))
        .finally(() => setLoadingStats(false));
    }
  }, [isOpen, activeTab]);

  if (!isOpen || !user) return null;

  const roleLabel = {
    admin: 'Administrador Principal',
    moderator: 'Moderador de Contenido',
    viewer: 'Usuario Estándar'
  }[user.role] || user.role;

  const roleBadgeStyle = {
    admin: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    moderator: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    viewer: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }[user.role] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (username.trim().length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const data = await updateProfile({ username: username.trim() });
      updateUserProfile(data.user);
      setSuccess('Nombre de usuario actualizado con éxito');
      if (addToast) addToast({ type: 'success', title: 'Perfil actualizado', message: 'Datos guardados correctamente' });
    } catch (err) {
      setError(err.message || 'Error al actualizar perfil');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las nuevas contraseñas no coinciden');
      return;
    }

    setIsChangingPass(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess('Contraseña modificada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (addToast) addToast({ type: 'success', title: 'Seguridad', message: 'Contraseña actualizada' });
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-2xl bg-theme-surface p-6 border border-theme-border shadow-2xl animate-scale-in text-theme-text max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-theme-border/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-theme-accent text-white flex items-center justify-center font-bold text-base shadow-md">
              {(user.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-theme-text flex items-center gap-2">
                <span>Mi Perfil</span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${roleBadgeStyle}`}>
                  {user.role}
                </span>
              </h2>
              <p className="text-xs text-theme-muted mt-0.5">{roleLabel}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar perfil"
            className="min-h-12 min-w-12 flex items-center justify-center rounded-xl hover:bg-white/10 text-theme-muted hover:text-theme-text transition-colors focus-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 border-b border-theme-border/40 my-4 text-xs">
          {[
            { id: 'account', label: 'Cuenta & Datos', icon: User },
            { id: 'security', label: 'Seguridad', icon: KeyRound },
            { id: 'stats', label: 'Estadísticas', icon: BarChart2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 font-semibold transition-all border-b-2 -mb-[2px] ${
                  isActive
                    ? 'border-theme-accent text-theme-accent'
                    : 'border-transparent text-theme-muted hover:text-theme-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* TAB 1: DATOS DE CUENTA */}
        {activeTab === 'account' && (
          <form onSubmit={handleUpdateUsername} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-medium text-theme-muted mb-1.5">
                Nombre de Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-theme-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-theme-border/60 text-theme-text text-sm focus-ring placeholder-theme-muted min-h-12"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-theme-muted">
                <span>Rol de Seguridad:</span>
                <span className="font-semibold text-theme-text uppercase">{user.role}</span>
              </div>
              <div className="flex justify-between text-theme-muted">
                <span>Identificador de Cuenta:</span>
                <span className="font-mono text-theme-text">#{user.id}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUpdatingProfile || username.trim() === user.username}
                className="min-h-12 px-5 py-2.5 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-semibold transition-all shadow-md flex items-center gap-2 focus-ring disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isUpdatingProfile ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: SEGURIDAD (CAMBIO DE CONTRASEÑA) */}
        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-medium text-theme-muted mb-1.5">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-white/5 border border-theme-border/60 text-theme-text text-sm focus-ring min-h-12"
                  placeholder="Tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-theme-muted hover:text-theme-text"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-muted mb-1.5">
                Nueva Contraseña (mínimo 8 caracteres)
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-white/5 border border-theme-border/60 text-theme-text text-sm focus-ring min-h-12"
                  placeholder="Nueva contraseña segura"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-theme-muted hover:text-theme-text"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-muted mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-white/5 border border-theme-border/60 text-theme-text text-sm focus-ring min-h-12"
                  placeholder="Repite la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-theme-muted hover:text-theme-text"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isChangingPass || newPassword.length < 8 || newPassword !== confirmPassword}
                className="min-h-12 px-5 py-2.5 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs font-semibold transition-all shadow-md flex items-center gap-2 focus-ring disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isChangingPass ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: ESTADÍSTICAS PERSONALES */}
        {activeTab === 'stats' && (
          <div className="space-y-4 animate-fade-in">
            {loadingStats ? (
              <div className="py-12 text-center text-xs text-theme-muted">
                Cargando estadísticas de reproducción...
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-xl font-bold font-mono text-theme-accent">{stats.totalVideos}</div>
                    <div className="text-[10px] uppercase font-semibold text-theme-muted mt-0.5">Iniciados</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-xl font-bold font-mono text-emerald-400">{stats.completedVideos}</div>
                    <div className="text-[10px] uppercase font-semibold text-theme-muted mt-0.5">Completados</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-xl font-bold font-mono text-amber-400">{stats.totalWatchedFormatted}</div>
                    <div className="text-[10px] uppercase font-semibold text-theme-muted mt-0.5">Tiempo Total</div>
                  </div>
                </div>

                {stats.recentItems && stats.recentItems.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-theme-muted mb-2">
                      Historial Reciente de Reproducción
                    </div>
                    <div className="space-y-2">
                      {stats.recentItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate max-w-[280px]">
                            <Film className="w-4 h-4 text-theme-accent shrink-0" />
                            <span className="truncate text-slate-200">{item.path.split('/').pop()}</span>
                          </div>
                          <span className="font-mono text-theme-muted text-[11px] shrink-0">
                            {item.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-xs text-theme-muted">
                No hay registros de reproducción recientes para esta cuenta.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileModal;
