import React, { useState, useRef } from 'react';
import {
  Play, LogIn, Film, Tv, Cloud, Shield, Sliders, Sparkles,
  HardDrive, Search, Volume2, Palette, ShieldCheck, ChevronRight,
  Maximize2, Laptop, Smartphone, CheckCircle, Database, Layers
} from 'lucide-react';
import CloudMediaLogo from '../common/CloudMediaLogo';
import ThemePanel from '../common/ThemePanel';
import AnimatedCounter from '../common/AnimatedCounter';
import { useTheme } from '../../contexts/ThemeContext';

const PREVIEW_ITEMS = [
  {
    id: 'streaming',
    label: 'Catálogo Streaming',
    icon: Film,
    title: 'Catálogo Cinematográfico RedFlix',
    subtitle: 'Navegación fluida por películas, series y anime con fichas técnicas 3D e información extendida.',
    image: '/screenshots/03_dashboard_redflix.png',
    badge: 'Cine & Series'
  },
  {
    id: 'vlc',
    label: 'Reproductor VLC 200%',
    icon: Volume2,
    title: 'Reproductor VLC con Audio Web API',
    subtitle: 'Sobreamplificación hasta 200% con GainNode, selector de pistas dual/latino, modo miniatura y pantalla completa real.',
    image: '/screenshots/09_vlc_player_playback.png',
    badge: 'Audio & Video'
  },
  {
    id: 'explorer',
    label: 'Explorador en la Nube',
    icon: HardDrive,
    title: 'Explorador Cloud con Atajos Unificados',
    subtitle: 'Gestor de archivos sincronizado con Google Drive vía rclone, con menú de 3 puntos (...) para celular y PC.',
    image: '/screenshots/10_cloud_explorer.png',
    badge: 'Google Drive'
  },
  {
    id: 'admin',
    label: 'Panel de Control',
    icon: Shield,
    title: 'Dashboard de Cuotas y Seguridad RBAC',
    subtitle: 'Monitorización de cuotas de disco local y nube, control de usuarios y módulo automatizado de limpieza.',
    image: '/screenshots/11_admin_dashboard.png',
    badge: 'Control & Cuotas'
  },
  {
    id: 'mobile',
    label: 'Diseño Móvil',
    icon: Smartphone,
    title: 'Experiencia 100% Adaptada a Móviles',
    subtitle: 'Barra inferior de 4 botones, safe area insets para evitar cortes y controles táctiles de reproducción.',
    image: '/screenshots/12_mobile_view.png',
    badge: '100dvh Responsive'
  }
];

export default function LandingPage({ onOpenLogin }) {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const previewCardRef = useRef(null);

  const { currentTheme } = useTheme();
  const accentColor = currentTheme?.colors?.accent || '#E50914';

  const activePreview = PREVIEW_ITEMS[activePreviewIndex];

  // Principio 10 & 11: Parallax y Dimensionalidad 3D con interpolación suave
  const handleMouseMove = (e) => {
    if (!previewCardRef.current) return;
    const rect = previewCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -7;
    const rotateY = ((x - centerX) / centerX) * 7;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHoveringPreview(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col font-sans transition-colors duration-300 overflow-x-hidden">
      {/* ================= HEADER / BARRA DE NAVEGACIÓN ================= */}
      <header className="sticky top-0 z-40 w-full bg-theme-surface border-b border-theme-border shadow-md">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CloudMediaLogo size={28} variant="logotype" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Servidor Local Listo</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsThemeOpen(true)}
              aria-label="Personalizar tema"
              className="min-h-10 min-w-10 px-3 flex items-center gap-1.5 rounded-xl bg-theme-card hover:bg-theme-border text-theme-text text-xs font-semibold border border-theme-border transition-colors focus-ring"
              title="Cambiar paleta cromática"
            >
              <Palette className="w-4 h-4 text-theme-accent" />
              <span className="hidden md:inline">{currentTheme?.name || 'Tema'}</span>
            </button>

            <button
              type="button"
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge con animación Easing */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-theme-surface border border-theme-border text-theme-accent text-xs font-semibold mb-6 shadow-sm animate-stagger-item stagger-delay-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Streaming Privado &amp; Almacenamiento en Servidor Base</span>
          </div>

          {/* Headline Principal */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-theme-text tracking-tight leading-tight mb-6 animate-stagger-item stagger-delay-2">
            Tu Catálogo Multimedia en la Nube con{' '}
            <span className="text-theme-accent">Rendimiento Puro.</span>
          </h1>

          {/* Subtítulo */}
          <p className="text-sm sm:text-base lg:text-lg text-theme-muted mb-8 leading-relaxed max-w-2xl mx-auto animate-stagger-item stagger-delay-3">
            Streaming nativo de contenedores MKV y MP4, reproductor VLC con amplificación al 200%, sincronización rclone con Google Drive, atajos unificados y fallback offline automático.
          </p>

          {/* Botones de Acción con Principio Easing */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 animate-stagger-item stagger-delay-4">
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full sm:w-auto min-h-12 flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-sm font-bold shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 focus-ring"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Acceder a Mi Cuenta</span>
            </button>

            <a
              href="#showcase"
              className="w-full sm:w-auto min-h-12 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-theme-surface hover:bg-theme-card text-theme-text text-sm font-semibold border border-theme-border transition-colors focus-ring"
            >
              <Layers className="w-4 h-4 text-theme-accent" />
              <span>Ver Interfaz &amp; Módulos</span>
            </a>
          </div>

          {/* Barra de Métricas con Principio Value Change */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-theme-surface border border-theme-border shadow-xl animate-stagger-item stagger-delay-5">
            <div className="p-2 sm:p-3 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-theme-text flex items-center justify-center">
                <AnimatedCounter value={500} duration={800} decimals={0} suffix=" GB" />
              </div>
              <div className="text-[10px] sm:text-[11px] text-theme-muted uppercase tracking-wider mt-0.5">Almacenamiento Cloud</div>
            </div>

            <div className="p-2 sm:p-3 text-center border-l border-theme-border">
              <div className="text-xl sm:text-2xl font-bold font-mono text-theme-accent flex items-center justify-center">
                <AnimatedCounter value={200} duration={900} decimals={0} suffix="%" />
              </div>
              <div className="text-[10px] sm:text-[11px] text-theme-muted uppercase tracking-wider mt-0.5">Audio VLC Engine</div>
            </div>

            <div className="p-2 sm:p-3 text-center border-l border-theme-border">
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">MKV &amp; MP4</div>
              <div className="text-[10px] sm:text-[11px] text-theme-muted uppercase tracking-wider mt-0.5">HTTP 206 Streaming</div>
            </div>

            <div className="p-2 sm:p-3 text-center border-l border-theme-border">
              <div className="text-xl sm:text-2xl font-bold font-mono text-theme-text">RBAC</div>
              <div className="text-[10px] sm:text-[11px] text-theme-muted uppercase tracking-wider mt-0.5">Seguridad Jerárquica</div>
            </div>
          </div>
        </div>

        {/* ================= SHOWCASE INTERACTIVO CON UX IN MOTION (DIMENSIONALIDAD, PARALLAX Y MASKING) ================= */}
        <section id="showcase" className="mt-16 sm:mt-24">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-theme-accent">
              Experiencia Visual
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-theme-text tracking-tight mt-1">
              Explora los Módulos del Sistema
            </h2>
            <p className="text-xs sm:text-sm text-theme-muted mt-2 max-w-xl mx-auto">
              Superficies 100% sólidas sin transparencias, controles táctiles y arquitectura modular.
            </p>
          </div>

          {/* Pestañas de Showcase con Principio Easing y Stagger */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap mb-6">
            {PREVIEW_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activePreviewIndex === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePreviewIndex(idx)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 active:scale-95 ${
                    isActive
                      ? 'bg-theme-accent text-white shadow-lg shadow-theme-accent/25 border border-theme-accent'
                      : 'bg-theme-surface hover:bg-theme-card text-theme-muted hover:text-theme-text border border-theme-border'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tarjeta de Previsualización 3D (Principio 11: Dimensionalidad & Principio 10: Parallax) */}
          <div
            ref={previewCardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHoveringPreview(true)}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: isHoveringPreview
                ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.015, 1.015, 1)`
                : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
              transition: isHoveringPreview ? 'transform 0.1s ease-out' : 'transform 0.5s var(--ease-spring)'
            }}
            className="relative rounded-3xl bg-theme-surface border border-theme-border shadow-2xl overflow-hidden max-w-5xl mx-auto group"
          >
            {/* Barra superior de ventana */}
            <div className="px-4 py-3 bg-theme-card border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-xs font-mono text-theme-muted hidden sm:inline">
                  cloudmedia://app/{activePreview.id}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-theme-accent/15 text-theme-accent border border-theme-accent/20">
                  {activePreview.badge}
                </span>
              </div>
            </div>

            {/* Imagen del Showcase con Enmascaramiento y Zoom Dolly */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-black flex items-center justify-center">
              <img
                key={activePreview.image}
                src={activePreview.image}
                alt={activePreview.title}
                className="w-full h-full object-cover sm:object-contain animate-scale-in"
                loading="lazy"
              />

              {/* Degradado inferior con información */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 sm:p-6 text-left flex flex-col justify-end">
                <h3 className="text-base sm:text-xl font-bold text-white drop-shadow">
                  {activePreview.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl drop-shadow">
                  {activePreview.subtitle}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECCIÓN DE CARACTERÍSTICAS TÉCNICAS (OFFSET & DELAY) ================= */}
        <section id="features" className="mt-20 pt-10 border-t border-theme-border">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-theme-text tracking-tight">
              Diseñado para Streaming Exigente
            </h2>
            <p className="text-xs sm:text-sm text-theme-muted mt-2">
              Superficies sólidas, controles táctiles y cero emojis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4 group-hover:scale-105 transition-transform">
                  <Volume2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  Reproductor VLC con Audio Web API
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Conexión directa del video con AudioContext y GainNode para permitir sobreamplificación hasta 200%, selector de pistas dual/latino, modo miniatura flotante y pantalla completa real.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4 group-hover:scale-105 transition-transform">
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
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4 group-hover:scale-105 transition-transform">
                  <Cloud className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  Gestor de Archivos con Atajos Unificados
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Explorador sincronizado con Google Drive (`PC_Storage`), con botón único de tres puntos (...) para editar, renombrar y eliminar archivos sin saturar pantallas táctiles.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4 group-hover:scale-105 transition-transform">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  Fallback Offline Global
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Detección en tiempo real si el servidor local está apagado, con pantalla completa a 100vh en fondo oscuro y botón de reintento automático sin recarga manual.
                </p>
              </div>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  Seguridad RBAC y Protección de Cuotas
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Control estricto de roles: los paneles de almacenamiento, cuotas y limpieza local son completamente invisibles para usuarios convencionales, reservándose a administradores y moderadores.
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent transition-colors flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-theme-card border border-theme-border flex items-center justify-center text-theme-accent mb-4 group-hover:scale-105 transition-transform">
                  <Palette className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-theme-text mb-2">
                  5 Paletas Cinematográficas Puras
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Superficies 100% opacas y definidas con bordes limpios sin glassmorphism: Redflix, Magic Plus, Anime Studio, Max Cinema y Prime Vision.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= BANNER INVITACIÓN ================= */}
        <div className="mt-16 p-8 rounded-3xl bg-theme-surface border border-theme-border text-center shadow-xl">
          <h2 className="text-xl sm:text-2xl font-bold text-theme-text mb-2">
            Inicia sesión para acceder a tu catálogo
          </h2>
          <p className="text-xs sm:text-sm text-theme-muted mb-6 max-w-lg mx-auto">
            Accede con tus credenciales seguras para comenzar la reproducción y gestión de tus archivos multimedia.
          </p>
          <button
            type="button"
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
