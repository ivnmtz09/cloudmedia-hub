/**
 * CloudMedia Hub - Service Worker Ligero para PWA y Caching de Shell
 * Diseñado para streaming seguro (excluye peticiones de rango HTTP 206 y endpoints de video)
 */

const CACHE_NAME = 'cloudmedia-shell-v1';

// Recursos esenciales del App Shell a pre-cachear durante la instalación
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// 1. INSTALACIÓN: Pre-cachear el app shell y activar inmediatamente
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(SHELL_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Error pre-cacheando assets de shell:', err);
      })
  );
});

// 2. ACTIVACIÓN: Limpiar cachés antiguas y tomar control de los clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// 3. INTERCEPTOR FETCH: Estrategias de red según el tipo de recurso
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Solo manejar métodos GET
  if (request.method !== 'GET') {
    return;
  }

  // IMPORTANTE PARA STREAMING: NUNCA interceptar peticiones de rango HTTP 206 o endpoints multimedia
  const isRangeRequest = request.headers.has('range');
  const isMediaStream =
    url.pathname.startsWith('/api/stream') ||
    url.pathname.startsWith('/api/download') ||
    url.pathname.startsWith('/api/media/stream') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.mkv') ||
    url.pathname.endsWith('.webm');

  if (isRangeRequest || isMediaStream) {
    // Pasar directo a la red sin intervenir con el Service Worker
    return;
  }

  // Peticiones de API dinámica (/api/): Network-First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // En caso de estar offline devolvemos respuesta JSON informando el estado
        return new Response(
          JSON.stringify({ offline: true, error: 'Sin conexión con el servidor local' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Navegación HTML (SPA Routing): Network-First con fallback a cache '/index.html'
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedShell = await caches.match('/index.html');
        if (cachedShell) return cachedShell;
        const cachedRoot = await caches.match('/');
        if (cachedRoot) return cachedRoot;
        return new Response('CloudMedia Hub Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
    return;
  }

  // Archivos estáticos (Vite bundles, CSS, JS, Fuentes, SVG, Imágenes de UI): Stale-While-Revalidate
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.woff'));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Comportamiento por defecto: Network con fallback a cache si existe
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// 4. Mensajería para actualización en caliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
