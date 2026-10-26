import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, LogOut, RefreshCw, Shield, ChevronDown } from 'lucide-react';

export function UserBadge() {
  const { user, logout, setIsLoginModalOpen } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        onClick={() => setIsLoginModalOpen(true)}
        className="min-h-12 px-3 py-1.5 rounded-xl bg-theme-accent text-white text-xs font-semibold hover:bg-theme-accent-hover transition-colors flex items-center gap-1.5 focus-ring"
      >
        <User className="w-4 h-4" />
        <span>Acceder</span>
      </button>
    );
  }

  const roleColors = {
    admin: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    moderator: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    viewer: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  };

  const roleLabel = {
    admin: 'Admin',
    moderator: 'Moderador',
    viewer: 'Usuario'
  }[user.role] || user.role;

  const initial = (user.username || 'U')[0].toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="min-h-12 flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 transition-all text-theme-text focus-ring"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-lg bg-theme-accent flex items-center justify-center text-white font-bold text-xs shadow">
          {initial}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold leading-tight text-theme-text">{user.username}</div>
          <span
            className={`inline-block text-[10px] font-mono px-1.5 py-0.2 rounded border ${
              roleColors[user.role] || roleColors.viewer
            }`}
          >
            {roleLabel}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-theme-muted" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl glass border border-white/10 shadow-2xl p-2 z-50 animate-scale-in text-theme-text">
          <div className="px-3 py-2 border-b border-white/10 mb-1">
            <div className="text-xs font-semibold text-theme-text">{user.username}</div>
            <div className="text-[11px] text-theme-muted flex items-center gap-1 mt-0.5">
              <Shield className="w-3 h-3 text-theme-accent" />
              <span>Rol: {roleLabel}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setDropdownOpen(false);
              setIsLoginModalOpen(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-theme-text hover:bg-white/10 transition-colors text-left"
          >
            <RefreshCw className="w-3.5 h-3.5 text-theme-muted" />
            <span>Cambiar de cuenta</span>
          </button>

          <button
            onClick={() => {
              setDropdownOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default UserBadge;
