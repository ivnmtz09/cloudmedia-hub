import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isInfo = !isSuccess && !isError;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border shadow-2xl transition-all duration-300 animate-slide-up ${
              isSuccess
                ? 'bg-[#064e3b] border-emerald-500 text-emerald-100'
                : isError
                ? 'bg-[#450a0a] border-red-500 text-red-100'
                : 'bg-theme-surface border-theme-border text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {isError && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
              {isInfo && <Info className="w-5 h-5 text-theme-accent shrink-0" />}
              <div>
                {toast.title && <p className="font-semibold text-sm leading-tight">{toast.title}</p>}
                <p className="text-xs text-slate-300 mt-0.5 leading-normal">{toast.message}</p>
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
