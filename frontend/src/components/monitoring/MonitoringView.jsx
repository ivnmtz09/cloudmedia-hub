import React from 'react';
import QuotaDashboard from './QuotaDashboard';
import CleanupModule from './CleanupModule';

export default function MonitoringView({ stats, isRefreshingStats, onRefreshStats, addToast }) {
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
