import React, { useState, useEffect, useRef } from 'react';
import {
  Server, ChevronDown, Check, RefreshCw, Zap, Cpu, Cloud,
  Wifi, AlertCircle
} from 'lucide-react';
import {
  getActiveServerInfo,
  subscribeServerChange,
  setActiveServerMode,
  pingServer,
  runServerRace
} from '../../services/api';

export default function ServerSelector({ addToast, compact = false }) {
  const [serverInfo, setServerInfo] = useState(getActiveServerInfo());
  const [isOpen, setIsOpen] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const dropdownRef = useRef(null);

  // Sincronizar estado en tiempo real ante eventos de failover o carrera
  useEffect(() => {
    const unsubscribe = subscribeServerChange((newInfo) => {
      setServerInfo(newInfo);
    });
    return () => unsubscribe();
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectMode = (mode) => {
    setActiveServerMode(mode);
    setIsOpen(false);
    if (addToast) {
      const modeNames = {
        auto: 'Modo Automático (Carrera de red)',
        local: 'PC Base (Local)',
        vps: 'Oracle Cloud (VPS)'
      };
      addToast({
        type: 'info',
        title: 'Servidor cambiado',
        message: `Conexión fijada en: ${modeNames[mode] || mode}`
      });
    }
  };

  const handleManualPing = async (e) => {
    e.stopPropagation();
    setIsPinging(true);
    try {
      await Promise.all([
        pingServer('local'),
        pingServer('vps')
      ]);
      await runServerRace();
      if (addToast) {
        addToast({
          type: 'success',
          title: 'Latencias actualizadas',
          message: 'Prueba de ping a servidores completada con éxito.'
        });
      }
    } catch (err) {
      console.warn('Error en prueba de ping:', err);
    } finally {
      setIsPinging(false);
    }
  };

  const activeServer = serverInfo.activeServer || serverInfo.servers?.local;
  const isAuto = serverInfo.mode === 'auto';
  const localLatency = serverInfo.latencies?.local;
  const vpsLatency = serverInfo.latencies?.vps;

  return (
    <div className={`relative ${compact ? 'w-full' : 'inline-block'}`} ref={dropdownRef}>
      {/* Botón Píldora en Navbar / Aside */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Servidor: ${activeServer?.name}. Modo: ${isAuto ? 'Automático' : 'Manual'}`}
        title={`Servidor activo: ${activeServer?.name} (${isAuto ? 'Auto-Failover' : 'Fijo'})\nLocal: ${localLatency ? `${localLatency}ms` : 'Verificando'}\nVPS: ${vpsLatency ? `${vpsLatency}ms` : 'En espera'}`}
        className={`focus-ring flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-98 select-none ${
          compact
            ? 'w-full justify-between bg-white/5 hover:bg-white/10 border-white/10 text-theme-text'
            : 'flex-shrink-0 rounded-full h-9 bg-slate-900/80 border-slate-700/80 hover:border-slate-600 shadow-md backdrop-blur-md hover:scale-105'
        }`}
      >
        {/* Punto verde con animación de pulso */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>

          {/* Etiqueta del Servidor Activo */}
          <div className="flex items-center gap-1 min-w-0">
            {isAuto && (
              <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
            )}
            <span className="text-slate-200 font-bold truncate">
              {isAuto ? `Auto (${activeServer?.shortName})` : activeServer?.shortName}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Menú Desplegable / Acordeón Integrado */}
      {isOpen && (
        <div
          role="menu"
          className={
            compact
              ? "w-full mt-2 rounded-xl bg-gray-950/70 border border-white/10 p-2 text-xs text-slate-200 divide-y divide-white/5 animate-fade-in"
              : "absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-gray-900/95 border border-slate-700/90 shadow-2xl backdrop-blur-xl p-2 z-50 animate-scale-in text-xs text-slate-200 divide-y divide-slate-800/80"
          }
        >
          {/* Cabecera */}
          <div className="p-2.5 pb-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-red-500" />
                Doble Servidor & Failover
              </span>
              <button
                type="button"
                onClick={handleManualPing}
                disabled={isPinging}
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Hacer ping y actualizar latencias"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-red-500' : ''}`} />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Conmutación automática tolerante a caídas de túnel de Cloudflare.
            </p>
          </div>

          {/* Opciones de Selección */}
          <div className="py-1.5 space-y-1">
            {/* 1. Modo Automático */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectMode('auto')}
              className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${
                serverInfo.mode === 'auto'
                  ? 'bg-red-600/15 border border-red-500/40 text-white'
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Automático (Recomendado)</span>
                  {serverInfo.mode === 'auto' && (
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Carrera de red (2.5s) al más rápido + failover dinámico activo.
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Enlazado a: {activeServer?.name}</span>
                </div>
              </div>
            </button>

            {/* 2. PC Base (Local) */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectMode('local')}
              className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${
                serverInfo.mode === 'local'
                  ? 'bg-red-600/15 border border-red-500/40 text-white'
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">PC Base (Local)</span>
                  {serverInfo.mode === 'local' && (
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5" title={serverInfo.servers?.local?.url}>
                  {serverInfo.servers?.local?.url || 'VITE_API_URL_LOCAL'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">Túnel principal</span>
                  {localLatency !== null && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                      {localLatency} ms
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* 3. Oracle Cloud (VPS) */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectMode('vps')}
              disabled={!serverInfo.hasVps}
              className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${
                !serverInfo.hasVps
                  ? 'opacity-60 cursor-not-allowed'
                  : serverInfo.mode === 'vps'
                  ? 'bg-red-600/15 border border-red-500/40 text-white'
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Oracle Cloud (VPS)</span>
                  {serverInfo.mode === 'vps' && (
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5" title={serverInfo.servers?.vps?.url}>
                  {serverInfo.hasVps ? serverInfo.servers?.vps?.url : 'No configurado (VITE_API_URL_VPS)'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">Servidor de respaldo</span>
                  {vpsLatency !== null && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                      {vpsLatency} ms
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Pie informativo */}
          <div className="p-2 pt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-400" />
              Tolerancia activa
            </span>
            <span className="font-mono text-slate-500">
              {isAuto ? 'Auto-Switch ON' : 'Manual Lock'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
