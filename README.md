# CloudMedia Hub

Plataforma web modular de streaming de alto rendimiento y gestión de almacenamiento en la nube integrada con rclone, Google Drive, transcodificación en tiempo real y arquitectura de roles RBAC.

---

## Caracteristicas Principales

- **Reproductor Estilo VLC con Motor de Audio Web API (hasta 200%):**
  - Conexión del elemento `<video>` con `AudioContext` y `GainNode` para permitir volumen extendido de 0% a 200%.
  - OSD (On-Screen Display) e indicador triangular con semántica de color: verde (0-100%), ambar (100-150%) y rojo (150-200%).
  - Fix de duracion exacta para contenedores `.mkv` remuxeados mediante sondeo inicial con `ffprobe` y salto temporal instantaneo con `?start=<segundos>` antes de `-i` en ffmpeg.
- **Jerarquia RBAC Estricta y Seguridad de Accesos:**
  - `admin` (Administrador Principal): Control total del sistema, Dashboard de Administracion integral con barra lateral fija (`aside`), gestion CRUD de usuarios, ajuste de roles, eliminacion/renombrado de archivos en la nube, auditoria de eventos y sincronizacion de cuota.
  - `moderator` (Moderador): Permisos de usuario estandar mas subida clasificada (Peliculas, Series, Anime con arbol de temporadas y capitulos) y sincronizacion de metadatos.
  - `viewer` (Usuario Estandar): Acceso a catalogo multimedia, streaming adaptable, busqueda difusa, seccion de perfil y preferencias de apariencia.
- **Autenticacion Limpia y Politica de Seguridad de Contrasenas:**
  - Formulario de login limpio sin atajos o presets visibles de credenciales, con alternador para visibilidad de contrasena (`Eye` / `EyeOff`).
  - Obligatoriedad de cambio de contrasena en el primer inicio de sesion (`mustChangePassword: true`). Si un usuario ingresa con la credencial temporal, el sistema intercepta el flujo y exige una nueva clave de minimo 8 caracteres y confirmacion coincidente antes de desbloquear la plataforma.
- **Modulo de Perfil de Usuario:**
  - Gestion de datos personales (edicion de nombre de usuario con verificacion de colisiones).
  - Pestana de seguridad para actualizacion voluntaria de contrasena.
  - Pestana de estadisticas personales calculadas a partir de `watch_progress.json` (videos iniciados, completados y tiempo acumulado de reproduccion).
- **Dashboard de Administracion con Panel Lateral Fijo (`aside`):**
  - 6 secciones operativas: Resumen del Sistema, Gestion de Usuarios y Roles, Monitoreo de Cuota (500GB), Explorador de Almacenamiento, Auditoria de Limpieza Local y Ajustes del Servidor.
  - Metricas en tiempo real con contadores animados, barras comparativas de almacenamiento (Google Drive vs Disco Local) y registro de auditoria de eventos del sistema.
- **Sincronizacion Inteligente de Metadatos:**
  - Enriquecimiento automatico de titulos mediante iTunes API ES, Jikan API v4 (Anime) y Wikipedia REST API con caraturadas cacheadas localmente.
- **Command Palette (`Ctrl+K`):**
  - Buscador difuso instantaneo con filtros dinamicos por categoria (`Peliculas`, `Series`, `Anime`), resolucion (`1080p`, `720p`) y audio (`DUAL`, `LAT`).
- **Sistema de Diseno y UX Motion:**
  - 5 paletas de color puras y sólidas inspiradas en plataformas de streaming: *Redflix* (Netflix, predeterminado), *Magic Plus* (Disney+), *Anime Studio* (Crunchyroll), *Max Cinema* (Max/HBO) y *Prime Vision* (Prime Video).
  - Eliminacion total de glassmorphism: superficies solidas, opacas y definidas con bordes limpios acordes a cada tema.
  - Animacion de inicio (Splash Screen) cinematografica al inicio de sesion con despliegue de curvas de easing suaves.
  - Reproductor VLC con controles dinamicos que heredan el color del tema y spinner de carga limpio sin textos numericos.
  - Accesibilidad WCAG con areas tactiles minimas de 48px y cero uso de emojis en toda la interfaz (iconografia vectorial SVG de Lucide).

---

## Gestion de Usuarios y Credenciales Iniciales

Todos los usuarios cuentan con la clave inicial temporal `1234567890`. Al iniciar sesion por primera vez, el sistema exige definir una clave personalizada de al menos 8 caracteres.

| Usuario | Rol | Estado Inicial | Permisos Clave |
| :--- | :--- | :--- | :--- |
| `ivnmtz09` | `admin` | Requiere cambio de contrasena | Administrador principal, acceso total a metricas, usuarios y servidor |
| `baxter` | `moderator` | Requiere cambio de contrasena | Moderacion, subida clasificada, sincronizacion de metadatos |
| `bimo` | `moderator` | Requiere cambio de contrasena | Moderacion, subida clasificada, sincronizacion de metadatos |
| `juank` | `moderator` | Requiere cambio de contrasena | Moderacion, subida clasificada, sincronizacion de metadatos |
| `bozame` | `viewer` | Requiere cambio de contrasena | Streaming, exploracion de catalogo, perfil de usuario |
| `saudiki` | `viewer` | Requiere cambio de contrasena | Streaming, exploracion de catalogo, perfil de usuario |
| `manu` | `viewer` | Requiere cambio de contrasena | Streaming, exploracion de catalogo, perfil de usuario |
| `mawi` | `viewer` | Requiere cambio de contrasena | Streaming, exploracion de catalogo, perfil de usuario |
| `juliao` | `viewer` | Requiere cambio de contrasena | Streaming, exploracion de catalogo, perfil de usuario |
| `carlos` | `viewer` | Requiere cambio de contrasena | Streaming, exploracion de catalogo, perfil de usuario |
| `karlos` | `viewer` | Requiere cambio de contrasena | Streaming, exploracion de catalogo, perfil de usuario |
| `hasmid` | `viewer` | Requiere cambio de contrasena | Streaming, exploracion de catalogo, perfil de usuario |

---

## Arquitectura de Software

```
cloudmedia-hub/
├── backend/
│   ├── data/
│   │   ├── movies_metadata.json
│   │   ├── users.json
│   │   └── watch_progress.json
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── files.js
│   │   │   ├── movies.js
│   │   │   ├── stats.js
│   │   │   ├── stream.js
│   │   │   └── users.js
│   │   ├── services/
│   │   │   ├── metadataService.js
│   │   │   └── statsService.js
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   └── UsersPanel.jsx
│   │   │   ├── auth/
│   │   │   │   ├── ForcePasswordChangeModal.jsx
│   │   │   │   ├── LoginModal.jsx
│   │   │   │   └── UserBadge.jsx
│   │   │   ├── common/
│   │   │   ├── explorer/
│   │   │   ├── monitoring/
│   │   │   ├── profile/
│   │   │   │   └── ProfileModal.jsx
│   │   │   ├── search/
│   │   │   └── streaming/
│   │   │       ├── VideoPlayerModal.jsx
│   │   │       └── VLCVolumeControl.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   └── services/
│   │       └── api.js
│   └── package.json
└── tests/
    └── e2e.spec.js
```

---

## Puesta en Marcha y Servicios

### Prerrequisitos
- Node.js >= 18
- `rclone` montado con `rclone-pc.service` (`/home/ivnmtz09/GoogleDrive/PC_Storage`)
- `ffmpeg` y `ffprobe` instalados en el sistema

### Despliegue en Produccion
```bash
# 1. Compilar el cliente frontend
cd frontend
npm run build

# 2. Reiniciar el servicio de usuario en segundo plano
systemctl --user restart cloudmedia-hub-backend.service
```

### URLs de Acceso
- **Local:** `http://localhost:3001`
- **Red LAN:** `http://192.168.1.66:3001`

### Servicios del Sistema
- **Backend API:** `systemctl --user status cloudmedia-hub-backend.service`
- **Punto de Montaje rclone:** `sudo systemctl status rclone-pc.service`
- **Monitor de Cuota:** `/usr/local/bin/check-pc-storage-quota.sh`

---

## Pruebas de Calidad E2E (Playwright)

```bash
npm run test
```
La suite automatizada valida:
1. Formulario de autenticacion limpio y alternador de visibilidad de contrasena.
2. Intercepcion de primer login y cambio forzado de clave.
3. Dashboard de Administracion con panel lateral de navegacion (`aside`) y 6 secciones.
4. Perfil de usuario con pestanas de cuenta, seguridad y estadisticas de reproduccion.
5. Buscador Command Palette con atajos de teclado y filtros combinados.
6. Motor de reproduccion estilo VLC con Web Audio API hasta 200% y salto rapido.
