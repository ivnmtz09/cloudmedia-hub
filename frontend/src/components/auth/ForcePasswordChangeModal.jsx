import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { changePassword } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export function ForcePasswordChangeModal({ isOpen, onPasswordChanged }) {
  const { user, completePasswordChange } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword === '1234567890') {
      setError('No puedes usar la contraseña temporal predeterminada');
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword({ newPassword });
      if (completePasswordChange) {
        completePasswordChange(result.user);
      }
      if (onPasswordChanged) {
        onPasswordChanged(result.user);
      }
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-theme-surface p-7 border border-amber-500/50 shadow-2xl animate-scale-in text-theme-text">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/15 text-amber-400 mb-3 border border-amber-500/30">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-theme-text">
            Cambio de Contraseña Obligatorio
          </h2>
          <p className="text-xs text-theme-muted mt-1.5 leading-relaxed">
            Cuenta: <strong className="text-theme-text font-mono">{user?.username}</strong>. Por motivos de seguridad del servidor, debes definir una contraseña personalizada antes de ingresar.
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
              Nueva Contraseña (mínimo 8 caracteres)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-theme-muted">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white/5 border border-theme-border/60 text-theme-text text-sm focus-ring placeholder-theme-muted min-h-12"
                placeholder="Ingresa tu nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-theme-muted hover:text-theme-text focus-ring rounded-r-xl"
                aria-label={showNew ? 'Ocultar contraseña' : 'Ver contraseña'}
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
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-theme-muted">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-white/5 border border-theme-border/60 text-theme-text text-sm focus-ring placeholder-theme-muted min-h-12"
                placeholder="Repite la nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-theme-muted hover:text-theme-text focus-ring rounded-r-xl"
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-theme-muted space-y-1">
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${newPassword.length >= 8 ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Al menos 8 caracteres</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Las contraseñas coinciden</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
            className="w-full min-h-12 mt-2 py-3 px-4 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-theme-accent/25 focus-ring disabled:opacity-50"
          >
            {loading ? <span>Actualizando...</span> : <span>Establecer Contraseña e Ingresar</span>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForcePasswordChangeModal;
