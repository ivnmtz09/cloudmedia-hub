# Guía de Configuración de Variables de Entorno en Vercel

Esta guía detalla los pasos exactos para configurar las variables de entorno de **CloudMedia Hub** en el panel de **Vercel** para su despliegue en producción.

---

## 1. Variable de Entorno Principal del Frontend

El cliente HTTP y reproductor multimedia de CloudMedia Hub se comunican con el backend mediante la variable:

| Variable | Descripción | Valor Recomendado |
|---|---|---|
| `VITE_API_URL` | URL base pública de tu servidor backend Node.js / Express | `https://api.tu-dominio.com` o URL de tu VPS/Túnel (sin barra final) |

> [!NOTE]
> **Comportamiento Fallback Automático:**
> Si no defines `VITE_API_URL`, el frontend utilizará automáticamente `window.location.origin`. Esto permite que funcione inmediatamente si sirves frontend y backend bajo el mismo dominio o mediante un reverse proxy (Nginx / Traefik / Caddy).

---

## 2. Pasos para Configurar en el Panel de Vercel

1. Ingresa a [Vercel Dashboard](https://vercel.com/dashboard).
2. Selecciona tu proyecto (`cloudmedia-hub`).
3. Ve a la pestaña **Settings** (Configuración) en la barra superior.
4. En el menú lateral izquierdo, haz clic en **Environment Variables**.
5. Añade la variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://tu-servidor-backend.com` *(ejemplo: la IP o dominio público con HTTPS de tu servidor con rclone y ffmpeg)*
   - **Environment**: Marca **Production**, **Preview** y **Development**.
6. Haz clic en **Save** (Guardar).
7. Ve a la pestaña **Deployments**, haz clic en el menú desplegable `...` del último despliegue y selecciona **Redeploy** para compilar la aplicación con la nueva variable inyectada.

---

## 3. Variables de Entorno del Backend (Para tu VPS / Servidor Local)

Para referencia, si ejecutas el servicio backend en un VPS o servidor dedicado, estas son sus variables (`backend/.env`):

```bash
PORT=3001
JWT_SECRET=tu_clave_secreta_jwt_muy_segura_de_produccion
RCLONE_REMOTE=PC_Storage:
RCLONE_CONFIG_PATH=/home/usuario/.config/rclone/rclone.conf
NODE_ENV=production
```
