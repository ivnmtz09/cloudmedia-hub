import React from 'react';
import QuotaDashboard from './QuotaDashboard';
import CleanupModule from './CleanupModule';
import CloudExplorer from '../explorer/CloudExplorer';
import { useAuth } from '../../contexts/AuthContext';

export default function MonitoringView({ stats, isRefreshingStats, onRefreshStats, addToast }) {
  const { user } = useAuth();

  // Validación basada en el rol del usuario autenticado:
  // Solo se renderizan los paneles de cuotas si user.role === 'admin' o user.role === 'moderator'
  const isAuthorized = user && (user.role === 'admin' || user.role === 'moderator');

  if (!isAuthorized) {
    // Si el usuario tiene un rol inferior (o 'user' / 'viewer'),
    // no se muestra ningún rastro de cuotas ni limpieza local;
    // se renderiza únicamente el Explorador multimedia
    return <CloudExplorer addToast={addToast} />;
  }

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      <QuotaDashboard
        stats={stats}
        isRefreshing={isRefreshingStats}
        onRefresh={onRefreshStats}
      />

      <CleanupModule
        onFileMovedOrDeleted={onRefreshStats}
        addToast={addToast}
      />
    </div>
  );
}
