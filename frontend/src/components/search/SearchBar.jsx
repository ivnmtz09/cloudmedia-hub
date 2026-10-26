import React from 'react';
import { Search } from 'lucide-react';

export function SearchBar({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-9 w-full flex items-center justify-between gap-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-theme-muted hover:text-theme-text transition-all focus-ring text-xs overflow-hidden"
      aria-label="Abrir buscador inteligente"
      title="Buscar en el catálogo (Ctrl+K)"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        <Search className="w-3.5 h-3.5 text-theme-accent flex-shrink-0" />
        <span className="truncate text-xs text-left select-none">
          Buscar multimedia...
        </span>
      </div>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/10 text-theme-muted border border-white/10 flex-shrink-0 select-none">
        Ctrl+K
      </kbd>
    </button>
  );
}

export default SearchBar;
