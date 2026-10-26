import React from 'react';
import { Search } from 'lucide-react';

export function SearchBar({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="min-h-12 flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-theme-muted hover:text-theme-text transition-all focus-ring text-xs w-full max-w-xs sm:max-w-sm md:max-w-md"
      aria-label="Abrir buscador inteligente"
    >
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-theme-accent" />
        <span className="truncate">Buscar películas, series, anime...</span>
      </div>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/10 text-theme-muted border border-white/10">
        Ctrl+K
      </kbd>
    </button>
  );
}

export default SearchBar;
