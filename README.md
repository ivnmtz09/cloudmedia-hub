# CloudMedia Hub 🎬☁️

> Plataforma web modular de streaming y gestión de almacenamiento en la nube integrada con rclone, Google Drive, transcodificación en tiempo real y arquitectura de roles RBAC.

---

## 🌟 Características Principales

- **Streaming HTTP 206 Directo & HLS:** Soporte para contenedores MKV, MP4, WEBM con transcodificación y remuxing en vivo vía `ffmpeg` / `ffprobe`.
- **Selector de Pistas de Audio:** Detección de pistas multi-idioma (Dual, Latino, Inglés, etc.) con selección en caliente.
- **Jerarquía RBAC Estricta:**
  - `viewer` (Usuario): Exploración, streaming, buscador difuso, "Continuar Viendo", selector de temas.
  - `moderator` (Moderador): Permisos de `viewer` + subida clasificada (Películas, Series, Anime con árbol de temporadas y capítulos) + sincronización de metadatos.
  - `admin` (Administrador): Permisos totales + panel CRUD de usuarios, renombrado y eliminación de archivos en nube, recarga de cuotas y herramientas de limpieza.
- **Sincronización Inteligente de Metadatos:** Enriquecimiento automático sin API keys mediante iTunes API ES, Jikan API v4 (Anime) y Wikipedia REST API con carátulas cacheadas localmente.
- **Continuar Viendo & Progreso:** Persistencia por usuario cada 5 segundos de posición temporal, duración y progreso visual de episodios.
- **Command Palette (`Ctrl+K`):** Buscador difuso instantáneo con filtros por categoría (`Películas`, `Series`, `Anime`), calidad (`1080p`, `720p`) y audio (`DUAL`, `LAT`).
- **Sistema de Diseño & UX Motion:**
  - 5 temas visuales: *AlfaCode Obsidian* (por defecto), *Cinema Crimson*, *Cyber Violet*, *Emerald Terminal* y *Daylight Studio*.
  - Curvas de aceleración spring (`cubic-bezier(0.16, 1, 0.3, 1)`), glassmorphism y micro-interacciones.
  - Accesibilidad WCAG con áreas táctiles $\ge 48\text{px}$, navegación por teclado y cero emojis en interfaz (iconografía vectorial SVG pura).
- **Acceso LAN y Producción:** Configuración de host `0.0.0.0` para acceso directo desde red local (`http://192.168.1.66:3001`).

---

## 🔐 Credenciales Predeterminadas

| Usuario | Contraseña | Rol | Capacidades |
| :--- | :--- | :--- | :--- |
| `admin` | `admin2026` | `admin` | Control total, gestión de usuarios, borrado/renombrado, cuotas |
| `moder` | `moder2026` | `moderator` | Subida clasificada, sincronización de metadatos, reproducción |
| `usuario` | `user2026` | `viewer` | Exploración, streaming de video y cambio de preferencias visuales |

---

## 🚀 Puesta en Marcha

### Prerrequisitos
- Node.js $\ge 18$
- `rclone` configurado con servicio `rclone-pc.service`
- `ffmpeg` y `ffprobe` instalados en el sistema

### Modo Producción Integrado (Express sirve el Frontend)
```bash
# 1. Compilar el Frontend
cd frontend
npm run build

# 2. Iniciar el Backend
cd ../backend
node src/server.js
```

### URLs de Acceso
- **Local:** `http://localhost:3001`
- **Red LAN:** `http://192.168.1.66:3001`

---

## 🛠️ Servicios del Sistema

- **Backend Daemon:** `systemctl --user status cloudmedia-hub-backend.service`
- **Montaje rclone:** `sudo systemctl status rclone-pc.service`
- **Monitor de Cuota:** `/usr/local/bin/check-pc-storage-quota.sh`

---

## 🧪 Pruebas Automatizadas E2E

```bash
npm run test
```
Ejecuta la suite completa de Playwright verificando autenticación, RBAC jerárquico, Command Palette, temas y explorador.
