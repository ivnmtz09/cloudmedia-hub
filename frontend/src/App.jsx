import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import TopProgressBar from './components/common/TopProgressBar';
import Toast from './components/common/Toast';
import SplashScreen from './components/common/SplashScreen';
import LandingPage from './components/landing/LandingPage';
import StreamingView from './components/streaming/StreamingView';
import CloudExplorer from './components/explorer/CloudExplorer';
import MonitoringView from './components/monitoring/MonitoringView';
import AdminDashboard from './components/admin/AdminDashboard';
import CloudMedIAView from './components/chat/CloudMedIAView';
import MediaDetailsView from './components/explorer/MediaDetailsView';
import { LoginModal } from './components/auth/LoginModal';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import QuickSearchModal from './components/search/QuickSearchModal';
import VideoPlayerModal from './components/streaming/VideoPlayerModal';
import ServerOfflineFallback from './components/common/ServerOfflineFallback';
import { useAuth } from './contexts/AuthContext';
import { useServerOffline } from './contexts/ServerOfflineContext';
import { fetchStats, refreshStats, fetchCatalog, fetchMetadata } from './services/api';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isServerOffline, retryConnection } = useServerOffline();
  const {
    user,
    hasRole,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isForcePasswordModalOpen
  } = useAuth();

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

  // Load catalog & metadata for QuickSearchModal Omnibar
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
    loadCatalogData();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [loadStats, loadCatalogData]);

  // Limpieza de datos obsoletos de usuario en localStorage (Mi Lista / Favoritos)
  useEffect(() => {
    try {
      localStorage.removeItem('cmh_favorites');
    } catch (e) {}
  }, []);

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

  // Automatic scroll restoration when switching routes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

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

  const isMediaDetailsRoute = location.pathname.startsWith('/media/');

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col font-sans transition-opacity duration-500 animate-fade-in relative selection:bg-red-600 selection:text-white">
      {/* 1. Indicador Superior de Carga (Top Loading Bar) */}
      <TopProgressBar />

      {/* Programmatic Splash Screen on initial session load */}
      <SplashScreen />

      {/* 2. Top Navbar con enlaces y botón CloudMedIA */}
      <Navbar
        stats={stats}
        isRefreshingStats={isRefreshingStats}
        onRefreshStats={handleRefreshStats}
        onOpenSearch={() => setIsSearchOpen(true)}
        addToast={addToast}
      />

      {/* 3. Main Content Area con Enrutamiento react-router-dom */}
      <main className={`flex-1 w-full mx-auto pb-24 lg:pb-12 ${
        isMediaDetailsRoute
          ? 'max-w-full px-0 pt-0'
          : 'max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8'
      }`}>
        <Routes>
          <Route path="/" element={<StreamingView addToast={addToast} />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/explorer" element={<CloudExplorer addToast={addToast} />} />
          <Route
            path="/quotas"
            element={
              <MonitoringView
                stats={stats}
                isRefreshingStats={isRefreshingStats}
                onRefreshStats={handleRefreshStats}
                addToast={addToast}
              />
            }
          />
          {hasRole('admin') && (
            <Route
              path="/admin"
              element={
                <AdminDashboard
                  stats={stats}
                  onRefreshStats={handleRefreshStats}
                  addToast={addToast}
                />
              }
            />
          )}
          <Route path="/chat" element={<CloudMedIAView />} />
          <Route
            path="/media/:id"
            element={
              <MediaDetailsView
                onPlay={(item) => setSelectedMedia(item)}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      {!isMediaDetailsRoute && location.pathname !== '/chat' && (
        <footer className="border-t border-theme-border bg-theme-surface py-6 text-center text-xs text-theme-muted mb-16 lg:mb-0">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>CloudMedia Hub &bull; Motor de Streaming HTTP 206 y Cloud Sync</span>
            </div>
            <p className="flex items-center gap-1 text-theme-muted">
              Plataforma Cinemática de Nueva Generación &bull; React + Tailwind CSS
            </p>
          </div>
        </footer>
      )}

      {/* Global QuickSearchModal Omnibar (Ctrl+K / Cmd+K) */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        catalog={catalog}
        metadata={metadata}
        onSelectMedia={(item) => {
          navigate(`/media/${encodeURIComponent(item.path)}`);
        }}
      />

      {/* Direct Video Player Modal */}
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
