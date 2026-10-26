# CloudMedia Hub - Backend API & Streaming Engine

Servidor API y motor de streaming multimedia de alto rendimiento para **CloudMedia Hub**, construido con Node.js, Express y FFmpeg.

## 🚀 Características Principales

1. **Gestión de Cuota y Métricas de Almacenamiento**:
   - Monitorea la cuota de 500 GB de Google Drive desde `/home/ivnmtz09/GoogleDrive/.pc_storage_quota.json`.
   - Endpoint de actualización manual vía `/usr/local/bin/check-pc-storage-quota.sh`.
   - Métricas detalladas del disco local raíz (`/`) con bytes usados, disponibles, totales y porcentaje.

2. **Explorador de Archivos en Google Drive (`PC_Storage`)**:
   - Navegación recursiva de directorios con metadatos completos (nombre, tamaño legible, fecha, categoría multimedia, tipo MIME).
   - Creación de carpetas (`mkdir -p`).
   - Renombrado de archivos y directorios.
   - Eliminación segura con fallback automático de `rclone purge` para entornos FUSE.
   - Subida de archivos grandes mediante `multer`.

3. **Motor de Streaming Adaptativo y Remuxing al Vuelo**:
   - Streaming directo con cabeceras `HTTP 206 Partial Content` (soporte completo de `Range: bytes=start-end`) para adelantar y retroceder sin latencia en `.mp4` y `.webm`.
   - Detección exhaustiva de pistas con `ffprobe` (resolución, codec, duración, pistas de audio dual/multilenguaje con títulos y canales).
   - Remuxing ligero al vuelo con `ffmpeg` para archivos `.mkv` y selección dinámica de pista de audio a contenedor MP4 fragmentado (`frag_keyframe+empty_moov+default_base_moof`) con audio AAC compatible con el 100% de los navegadores.
   - Generación y caché inteligente de miniaturas de video (`image/jpeg`) en `.cache/thumbnails/`.

4. **Escáner y Asistente de Limpieza de Disco**:
   - Escaneo automático en `/home/ivnmtz09/Descargas`, `/home/ivnmtz09/Vídeos` y `/home/ivnmtz09/Videos` en busca de archivos superiores a 50 MB.
   - Acciones de eliminación permanente o migración en segundo plano a Google Drive (`rclone move`) hacia las categorías autorizadas (`Peliculas`, `Series`, `Videos_Personales`, `Backups_PC`, `Documentos`).
   - Monitor de trabajos de migración activos (`/api/cleanup/jobs`).

---

## 🛠️ Requisitos e Instalación

- Node.js 20+
- FFmpeg y FFprobe
- Rclone configurado con remote `gdrive:`

```bash
cd /home/ivnmtz09/Proyectos/cloudmedia-hub/backend
npm install
```

---

## 🚦 Control del Servicio

El servicio puede gestionarse directamente mediante scripts o a través de **systemd user service**:

### Con Scripts:
```bash
./start.sh              # Inicia el backend
./stop.sh               # Detiene el backend
./status.sh             # Muestra estado y verifica conectividad
./test-all-endpoints.sh # Ejecuta la suite de pruebas automatizadas
```

### Con systemd:
```bash
systemctl --user status cloudmedia-hub-backend.service
systemctl --user restart cloudmedia-hub-backend.service
journalctl --user -u cloudmedia-hub-backend.service -f
```

---

## 📡 Catálogo de Endpoints API

### 1. Estadísticas y Cuota
- **`GET /api/stats`**:
  - Devuelve cuota de Google Drive (500 GB) y métricas del disco raíz `/`.
- **`POST /api/stats/refresh`**:
  - Ejecuta la sincronización de cuota con Google Drive y devuelve los datos actualizados.

### 2. Gestión de Archivos (`/home/ivnmtz09/GoogleDrive/PC_Storage`)
- **`GET /api/files?path=<ruta_relativa>`**:
  - Lista elementos con metadatos (`isDirectory`, `size`, `humanSize`, `mimeType`, `category`, `modifiedAt`).
- **`POST /api/files/folder`**:
  - Body: `{ "path": "Peliculas/MiSubcarpeta" }`
- **`POST /api/files/rename`**:
  - Body: `{ "oldPath": "Peliculas/Original", "newPath": "Peliculas/Nuevo" }`
- **`DELETE /api/files?path=<ruta_relativa>`**:
  - Elimina el archivo o carpeta.
- **`POST /api/files/upload`**:
  - Multipart form data: `destinationPath` (campo de texto) y `file` o `files` (archivos adjuntos).

### 3. Streaming y Multimedia
- **`GET /api/media-info?path=<ruta>`**:
  - Analiza el archivo multimedia con `ffprobe` y lista streams de video y pistas de audio.
- **`GET /api/stream?path=<ruta>&audioTrack=<idx>&remux=<true|false>&start=<seg>`**:
  - Streaming con soporte `HTTP 206 Range` o remuxing al vuelo para MKV / dual audio.
- **`GET /api/thumbnail?path=<ruta>`**:
  - Obtiene miniatura JPEG generada al vuelo y cacheada.

### 4. Limpieza de Disco
- **`GET /api/cleanup`**:
  - Lista archivos > 50 MB en Descargas y Vídeos.
- **`GET /api/cleanup/jobs`**:
  - Lista tareas de migración `rclone move` en ejecución o finalizadas.
- **`POST /api/cleanup/action`**:
  - Body:
    ```json
    {
      "action": "move" | "delete",
      "filePath": "/home/ivnmtz09/Descargas/archivo.iso",
      "destinationCategory": "Backups_PC"
    }
    ```
