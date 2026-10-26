import React from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  const containerRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed & Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-all duration-300 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Solid Focused Dialog Container */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex="-1"
        className={`relative w-full ${maxWidth} bg-theme-surface rounded-2xl border border-theme-border shadow-2xl p-6 text-theme-text z-10 animate-scale-in outline-none focus:ring-1 focus:ring-theme-accent/40`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-theme-border mb-4">
          <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-theme-muted hover:text-white hover:bg-theme-card transition-colors focus-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
