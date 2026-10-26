import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, User, Shield, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 obscure-backdrop bg-black/80 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl glass p-7 border border-white/10 shadow-2xl animate-scale-in text-theme-text">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 rounded-2xl bg-theme-accent/15 text-theme-accent mb-3 border border-theme-accent/20">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-theme-text">
            Autenticación CloudMedia
          </h2>
          <p className="text-xs text-theme-muted mt-1 leading-relaxed">
            Ingresa tus credenciales autorizadas para acceder a la plataforma
          </p>
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
                autoComplete="username"
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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white/5 border border-theme-border/60 text-theme-text text-sm focus-ring placeholder-theme-muted min-h-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-theme-muted hover:text-theme-text focus-ring rounded-r-xl"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
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
