import React from 'react';
import { Loader2, Check } from 'lucide-react';

/**
 * 4. TRANSFORMATION (MORPHING)
 * Botón que muta su geometría:
 * - 'idle': ancho completo, icono y texto
 * - 'loading': se encoge a círculo con spinner
 * - 'success': muta a check de éxito
 */
export function MorphButton({
  status = 'idle', // 'idle' | 'loading' | 'success'
  onClick,
  disabled = false,
  idleLabel = 'Guardar',
  loadingLabel = 'Procesando...',
  successLabel = 'Completado',
  icon: Icon,
  className = '',
  type = 'button'
}) {
  const isIdle = status === 'idle';
  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`morph-btn min-h-12 flex items-center justify-center font-semibold text-xs transition-all focus-ring ${
        isLoading
          ? 'w-12 h-12 rounded-full bg-theme-accent text-white p-0'
          : isSuccess
          ? 'px-5 py-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
          : `px-5 py-2.5 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white shadow-md shadow-theme-accent/25 ${className}`
      }`}
    >
      {isLoading && (
        <Loader2 className="w-5 h-5 animate-spin" />
      )}

      {isSuccess && (
        <div className="flex items-center gap-1.5 animate-scale-in">
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>{successLabel}</span>
        </div>
      )}

      {isIdle && (
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          <span>{idleLabel}</span>
        </div>
      )}
    </button>
  );
}

export default MorphButton;
