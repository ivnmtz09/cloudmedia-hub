import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Solid Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Solid Dialog container */}
      <div
        className={`relative w-full ${maxWidth} bg-theme-surface rounded-2xl border border-theme-border shadow-2xl p-6 text-theme-text z-10 animate-scale-in`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-theme-border mb-4">
          <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
          <button
            onClick={onClose}
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
