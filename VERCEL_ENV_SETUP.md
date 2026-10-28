# Guía de Despliegue 100% Serverless en Vercel (Google Drive API)

Esta guía detalla la configuración y despliegue de **CloudMedia Hub** en **Vercel** como una arquitectura **100% Serverless**. No requiere VPS, servidores Express ni túneles de red.

---

## 1. Arquitectura Serverless

```mermaid
flowchart LR
    A["Cliente React (Vite / PWA)"] -->|/api/catalog| B["Vercel Serverless Function"]
    A -->|/api/stream?fileId=...| B
    A -->|/api/chat| B
    A -->|/api/metadata| B
    B -->|REST API v3| C["Google Drive (Tu Cuenta / Carpeta)"]
    B -->|Metadata & Posters| D["TMDB API (The Movie Database)"]
    B -->|Generative AI & Chat| E["Google Gemini AI"]
```

- **Frontend:** SPA en React 19 + Tailwind CSS compilada y servida globalmente desde la CDN Edge de Vercel.
- **Backend:** Funciones Serverless en `/api/*` que se ejecutan bajo demanda con Node.js en Vercel.
- **Almacenamiento y Streaming:** Conexión directa a Google Drive vía REST API v3 con soporte HTTP 206 Partial Content para reproducción fluida en `<video>`.
- **Seguridad:** Las API Keys (`GEMINI_API_KEY`, `TMDB_API_KEY`, credenciales de Google Drive) residen de forma segura en las variables de entorno de Vercel y nunca se exponen al navegador.

---

## 2. Variables de Entorno en Vercel

Configura estas variables en tu proyecto de Vercel (**Settings** &rarr; **Environment Variables**):

| Variable | Requerido | Descripción | Ejemplo / Dónde obtenerla |
|---|---|---|---|
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | **Sí** | ID de la carpeta en Google Drive donde están tus películas | `1abc123XYZ...` (el ID que aparece al final de la URL al abrir la carpeta en Google Drive) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | **Recomendado** | Email de tu Service Account de Google Cloud | `cloudmedia@tu-proyecto.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | **Recomendado** | Clave privada RSA de la Service Account | `"-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----\n"` |
| `TMDB_API_KEY` | **Recomendado** | API Key gratuita de The Movie Database para posters y sinopsis | [The Movie Database API](https://www.themoviedb.org/settings/api) |
| `GEMINI_API_KEY` | **Recomendado** | Clave API de Google Gemini para el asistente CloudMedIA | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GEMINI_MODEL` | Opcional | Modelo de Gemini a utilizar | `gemini-2.5-flash` (por defecto) |

> [!IMPORTANT]
> **Paso Clave para Google Drive:**
> Abre tu carpeta de películas en Google Drive, haz clic en **Compartir**, añade el correo de tu Service Account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`) con rol de **Lector** (Viewer) y guarda los cambios.

---

## 3. Endpoints Serverless Disponibles

- **`GET /api/catalog`**: Lista los archivos `.mp4`, `.mkv`, etc., organizados por películas, series y anime, con sus respectivos IDs y URLs de reproducción.
- **`GET /api/stream?fileId=<ID>`**: Transmite el video desde Google Drive usando `Range` headers y HTTP 206 Partial Content (compatible con scrubbing y reproducción nativa en HTML5 `<video>`).
- **`GET /api/metadata?title=<NOMBRE>`**: Extrae el nombre canónico y obtiene póster oficial, fondo, reparto y sinopsis desde TMDB.
- **`POST /api/chat`**: Asistente de IA CloudMedIA alimentado por Gemini con contexto del catálogo del usuario.
- **`GET /api/stats`**: Reporta la cuota en tiempo real de Google Drive mediante `drive.about.get`.
