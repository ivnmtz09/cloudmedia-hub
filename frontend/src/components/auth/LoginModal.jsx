import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, User, KeyRound, Shield, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin2026');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl glass p-7 border border-white/10 shadow-2xl animate-scale-in text-theme-text">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-theme-accent/15 text-theme-accent mb-3 border border-theme-accent/20">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-theme-text">
            Autenticación CloudMedia
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Ingresa tus credenciales para acceder a tu catálogo y permisos
          </p>
        </div>

        {/* Quick Session Presets */}
        <div className="mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted mb-2 text-center">
            Acceso Rápido por Rol
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Admin', u: 'admin', p: 'admin2026', role: 'admin' },
              { label: 'Moderador', u: 'moder', p: 'moder2026', role: 'moderator' },
              { label: 'Usuario', u: 'usuario', p: 'user2026', role: 'viewer' }
            ].map((preset) => (
              <button
                key={preset.role}
                type="button"
                onClick={() => setPreset(preset.u, preset.p)}
                className={`min-h-12 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all text-center focus-ring ${
                  username === preset.u
                    ? 'border-theme-accent bg-theme-accent/15 text-theme-accent'
                    : 'border-theme-border/60 text-theme-muted hover:text-theme-text hover:bg-white/5'
                }`}
              >
                <div>{preset.label}</div>
                <div className="text-[10px] opacity-75 font-mono">{preset.u}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-theme-muted mb-1.5">
              Usuario
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-theme-border/60 text-theme-text text-sm focus-ring placeholder-theme-muted min-h-12"
                placeholder="Nombre de usuario"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-theme-muted mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-theme-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-theme-border/60 text-theme-text text-sm focus-ring placeholder-theme-muted min-h-12"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 mt-2 py-3 px-4 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-theme-accent/25 focus-ring disabled:opacity-50"
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;
