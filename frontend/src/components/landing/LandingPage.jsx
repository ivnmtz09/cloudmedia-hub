import React, { useState } from 'react';
import {
  Play, LogIn, Film, Tv, Cloud, Shield, Sliders, Sparkles,
  CheckCircle2, HardDrive, Search, Volume2, Palette, ShieldCheck, Radio
} from 'lucide-react';
import CloudMediaLogo from '../common/CloudMediaLogo';
import ThemePanel from '../common/ThemePanel';
import { useTheme } from '../../contexts/ThemeContext';

export default function LandingPage({ onOpenLogin }) {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const { currentTheme } = useTheme();

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col font-sans transition-colors duration-300">
      {/* ================= HEADER / BARRA DE NAVEGACIÓN ================= */}
      <header className="sticky top-0 z-40 w-full bg-theme-surface border-b border-theme-border shadow-md">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CloudMediaLogo size={28} variant="logotype" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Servidor Activo</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsThemeOpen(true)}
              aria-label="Personalizar tema"
              className="min-h-10 min-w-10 px-3 flex items-center gap-1.5 rounded-xl bg-theme-card hover:bg-theme-border text-theme-text text-xs font-semibold border border-theme-border transition-colors focus-ring"
              title="Cambiar paleta cromática"
            >
              <Palette className="w-4 h-4 text-theme-accent" />
              <span className="hidden md:inline">{currentTheme?.name || 'Tema'}</span>
            </button>

            <button
              onClick={onOpenLogin}
              className="min-h-10 flex items-center gap-2 px-4 sm:px-5 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-xs sm:text-sm font-bold shadow-lg transition-transform active:scale-95 focus-ring"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO PRINCIPAL ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-theme-surface border border-theme-border text-theme-accent text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Streaming Privado &amp; Almacenamiento Seguro</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-black text-theme-text tracking-tight leading-tight mb-6">
            Tu Catálogo Multimedia en la Nube con{' '}
            <span className="text-theme-accent">Rendimiento Puro.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-theme-muted mb-8 leading-relaxed">
            Plataforma modular para streaming directo de contenedores MKV y MP4 con transcodificación en tiempo real, reproductor VLC con ganancia hasta 200%, sincronización inteligente con Google Drive y jerarquía de permisos RBAC.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12">
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto min-h-12 flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-sm font-bold shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 focus-ring"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Acceder a Mi Cuenta</span>
            </button>

            <a
              href="#features"
              className="w-full sm:w-auto min-h-12 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-theme-surface hover:bg-theme-card text-theme-text text-sm font-semibold border border-theme-border transition-colors focus-ring"
            >
              <Sliders className="w-4 h-4 text-theme-accent" />
              <span>Capacidades Técnicas</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-theme-surface border border-theme-border">
            <div className="p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-theme-text">500 GB</div>
              <div className="text-[11px] text-theme-muted uppercase tracking-wider mt-0.5">Cuota en la Nube</div>
            </div>
            <div className="p-3 text-center border-l border-theme-border">
              <div className="text-xl sm:text-2xl font-bold font-mono text-theme-accent">200%</div>
              <div className="text-[11px] text-theme-muted uppercase tracking-wider mt-0.5">Volumen VLC Engine</div>
            </div>
            <div className="p-3 text-center border-l border-theme-border">
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">MKV &amp; MP4</div>
              <div className="text-[11px] text-theme-muted uppercase tracking-wider mt-0.5">Transmisión 206</div>
            </div>
            <div className="p-3 text-center border-l border-theme-border">
              <div className="text-xl sm:text-2xl font-bold font-mono text-theme-text">RBAC</div>
              <div className="text-[11px] text-theme-muted uppercase tracking-wider mt-0.5">Seguridad Jerárquica</div>
            </div>
          </div>
        </div>

        {/* ================= SECCIÓN DE CARACTERÍSTICAS TÉCNICAS ================= */}
        <section id="features" className="mt-20 pt-8 border-t border-theme-border">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-theme-text tracking-tight">
              Diseñado para Streaming Exigente
            </h2>
            <p className="text-xs sm:text-sm text-theme-muted mt-2">
              Arquitectura sin concesiones: superficies sólidas, cero emojis y rendimiento nativo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4">
                  <Volume2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  Reproductor VLC con Audio Web API
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Conexión directa del elemento de video con AudioContext y GainNode para permitir sobreamplificación hasta 200%, selector dinámico de pistas de audio (Dual/Latino/Inglés) y subtítulos sincronizados.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4">
                  <Film className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  Streaming HTTP 206 &amp; Remux MKV
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Soporte de rangos parciales HTTP 206 y remuxing en vivo mediante ffmpeg y ffprobe, permitiendo saltos temporales instantáneos sin precarga forzada de archivos completos.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4">
                  <Cloud className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  Sincronización rclone con Google Drive
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Integración directa con carpetas remotas en la nube, monitorización en tiempo real del límite de 500GB y módulo automatizado de limpieza de archivos pesados locales.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  Command Palette &amp; Búsqueda Rápida
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Acceso global con Ctrl+K para localizar películas, series y anime al instante, con filtros multidimensionales de resolución (1080p, 720p) y pistas de audio.
                </p>
              </div>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  Seguridad RBAC &amp; Contraseñas Fuertes
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Control estricto de accesos para administradores, moderadores y usuarios, con flujo de cambio obligatorio de contraseñas en el primer inicio de sesión.
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4">
                  <Palette className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  5 Paletas Cinematográficas Puras
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Superficies 100% opacas y definidas con bordes limpios sin glassmorphism translúcido: Redflix, Magic Plus, Anime Studio, Max Cinema y Prime Vision.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= BANNER INVITACIÓN ================= */}
        <div className="mt-16 p-8 rounded-2xl bg-theme-surface border border-theme-border text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-theme-text mb-2">
            Inicia sesión para acceder a tu catálogo
          </h2>
          <p className="text-xs sm:text-sm text-theme-muted mb-6 max-w-lg mx-auto">
            Accede con tus credenciales seguras para comenzar la reproducción y gestión de tus archivos multimedia.
          </p>
          <button
            onClick={onOpenLogin}
            className="min-h-12 inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-sm font-bold shadow-lg transition-transform active:scale-95 focus-ring"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar Sesión Ahora</span>
          </button>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-theme-border bg-theme-surface py-6 text-center text-xs text-theme-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CloudMedia Hub • Streaming Engine &amp; rclone cloud sync</span>
          </div>
          <p className="text-theme-muted">
            Diseñado con estética Cine y Arquitectura Modular • React + Tailwind CSS
          </p>
        </div>
      </footer>

      {/* Theme Panel */}
      <ThemePanel isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} />
    </div>
  );
}
