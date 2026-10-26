import React from 'react';
import { Cloud, HardDrive, RefreshCw, Database, Clock, FileCheck, AlertTriangle } from 'lucide-react';
import AnimatedCounter from '../common/AnimatedCounter';
import MorphButton from '../common/MorphButton';
import { useAuth } from '../../contexts/AuthContext';

export default function QuotaDashboard({ stats, isRefreshing, onRefresh }) {
  const { user } = useAuth();

  // Validación de seguridad por roles: solo admin o moderator
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null;
  }
  // Drive Stats
  const drive = stats?.googleDrive || stats || {};
  const drivePercent = drive.percentage ?? 0;
  const driveHumanUsed = drive.human_used ?? '0 GB';
  const driveHumanMax = drive.human_max ?? '500 GB';
  const driveFileCount = drive.file_count ?? 0;
  const driveUpdatedAt = drive.updated_at ? new Date(drive.updated_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-';

  // Drive color indicator (<70% green, 70-85% yellow, >85% red)
  let driveProgressColor = 'from-emerald-500 to-teal-400';
  let driveTextColor = 'text-emerald-400';
  let driveBorderColor = 'border-emerald-500/30';
  if (drivePercent >= 85) {
    driveProgressColor = 'from-red-600 to-rose-500';
    driveTextColor = 'text-red-400';
    driveBorderColor = 'border-red-500/40';
  } else if (drivePercent >= 70) {
    driveProgressColor = 'from-amber-500 to-orange-400';
    driveTextColor = 'text-amber-400';
    driveBorderColor = 'border-amber-500/40';
  }

  // Local Disk Stats
  const local = stats?.localDisk || {};
  const localPercent = local.percentage_used ?? 0;
  const localHumanUsed = local.human_used ?? '0 GB';
  const localHumanTotal = local.human_total ?? '0 GB';
  const localHumanAvail = local.human_available ?? '0 GB';

  let localProgressColor = 'from-blue-500 to-indigo-500';
  if (localPercent >= 90) {
    localProgressColor = 'from-red-600 to-rose-500';
  } else if (localPercent >= 75) {
    localProgressColor = 'from-amber-500 to-orange-400';
  }

  return (
    <div className="space-y-4 mb-8">
      {/* Top Header & Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-brand-400" />
            <span>Dashboard de Almacenamiento & Cuotas</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Supervisa en tiempo real el consumo en Google Drive (PC_Storage) y el espacio en tu disco local.
          </p>
        </div>

        {/* 4. TRANSFORMATION (MORPHING) */}
        <MorphButton
          onClick={onRefresh}
          status={isRefreshing ? 'loading' : 'idle'}
          idleLabel="Actualizar Cuota Ahora"
          loadingLabel="Sincronizando..."
          icon={RefreshCw}
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Google Drive Quota (500 GB) */}
        <div className={`bg-theme-surface rounded-3xl p-6 border ${driveBorderColor} relative overflow-hidden flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Google Drive Cloud Quota</h3>
                  <p className="text-xs text-slate-400">Carpeta remota <span className="font-mono text-slate-300">PC_Storage</span></p>
                </div>
              </div>

              {/* 5. VALUE CHANGE: Conteo interpolado requestAnimationFrame */}
              <div className="text-right">
                <span className={`text-2xl font-black ${driveTextColor} font-mono block`}>
                  <AnimatedCounter value={drivePercent} suffix="%" decimals={1} />
                </span>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Usado</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="w-full h-3 rounded-full bg-dark-900 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${driveProgressColor} transition-all duration-500 shadow-sm`}
                  style={{ width: `${Math.min(drivePercent, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 font-medium font-mono">
                <span>Usado: <strong className="text-white">{driveHumanUsed}</strong></span>
                <span>Límite: <strong className="text-white">{driveHumanMax}</strong></span>
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <FileCheck className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Archivos en nube: <strong className="text-white font-mono">{driveFileCount}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 justify-end">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Último sync: <strong className="text-white font-mono">{driveUpdatedAt}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Local Disk (/) */}
        <div className="bg-theme-surface rounded-3xl p-6 border border-theme-border relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Disco Local del Sistema</h3>
                  <p className="text-xs text-slate-400">Partición raíz (<span className="font-mono text-slate-300">/</span>)</p>
                </div>
              </div>

              {/* 5. VALUE CHANGE: Conteo interpolado local */}
              <div className="text-right">
                <span className="text-2xl font-black text-white font-mono block">
                  <AnimatedCounter value={localPercent} suffix="%" decimals={1} />
                </span>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Usado</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="w-full h-3 rounded-full bg-dark-900 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${localProgressColor} transition-all duration-500 shadow-sm`}
                  style={{ width: `${Math.min(localPercent, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 font-medium font-mono">
                <span>Usado: <strong className="text-white">{localHumanUsed}</strong></span>
                <span>Total: <strong className="text-white">{localHumanTotal}</strong></span>
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Disponible: <strong className="text-emerald-400 font-mono">{localHumanAvail}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 justify-end">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Estado: <strong className="text-white font-mono">{localPercent > 85 ? 'Crítico' : 'Óptimo'}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
