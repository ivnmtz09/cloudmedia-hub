import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Users, Database, FolderOpen, HardDrive, Sliders,
  RefreshCw, Sparkles, Shield, Server, Clock, CheckCircle2,
  AlertTriangle, ArrowUpRight, Terminal, Cpu, MemoryStick
} from 'lucide-react';
import { UsersPanel } from './UsersPanel';
import QuotaDashboard from '../monitoring/QuotaDashboard';
import CloudExplorer from '../explorer/CloudExplorer';
import CleanupModule from '../monitoring/CleanupModule';
import AnimatedCounter from '../common/AnimatedCounter';
import MorphButton from '../common/MorphButton';
import { fetchSystemStatus, refreshStats, syncMetadata, fetchUsers } from '../../services/api';

export function AdminDashboard({ stats, onRefreshStats, addToast }) {
  const [activeSection, setActiveSection] = useState('overview');
  // 'overview' | 'users' | 'quota' | 'explorer' | 'cleanup' | 'server'

  const [systemInfo, setSystemInfo] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [refreshingQuota, setRefreshingQuota] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoadingOverview(true);
      const [sys, uData] = await Promise.all([
        fetchSystemStatus().catch(() => null),
        fetchUsers().catch(() => [])
      ]);
      setSystemInfo(sys);
      setUsersList(uData || []);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSyncMetadata = async () => {
    try {
      setSyncingMeta(true);
      await syncMetadata();
      if (addToast) addToast({ type: 'info', title: 'Metadatos', message: 'Sincronización con iTunes, Jikan y Wikipedia iniciada' });
      setTimeout(loadDashboardData, 3000);
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setSyncingMeta(false);
    }
  };

  const handleRefreshQuotaNow = async () => {
    try {
      setRefreshingQuota(true);
      if (onRefreshStats) await onRefreshStats();
      await loadDashboardData();
    } finally {
      setRefreshingQuota(false);
    }
  };

  const drive = stats?.googleDrive || stats || {};
  const drivePercent = drive.percentage ?? 0;
  const local = stats?.localDisk || {};

  const adminCount = usersList.filter((u) => u.role === 'admin').length;
  const modCount = usersList.filter((u) => u.role === 'moderator').length;
  const viewerCount = usersList.filter((u) => u.role === 'viewer').length;
  const pendingPasswordCount = usersList.filter((u) => u.mustChangePassword).length;

  const asideNavItems = [
    { id: 'overview', label: 'Resumen del Sistema', icon: Activity },
    { id: 'users', label: 'Gestión de Usuarios y Roles', icon: Users, badge: usersList.length },
    { id: 'quota', label: 'Monitoreo de Cuota (500GB)', icon: Database, badge: `${drivePercent}%` },
    { id: 'explorer', label: 'Explorador de Almacenamiento', icon: FolderOpen },
    { id: 'cleanup', label: 'Auditoría de Limpieza Local', icon: HardDrive },
    { id: 'server', label: 'Ajustes del Servidor', icon: Sliders }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in text-theme-text min-h-[calc(100vh-140px)]">
      {/* ================= PANEL LATERAL FIJO (ASIDE) ================= */}
      <aside className="w-full lg:w-72 shrink-0">
        <div className="glass rounded-2xl p-3 border border-white/10 sticky top-20 space-y-1">
          {/* Header Aside */}
          <div className="px-3 py-3 border-b border-theme-border/60 mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-theme-accent" />
              <span className="font-bold text-xs uppercase tracking-wider text-theme-text">
                Panel de Administración
              </span>
            </div>
            <p className="text-[11px] text-theme-muted mt-0.5">
              Administrador: <strong className="text-theme-text">ivnmtz09</strong>
            </p>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {asideNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-ring ${
                    isActive
                      ? 'bg-theme-accent text-white shadow-md shadow-theme-accent/25'
                      : 'text-theme-muted hover:text-theme-text hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-black/30 text-white'
                          : 'bg-white/5 text-theme-muted border border-white/5'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Estado de servicio rclone */}
          <div className="mt-4 pt-3 border-t border-theme-border/60 px-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-theme-muted">rclone-pc.service</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Activo
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <main className="flex-1 min-w-0">
        {/* SECCIÓN 1: RESUMEN DEL SISTEMA (OVERVIEW) */}
        {activeSection === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass border border-white/10">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-theme-text flex items-center gap-2">
                  <span>Resumen del Sistema CloudMedia</span>
                </h1>
                <p className="text-xs text-theme-muted mt-1">
                  Métricas avanzadas, estado de almacenamiento y auditoría en tiempo real
                </p>
              </div>

              {/* Acciones Rápidas con MorphButtons */}
              <div className="flex items-center gap-2 flex-wrap">
                <MorphButton
                  onClick={handleSyncMetadata}
                  status={syncingMeta ? 'loading' : 'idle'}
                  idleLabel="Sincronizar Metadatos"
                  loadingLabel="Sincronizando..."
                  icon={Sparkles}
                />
                <button
                  onClick={handleRefreshQuotaNow}
                  disabled={refreshingQuota}
                  className="min-h-12 flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/10 text-theme-text text-xs font-semibold border border-white/10 transition-all focus-ring disabled:opacity-50"
                  title="Actualizar cuota de rclone"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingQuota ? 'animate-spin text-theme-accent' : ''}`} />
                  <span>Refrescar</span>
                </button>
              </div>
            </div>

            {/* Grid de Métricas Principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cuota Nube */}
              <div className="p-5 rounded-2xl glass border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Cuota Nube (500GB)</span>
                  <Database className="w-4 h-4 text-theme-accent" />
                </div>
                <div className="my-3">
                  <div className="text-2xl font-bold font-mono text-theme-text">
                    <AnimatedCounter value={drivePercent} suffix="%" decimals={1} />
                  </div>
                  <div className="text-xs text-theme-muted mt-0.5">
                    {drive.human_used || '0 GB'} de {drive.human_max || '500 GB'}
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-theme-accent transition-all duration-300"
                    style={{ width: `${Math.min(100, drivePercent)}%` }}
                  />
                </div>
              </div>

              {/* Disco Local */}
              <div className="p-5 rounded-2xl glass border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Disco Local (/)</span>
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="my-3">
                  <div className="text-2xl font-bold font-mono text-theme-text">
                    <AnimatedCounter value={local.percentage_used || 0} suffix="%" decimals={1} />
                  </div>
                  <div className="text-xs text-theme-muted mt-0.5">
                    {local.human_used || '0 GB'} usados • {local.human_available || '0 GB'} libres
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, local.percentage_used || 0)}%` }}
                  />
                </div>
              </div>

              {/* Cuentas Totales */}
              <div className="p-5 rounded-2xl glass border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Usuarios Totales</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="my-3">
                  <div className="text-2xl font-bold font-mono text-theme-text">{usersList.length}</div>
                  <div className="text-xs text-theme-muted mt-0.5">
                    1 admin • {modCount} moderadores • {viewerCount} viewers
                  </div>
                </div>
                <div className="text-[11px] font-mono text-amber-400">
                  {pendingPasswordCount > 0 ? `${pendingPasswordCount} cambio(s) pendiente(s)` : 'Todas las contraseñas actualizadas'}
                </div>
              </div>

              {/* Uptime Servidor */}
              <div className="p-5 rounded-2xl glass border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">Tiempo Activo</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="my-3">
                  <div className="text-2xl font-bold font-mono text-theme-text">
                    {systemInfo?.uptimeFormatted || 'Activo'}
                  </div>
                  <div className="text-xs text-theme-muted mt-0.5">
                    Node.js {systemInfo?.nodeVersion || 'v26'} en {systemInfo?.platform || 'linux'}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Servicio en puerto 3001</span>
                </div>
              </div>
            </div>

            {/* Gráfico Comparativo y Desglose Visual de Almacenamiento */}
            <div className="p-6 rounded-2xl glass border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-theme-text flex items-center gap-2">
                  <Database className="w-4 h-4 text-theme-accent" />
                  <span>Desglose de Almacenamiento Nube vs Disco Local</span>
                </h2>
                <span className="text-xs font-mono text-theme-muted">
                  Capacidad Total Monitorizada: 500 GB
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono text-theme-muted mb-1">
                    <span>Google Drive (PC_Storage)</span>
                    <span className="text-theme-text font-bold">{drive.human_used} ({drivePercent}%)</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-theme-accent to-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, drivePercent)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-theme-muted mb-1">
                    <span>Partición Raíz Local (/)</span>
                    <span className="text-theme-text font-bold">{local.human_used} ({local.percentage_used}%)</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, local.percentage_used || 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Registro de Eventos del Sistema & Auditoría */}
            <div className="p-6 rounded-2xl glass border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-theme-border/60">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-theme-accent" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-theme-text">
                    Registro de Eventos y Auditoría del Sistema
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-theme-muted">
                  {systemInfo?.events?.length || 3} eventos registrados
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {(systemInfo?.events || []).map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                          ev.level === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : ev.level === 'WARN'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : ev.level === 'ERROR'
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {ev.level}
                      </span>
                      <span className="text-slate-200">{ev.message}</span>
                    </div>
                    <span className="text-[10px] font-mono text-theme-muted shrink-0">
                      {new Date(ev.timestamp).toLocaleTimeString('es-ES')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN 2: GESTIÓN DE USUARIOS Y ROLES */}
        {activeSection === 'users' && (
          <div className="space-y-4 animate-fade-in">
            <UsersPanel onToast={addToast} />
          </div>
        )}

        {/* SECCIÓN 3: MONITOREO DE CUOTA (500GB) */}
        {activeSection === 'quota' && (
          <div className="space-y-4 animate-fade-in">
            <QuotaDashboard
              stats={stats}
              isRefreshing={refreshingQuota}
              onRefresh={handleRefreshQuotaNow}
            />
          </div>
        )}

        {/* SECCIÓN 4: EXPLORADOR DE ALMACENAMIENTO */}
        {activeSection === 'explorer' && (
          <div className="space-y-4 animate-fade-in">
            <CloudExplorer addToast={addToast} />
          </div>
        )}

        {/* SECCIÓN 5: AUDITORÍA DE LIMPIEZA LOCAL */}
        {activeSection === 'cleanup' && (
          <div className="space-y-4 animate-fade-in">
            <CleanupModule
              addToast={addToast}
              onFileMovedOrDeleted={loadDashboardData}
            />
          </div>
        )}

        {/* SECCIÓN 6: AJUSTES DEL SERVIDOR */}
        {activeSection === 'server' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 rounded-2xl glass border border-white/10 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-theme-border/60">
                <Server className="w-5 h-5 text-theme-accent" />
                <h2 className="text-base font-bold text-theme-text">
                  Parámetros Técnicos del Servidor
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="text-theme-muted uppercase text-[10px] font-semibold">Entorno de Ejecución</div>
                  <div className="flex justify-between font-mono">
                    <span className="text-theme-muted">Versión de Node:</span>
                    <span className="text-white font-bold">{systemInfo?.nodeVersion || 'v26.0.0'}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-theme-muted">Plataforma / Arch:</span>
                    <span className="text-white">{systemInfo?.platform} ({systemInfo?.arch})</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-theme-muted">Hostname:</span>
                    <span className="text-white">{systemInfo?.hostname}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <div className="text-theme-muted uppercase text-[10px] font-semibold">Servicios del Sistema</div>
                  <div className="flex justify-between font-mono">
                    <span className="text-theme-muted">cloudmedia-hub-backend:</span>
                    <span className="text-emerald-400 font-bold">Activo (Systemd User)</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-theme-muted">rclone-pc.service:</span>
                    <span className="text-emerald-400 font-bold">Montado en PC_Storage</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-theme-muted">Puerto de Escucha:</span>
                    <span className="text-white">0.0.0.0:3001</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
