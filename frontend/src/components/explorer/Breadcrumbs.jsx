import React from 'react';
import { Home, ChevronRight, HardDrive } from 'lucide-react';

export default function Breadcrumbs({ currentPath, onNavigate }) {
  const parts = currentPath ? currentPath.split('/').filter(Boolean) : [];

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto py-1 no-scrollbar">
      <button
        onClick={() => onNavigate('')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:text-white hover:bg-slate-800 transition-colors ${
          parts.length === 0 ? 'text-brand-400 font-bold bg-brand-500/10' : ''
        }`}
      >
        <HardDrive className="w-3.5 h-3.5 text-brand-400" />
        <span>PC_Storage (Raíz)</span>
      </button>

      {parts.map((part, index) => {
        const subPath = parts.slice(0, index + 1).join('/');
        const isLast = index === parts.length - 1;

        return (
          <React.Fragment key={subPath}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <button
              onClick={() => onNavigate(subPath)}
              className={`px-2 py-1 rounded-lg truncate max-w-[150px] transition-colors ${
                isLast
                  ? 'text-white font-semibold bg-slate-800/80 cursor-default'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {part}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
