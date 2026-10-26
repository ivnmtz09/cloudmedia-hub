import React, { useState } from 'react';
import { Server, RefreshCw, AlertCircle } from 'lucide-react';

export default function ServerOfflineFallback({ onRetry }) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryFailed(false);
    try {
      const ok = await onRetry();
      if (!ok) {
        setRetryFailed(true);
      }
    } catch {
      setRetryFailed(true);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] h-screen w-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
      <div className="max-w-md w-full flex flex-col items-center space-y-6">
        {/* Icono minimalista de servidor / estado */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gray-800 border border-gray-700/80 flex items-center justify-center shadow-2xl">
            <Server className="w-10 h-10 text-gray-400" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-gray-900 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          </span>
        </div>

        {/* Mensaje centrado y minimalista */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-100">
            Servidor local apagado. Enciende la PC base para acceder a CloudMedia
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            No se pudo conectar con el servidor local en este momento.
          </p>
        </div>

        {/* Botón de reintento */}
        <div className="pt-2 w-full flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-xl shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Comprobando conexión...' : 'Reintentar conexión'}</span>
          </button>

          {retryFailed && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>El servidor sigue sin responder. Verifica que la PC base esté encendida.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
