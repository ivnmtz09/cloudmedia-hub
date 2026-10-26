<div align="center">
  <img src="docs/logo.svg" width="96" height="96" alt="CloudMedia Hub Logo" />
  <h1>CloudMedia Hub</h1>

  <p align="center">
    <strong>Plataforma cinematográfica modular para streaming multimedia privado de alto rendimiento y gestión de almacenamiento en la nube integrada con rclone, Google Drive, transcodificación en tiempo real y seguridad RBAC.</strong>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Node.js-%3E=18-339933?logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/Playwright-12%20Tests%20Passing-45ba4b?logo=playwright&logoColor=white" alt="Playwright" />
    <img src="https://img.shields.io/badge/rclone-Google%20Drive-orange" alt="rclone" />
  </p>

  <img src="docs/screenshots/01_landing_page.png" alt="CloudMedia Hub Landing Page" width="100%" />
</div>

---

## Indice

- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Galeria del Sistema](#galeria-del-sistema)
  - [1. Landing Page con UX in Motion](#1-landing-page-con-ux-in-motion)
  - [2. Fallback UI Global para Servidor Local Offline](#2-fallback-ui-global-para-servidor-local-offline)
  - [3. Autenticacion y Cambio Obligatorio de Clave](#3-autenticacion-y-cambio-obligatorio-de-clave)
  - [4. Catalogo Principal y Navegacion de Ancho Completo](#4-catalogo-principal-y-navegacion-de-ancho-completo)
  - [5. Showcase de los 5 Temas Cinematicos Puros](#5-showcase-de-los-5-temas-cinematicos-puros)
  - [6. Reproductor VLC con Audio al 200%, Miniatura y Pantalla Completa Real](#6-reproductor-vlc-con-audio-al-200-miniatura-y-pantalla-completa-real)
  - [7. Administrador de Archivos con Atajos Unificados (...)](#7-administrador-de-archivos-con-atajos-unificados-)
  - [8. Dashboard de Almacenamiento y Cuotas Protegido por Roles](#8-dashboard-de-almacenamiento-y-cuotas-protegido-por-roles)
  - [9. Experiencia Movil Responsiva con Safe Area Insets](#9-experiencia-movil-responsiva-con-safe-area-insets)
- [Capacidades Tecnicas y Principios UX in Motion](#capacidades-tecnicas-y-principios-ux-in-motion)
- [Gestion de Usuarios y Roles (RBAC)](#gestion-de-usuarios-y-roles-rbac)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Puesta en Marcha y Despliegue](#puesta-en-marcha-y-despliegue)
- [Variables de Entorno](#variables-de-entorno)
- [Pruebas Automatizadas E2E (Playwright)](#pruebas-automatizadas-e2e)

---

## Arquitectura del Sistema

CloudMedia Hub opera bajo una arquitectura distribuida híbrida:

1. **Frontend en Vercel o Servidor Local:**
   - Aplicación construida en React 19 y Tailwind CSS.
   - Interceptor centralizado de red (`apiFetch`) que detecta fallos de conectividad (`TypeError: Failed to fetch`, `ERR_CONNECTION_REFUSED`, `NetworkError` o timeout).
   - Pantalla de reserva offline global a 100vh (`ServerOfflineFallback`) que desmonta el contenido si el backend no está disponible y proporciona reintento en caliente.
2. **Backend Local (PC Base):**
   - Servidor Node.js y Express montado sobre la estación local donde residen las unidades de almacenamiento físico y el montaje rclone hacia Google Drive (`PC_Storage`).
   - Servicio `ffmpeg` y `ffprobe` para streaming HTTP 206 y remuxing en tiempo real sin precarga de archivos enteros.
   - API REST segura con autenticación basada en JWT, control jerárquico de roles (RBAC) y hashes bcrypt.

---

## Galeria del Sistema

### 1. Landing Page con UX in Motion
Portada interactiva con showcase tridimensional que aplica principios de movimiento (Dimensionalidad, Parallax, Staggered Easing y Value Change), permitiendo previsualizar los módulos del sistema con tarjetas interactivas antes de iniciar sesión.

![Landing Page](docs/screenshots/01_landing_page.png)

---

### 2. Fallback UI Global para Servidor Local Offline
Cuando la PC base se encuentra apagada o la conexión se interrumpe, el frontend en Vercel intercepta el error de red a nivel global, desmonta las rutas y despliega una interfaz a pantalla completa (100vh, fondo oscuro `bg-gray-900`) con el mensaje centrado:
`"Servidor local apagado. Enciende la PC base para acceder a CloudMedia"` y botón de reintento automático.

---

### 3. Autenticacion y Cambio Obligatorio de Clave
Flujo de acceso limpio con fondo oscurecido y difuminado (`backdrop-blur-md`), atrapado de foco accesible (`useFocusTrap`) y exigencia obligatoria de cambio de clave para nuevos usuarios.

![Login Modal](docs/screenshots/02_login_modal.png)

---

### 4. Catalogo Principal y Navegacion de Ancho Completo
Barra superior de navegación de ancho completo (`w-full`) con buscador global (`Ctrl+K`), métricas de cuota (exclusivas para admin/mod) y tarjetas de catálogo con ficha técnica tridimensional reversible.

![Dashboard Redflix](docs/screenshots/03_dashboard_redflix.png)

---

### 5. Showcase de los 5 Temas Cinematicos Puros
Superficies sólidas de alta definición sin glassmorphism translúcido:

| Tema | Previsualizacion | Paleta y Estilo |
| :--- | :--- | :--- |
| **Redflix** *(Predeterminado)* | <img src="docs/screenshots/03_dashboard_redflix.png" width="450" /> | Fondo carbón `#141414`, superficies `#1a1a1a`, acento rojo cinematográfico `#E50914`. |
| **Magic Plus** | <img src="docs/screenshots/04_theme_magic_plus.png" width="450" /> | Fondo azul medianoche `#0d1b2a`, superficies `#1b263b`, acento cian eléctrico `#0072d2`. |
| **Anime Studio** | <img src="docs/screenshots/05_theme_anime_studio.png" width="450" /> | Fondo grafito `#0f0f0f`, superficies `#1a1a1a`, acento naranja vibrante `#F47521`. |
| **Max Cinema** | <img src="docs/screenshots/06_theme_max_cinema.png" width="450" /> | Fondo azul noche `#080b11`, superficies `#121826`, acento púrpura neón `#7C3AED`. |
| **Prime Vision** | <img src="docs/screenshots/07_theme_prime_vision.png" width="450" /> | Fondo azul carbón `#0f172a`, superficies `#1e293b`, acento cian institucional `#00a8e1`. |

#### Selector de Apariencia
![Selector de Apariencia](docs/screenshots/08_theme_switcher_modal.png)

---

### 6. Reproductor VLC con Audio al 200%, Miniatura y Pantalla Completa Real
Motor de reproducción de alto rendimiento montado con React Portal directamente sobre el body:
- **Pantalla Completa Real (F)**: Invoca la API nativa de pantalla completa ocupando el 100% físico del monitor (`100vw` × `100vh`) sin márgenes de ventana.
- **Modo Miniatura Flotante (PiP)**: Minimiza el reproductor a una ventana compacta en la esquina inferior derecha para continuar navegando mientras el video sigue en marcha.
- **Audio Web API hasta 200%**: Ganancia con AudioContext y GainNode, medidor triangular estilo VLC y selector dinámico de pistas de audio (Dual/Latino) y subtítulos.
- **Controles Tactiles Centrales**: Botones táctiles de gran tamaño (`-10s`, `Play/Pause`, `+10s`), doble toque para avanzar o retroceder y control responsivo de volumen.

![Reproductor VLC](docs/screenshots/09_vlc_player_playback.png)

---

### 7. Administrador de Archivos con Atajos Unificados (...)
Tanto en vista cuadrícula como en vista lista, los botones dispersos se unificaron en un único botón de tres puntos (`...`) que despliega un menú contextual flotante para editar/renombrar, eliminar, descargar y reproducir, optimizado para celulares y pantallas de escritorio sin interferir con la navegación táctil.

![Cloud Explorer](docs/screenshots/10_cloud_explorer.png)

---

### 8. Dashboard de Almacenamiento y Cuotas Protegido por Roles
Las tarjetas de consumo de Google Drive, Disco Local del Sistema y el Módulo de Limpieza Local cuentan con validación estricta por roles (`user.role === 'admin' || user.role === 'moderator'`). Para usuarios convencionales (`viewer` / `user`), estos paneles retornan null o derivan directamente al Explorador multimedia sin mostrar ningún rastro de cuotas.

![Admin Dashboard](docs/screenshots/11_admin_dashboard.png)

---

### 9. Experiencia Movil Responsiva con Safe Area Insets
- Altura dinámica con `100dvh` y `safe-area-insets` para prevenir cortes con las barras de navegación de los navegadores móviles.
- Barra inferior fija de 4 botones limpios.
- Menús desplegables con apertura superior para evitar desbordamientos de pantalla.

<div align="center">
  <img src="docs/screenshots/12_mobile_view.png" width="380" alt="Vista Movil" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="docs/screenshots/13_mobile_drawer.png" width="380" alt="Drawer Movil" />
</div>

---

## Capacidades Tecnicas y Principios UX in Motion

1. **Easing (Aceleracion y Suavizado):**
   - Transiciones reguladas por curvas cubic-bezier (`cubic-bezier(0.16, 1, 0.3, 1)`) que simulan inercia física en modales, botones y paneles desplegables.
2. **Offset & Delay (Desfase y Retardo / Stagger):**
   - Aparición secuencial escalonada de 60ms a 120ms entre tarjetas del catálogo, métricas y elementos de la Landing Page para guiar rítmicamente la lectura visual.
3. **Dimensionalidad y Parallax 3D:**
   - Previsualización interactiva con cálculo trigonométrico en tiempo real (`rotateX`, `rotateY`) según la posición del cursor en pantalla.
4. **Value Change (Cambio Dinamico de Valor):**
   - Contadores numéricos progresivos con aceleración no lineal en las métricas de almacenamiento y rendimiento del sistema.
5. **Streaming HTTP 206 y Remuxing MKV en Vivo:**
   - Soporte nativo de rangos parciales y salto de tiempo instantáneo mediante ffmpeg con bandera `-ss` antes del archivo de entrada (`-i`).
6. **Zero Emojis:**
   - Iconografía técnica y consistente suministrada exclusivamente por Lucide React en formato SVG vectorial.

---

## Gestion de Usuarios y Roles (RBAC)

El sistema opera con control de acceso basado en roles jerárquicos:

| Usuario | Rol | Nivel | Permisos Principales |
| :--- | :--- | :---: | :--- |
| `ivnmtz09` | `admin` | **3** | Control total, métricas de cuota, gestión CRUD de usuarios, cambio de roles, ajuste del servidor y sincronización manual de cuota. |
| `baxter`, `bimo`, `juank` | `moderator` | **2** | Streaming, subida clasificada (árbol de series/temporadas), dashboard de cuotas y enriquecimiento de metadatos. |
| `bozame`, `saudiki`, `manu`, `mawi`, `juliao`, `carlos`, `karlos`, `hasmid` | `viewer` | **1** | Acceso al catálogo multimedia, reproducción VLC, búsqueda y perfil. Sin acceso a paneles de cuotas de almacenamiento. |

---

## Estructura del Proyecto

```
cloudmedia-hub/
├── backend/
│   ├── data/
│   │   ├── movies_metadata.json
│   │   ├── users.json
│   │   └── watch_progress.json
│   ├── src/
│   │   ├── middleware/auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── cleanup.js
│   │   │   ├── files.js
│   │   │   ├── movies.js
│   │   │   ├── stats.js
│   │   │   ├── stream.js
│   │   │   └── users.js
│   │   ├── services/
│   │   │   ├── filesService.js
│   │   │   ├── metadataService.js
│   │   │   ├── statsService.js
│   │   │   └── streamService.js
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── common/
│   │   │   │   ├── CloudMediaLogo.jsx
│   │   │   │   ├── ServerOfflineFallback.jsx
│   │   │   │   └── ThemePanel.jsx
│   │   │   ├── explorer/
│   │   │   │   ├── CloudExplorer.jsx
│   │   │   │   └── FileItem.jsx
│   │   │   ├── landing/
│   │   │   │   └── LandingPage.jsx
│   │   │   ├── monitoring/
│   │   │   │   ├── CleanupModule.jsx
│   │   │   │   ├── MonitoringView.jsx
│   │   │   │   └── QuotaDashboard.jsx
│   │   │   └── streaming/
│   │   │       └── VideoPlayerModal.jsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ServerOfflineContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── services/api.js
│   │   ├── styles/animations.css
│   │   └── index.css
│   └── package.json
├── docs/
│   ├── logo.svg
│   └── screenshots/
├── tests/
│   ├── e2e.spec.js
│   └── offline-and-roles.spec.js
├── playwright.config.js
└── README.md
```

---

## Puesta en Marcha y Despliegue

### Prerrequisitos
- **Node.js:** Versión 18 o superior.
- **FFmpeg & FFprobe:** Instalados en el sistema operativo.
- **Rclone:** Servicio `rclone-pc.service` montado en `/home/ivnmtz09/GoogleDrive/PC_Storage`.

### Despliegue Local / Servidor
```bash
# 1. Compilar el cliente frontend
cd frontend
npm run build

# 2. Iniciar o reiniciar el backend en la PC base
systemctl --user restart cloudmedia-hub-backend.service

# 3. Comprobar estado del servicio
systemctl --user status cloudmedia-hub-backend.service
```

### URLs de Acceso
* **Servidor Local:** `http://localhost:3001`
* **Red Local (LAN):** `http://192.168.1.66:3001`
* **Entorno de Desarrollo (Vite):** `http://localhost:5173`

---

## Variables de Entorno

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
```

### Backend (.env)
```env
PORT=3001
HOST=0.0.0.0
STORAGE_BASE_DIR=/home/ivnmtz09/GoogleDrive/PC_Storage
JWT_SECRET=tu_clave_secreta_segura
```

---

## Pruebas Automatizadas E2E

La suite de pruebas automatizadas con Playwright cubre 12 pruebas integrales de extremo a extremo:

```bash
# Ejecutar toda la suite de pruebas
npm test
```

### Casos de Prueba Verificados:
1. **Autenticacion Limpia:** Carga de modal sin presets, con alternador de visibilidad.
2. **Cambio Forzado de Clave:** Intercepción en primer inicio de sesión y actualización obligatoria.
3. **Admin Dashboard:** Navegación lateral fija con 6 secciones operativas y métricas de cuota.
4. **Perfil de Usuario:** Actualización de usuario, cambio voluntario de clave y estadísticas.
5. **Command Palette (`Ctrl+K`):** Atajo de teclado, búsqueda difusa y filtros multidimensionales.
6. **Selector de Temas:** Cambio fluido entre los 5 temas cinemáticos puros.
7. **Reproductor VLC 200%:** Ganancia con Web Audio API, barra triangular y duración exacta en MKV.
8. **Ficha Tecnica 3D:** Animación de giro para consulta de metadatos de medios.
9. **Cierre de Sesion:** Retorno suave a la Landing Page con Toast de confirmación de salida.
10. **Responsividad Movil y Scroll Restoration:** Barra de navegación inferior de 4 botones y restauración de posición de scroll en cero.
11. **Proteccion de Cuotas por Rol:** Los usuarios con rol `viewer` no tienen acceso ni visibilidad al Dashboard de Cuotas ni al módulo de limpieza.
12. **Fallback UI Offline Global:** Al simular la desconexión del backend local, el frontend en Vercel desmonta el contenido y renderiza la pantalla de reserva a 100vh con botón de reintento en caliente.
