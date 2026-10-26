import React, { useState, useRef } from 'react';
import { Film, HardDrive, FolderOpen, RefreshCw, Palette, Users, Search, Shield } from 'lucide-react';
import { CloudMediaLogo } from './CloudMediaLogo';
import { ThemePanel } from './ThemePanel';
import { UserBadge } from '../auth/UserBadge';
import { SearchBar } from '../search/SearchBar';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar({
  activeTab,
  setActiveTab,
  stats,
  isRefreshingStats,
  onRefreshStats,
  onOpenSearch,
  addToast
}) {
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
  const { hasRole } = useAuth();
  const tabsRef = useRef([]);

  const drivePercentage = stats?.googleDrive?.percentage ?? stats?.percentage ?? 0;
  const humanUsed = stats?.googleDrive?.human_used ?? stats?.human_used ?? '0 GB';
  const humanMax = stats?.googleDrive?.human_max ?? stats?.human_max ?? '500 GB';

  const tabs = [
    { id: 'streaming', label: 'Cine & Series', Icon: Film },
    { id: 'explorer', label: 'Explorador', Icon: FolderOpen },
    { id: 'monitoring', label: 'Cuota & Limpieza', Icon: HardDrive }
  ];

  if (hasRole('admin')) {
    tabs.push({ id: 'users', label: 'Administración', Icon: Shield });
  }

  // Quota color semantics
  let quotaAccent = '#10b981'; // green
  if (drivePercentage >= 85) {
    quotaAccent = '#ef4444';
  } else if (drivePercentage >= 70) {
    quotaAccent = '#f59e0b';
  }

  function handleTabKeyDown(e, index) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (index + 1) % tabs.length;
      tabsRef.current[next]?.focus();
      setActiveTab(tabs[next].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (index - 1 + tabs.length) % tabs.length;
      tabsRef.current[prev]?.focus();
      setActiveTab(tabs[prev].id);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass border-b border-theme-border/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand + Nav Tabs */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            {/* Logo */}
            <div
              onClick={() => setActiveTab('streaming')}
              role="button"
              tabIndex={0}
              aria-label="CloudMedia Hub - Ir a Inicio"
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('streaming')}
              className="focus-ring flex items-center gap-2 cursor-pointer group rounded-xl p-1"
            >
              <CloudMediaLogo size={28} variant="logotype" />
            </div>

            {/* Desktop Navigation Tabs */}
            <nav
              role="tablist"
              aria-label="Secciones principales"
              className="hidden lg:flex items-center gap-1 rounded-xl p-1 bg-white/5 border border-white/5"
            >
              {tabs.map(({ id, label, Icon }, index) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    ref={(el) => (tabsRef.current[index] = el)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${id}`}
                    id={`tab-${id}`}
                    onClick={() => setActiveTab(id)}
                    onKeyDown={(e) => handleTabKeyDown(e, index)}
                    className={`focus-ring relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-9 ${
                      isActive
                        ? 'bg-theme-accent text-white shadow-sm'
                        : 'text-theme-muted hover:text-theme-text hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search Bar in middle */}
          <div className="flex-1 max-w-md hidden md:block">
            <SearchBar onClick={onOpenSearch} />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile Search button */}
            <button
              onClick={onOpenSearch}
              className="md:hidden min-h-12 min-w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-theme-muted hover:text-theme-text focus-ring"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4 text-theme-accent" />
            </button>

            {/* Quota pill */}
            <button
              onClick={() => setActiveTab('monitoring')}
              aria-label={`Cuota en la nube: ${humanUsed} de ${humanMax} (${drivePercentage}%). Ir a Monitor`}
              title={`Cuota: ${humanUsed} / ${humanMax} (${drivePercentage}%)`}
              className="focus-ring hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:scale-105 min-h-9"
              style={{
                borderColor: quotaAccent + '40',
                backgroundColor: quotaAccent + '15',
                color: 'var(--color-text)'
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                style={{ backgroundColor: quotaAccent }}
                aria-hidden="true"
              />
              <span className="text-theme-muted hidden xl:inline">Nube:</span>
              <span className="font-bold text-xs" style={{ color: quotaAccent }}>
                {drivePercentage}%
              </span>
              <span className="hidden xl:inline text-theme-muted text-[11px]">
                ({humanUsed})
              </span>
            </button>

            {/* Sync button */}
            <button
              onClick={onRefreshStats}
              disabled={isRefreshingStats}
              aria-label="Sincronizar cuota"
              title="Sincronizar cuota con Google Drive"
              className="focus-ring flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-theme-muted hover:text-theme-text transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshingStats ? 'animate-spin text-theme-accent' : ''}`}
                aria-hidden="true"
              />
            </button>

            {/* Theme button */}
            <button
              onClick={() => setIsThemePanelOpen(true)}
              aria-label="Personalizar tema"
              title="Personalizar tema y apariencia"
              className="focus-ring flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-theme-muted hover:text-theme-accent transition-all active:scale-95"
            >
              <Palette className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            {/* User Badge / Dropdown */}
            <UserBadge addToast={addToast} />
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav
          role="tablist"
          aria-label="Navegación móvil"
          className="lg:hidden flex items-center justify-around py-1.5 border-t border-theme-border/60 text-xs bg-theme-surface/90 backdrop-blur-md"
        >
          {tabs.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                className={`focus-ring flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg min-h-12 justify-center transition-colors ${
                  isActive ? 'text-theme-accent font-semibold' : 'text-theme-muted'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-[11px]">{label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Theme Panel */}
      <ThemePanel isOpen={isThemePanelOpen} onClose={() => setIsThemePanelOpen(false)} />
    </>
  );
}
