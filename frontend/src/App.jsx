import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/common/Navbar';
import Toast from './components/common/Toast';
import SplashScreen from './components/common/SplashScreen';
import LandingPage from './components/landing/LandingPage';
import StreamingView from './components/streaming/StreamingView';
import CloudExplorer from './components/explorer/CloudExplorer';
import MonitoringView from './components/monitoring/MonitoringView';
import { UsersPanel } from './components/admin/UsersPanel';
import AdminDashboard from './components/admin/AdminDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { CommandPalette } from './components/search/CommandPalette';
import VideoPlayerModal from './components/streaming/VideoPlayerModal';
import ServerOfflineFallback from './components/common/ServerOfflineFallback';
import { useAuth } from './contexts/AuthContext';
import { useServerOffline } from './contexts/ServerOfflineContext';
import { fetchStats, refreshStats, fetchCatalog, fetchMetadata } from './services/api';

export default function App() {
  const { isServerOffline, retryConnection } = useServerOffline();
  const {
    user,
    hasRole,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isForcePasswordModalOpen
  } = useAuth();
  const [activeTab, setActiveTab] = useState('streaming');
  const [stats, setStats] = useState(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Search & Catalog state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [catalog, setCatalog] = useState({ movies: [], series: [], anime: [], personal: [], all: [] });
  const [metadata, setMetadata] = useState({});
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Toast Notification System
  const addToast = useCallback(({ type = 'info', title, message }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load storage stats
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (err) {
      console.warn('Initial stats load failed:', err.message);
    }
  }, []);

  // Load catalog & metadata for CommandPalette
  const loadCatalogData = useCallback(async () => {
    try {
      const [cat, meta] = await Promise.all([
        fetchCatalog().catch(() => ({ movies: [], series: [], anime: [], personal: [], all: [] })),
        fetchMetadata().catch(() => ({}))
      ]);
      setCatalog(cat || { movies: [], series: [], anime: [], personal: [], all: [] });
      setMetadata(meta || {});
    } catch (err) {
      console.warn('Failed to prefetch catalog for search:', err.message);
    }
  }, []);

  useEffect(() => {
    loadStats();
    if (user) {
      loadCatalogData();
    }
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [user, loadStats, loadCatalogData]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Automatic scroll restoration when switching tabs, routes or auth state
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab, user]);

  // Track previous user to trigger smooth logout confirmation toast
  const prevUserRef = React.useRef(user);
  useEffect(() => {
    if (prevUserRef.current && !user) {
      addToast({
        type: 'info',
        title: 'Sesión Finalizada',
        message: 'Has cerrado sesión exitosamente. Bienvenido a CloudMedia Hub'
      });
    }
    prevUserRef.current = user;
  }, [user, addToast]);

  // Handle manual quota refresh
  const handleRefreshStats = async () => {
    try {
      setIsRefreshingStats(true);
      const data = await refreshStats();
      setStats(data);
      addToast({
        type: 'success',
        title: 'Cuota sincronizada',
        message: 'Las estadísticas de Google Drive y disco local han sido actualizadas'
      });
    } catch (err) {
      console.error('Failed to refresh stats:', err);
      addToast({
        type: 'error',
        title: 'Error de sincronización',
        message: err.message || 'No se pudo actualizar la cuota en este momento'
      });
    } finally {
      setIsRefreshingStats(false);
    }
  };

  // Si el servidor local está apagado, desmonta el contenido y muestra la pantalla fallback offline
  if (isServerOffline) {
    return <ServerOfflineFallback onRetry={retryConnection} />;
  }

  // If user is not authenticated, show the public Landing Page
  if (!user) {
    return (
      <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col font-sans transition-opacity duration-500 animate-fade-in">
        <SplashScreen />
        <LandingPage onOpenLogin={() => setIsLoginModalOpen(true)} />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
        <ForcePasswordChangeModal
          isOpen={isForcePasswordModalOpen}
          onPasswordChanged={(updatedUser) => {
            addToast({
              type: 'success',
              title: 'Contraseña Actualizada',
              message: `Bienvenido a CloudMedia Hub, ${updatedUser?.username || 'usuario'}`
            });
          }}
        />
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col font-sans transition-opacity duration-500 animate-fade-in">
      {/* Programmatic Splash Screen on initial session load */}
      <SplashScreen />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        isRefreshingStats={isRefreshingStats}
        onRefreshStats={handleRefreshStats}
        onOpenSearch={() => setIsSearchOpen(true)}
        addToast={addToast}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24 lg:pb-12">
        {activeTab === 'streaming' && (
          <StreamingView
            onGoToExplorer={() => setActiveTab('explorer')}
            addToast={addToast}
          />
        )}

        {activeTab === 'explorer' && (
          <CloudExplorer
            addToast={addToast}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringView
            stats={stats}
            isRefreshingStats={isRefreshingStats}
            onRefreshStats={handleRefreshStats}
            addToast={addToast}
          />
        )}

        {activeTab === 'users' && hasRole('admin') && (
          <AdminDashboard
            stats={stats}
            onRefreshStats={handleRefreshStats}
            addToast={addToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-theme-border bg-theme-surface py-6 text-center text-xs text-theme-muted mb-16 lg:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CloudMedia Hub • Streaming Engine &amp; rclone cloud sync</span>
          </div>
          <p className="flex items-center gap-1 text-theme-muted">
            Diseñado con estética Cine y Arquitectura Modular • React + Tailwind CSS
          </p>
        </div>
      </footer>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        catalog={catalog}
        metadata={metadata}
        onSelectMedia={(item) => {
          setSelectedMedia(item);
        }}
      />

      {/* Direct Video Player for Search Results */}
      {selectedMedia && (
        <VideoPlayerModal
          item={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}

      {/* Auth / Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Mandatory First Password Change Modal */}
      <ForcePasswordChangeModal
        isOpen={isForcePasswordModalOpen}
        onPasswordChanged={(updatedUser) => {
          addToast({
            type: 'success',
            title: 'Contraseña Actualizada',
            message: `Bienvenido a CloudMedia Hub, ${updatedUser?.username || 'usuario'}`
          });
        }}
      />

      {/* Global Toast Notification System */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
