/**
 * Registrador de Service Worker y Manejador de Instalación PWA (beforeinstallprompt)
 * para CloudMedia Hub.
 */

let deferredInstallPrompt = null;
let isInstallPromptAvailable = false;

// Suscriptores al evento de disponibilidad de instalación PWA
const installListeners = new Set();

/**
 * Escucha global del evento beforeinstallprompt para habilitar instalación nativa PWA
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Previene la barra automática estándar del navegador para poder personalizar el banner o botón
    e.preventDefault();
    deferredInstallPrompt = e;
    isInstallPromptAvailable = true;

    // Notificar a todos los escuchas registrados
    installListeners.forEach((listener) => {
      try {
        listener(deferredInstallPrompt);
      } catch (err) {
        console.warn('[PWA] Error en listener de instalación:', err);
      }
    });

    // Despachar evento personalizado en window
    window.dispatchEvent(
      new CustomEvent('pwa-install-ready', {
        detail: { prompt: deferredInstallPrompt }
      })
    );

    console.log('[PWA] App lista para instalarse. Evento beforeinstallprompt capturado.');
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] CloudMedia Hub ha sido instalada exitosamente como aplicación nativa.');
    deferredInstallPrompt = null;
    isInstallPromptAvailable = false;
    installListeners.forEach((listener) => {
      try {
        listener(null);
      } catch (err) {
        console.warn('[PWA] Error en listener post-instalación:', err);
      }
    });
  });
}

/**
 * Dispara el diálogo de instalación PWA del sistema operativo
 * @returns {Promise<'accepted' | 'dismissed' | 'unavailable'>}
 */
export async function triggerPWAInstall() {
  if (!deferredInstallPrompt) {
    console.log('[PWA] Diálogo de instalación no disponible en este momento');
    return 'unavailable';
  }

  try {
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Elección de instalación del usuario:', choiceResult.outcome);
    if (choiceResult.outcome === 'accepted') {
      deferredInstallPrompt = null;
      isInstallPromptAvailable = false;
    }
    return choiceResult.outcome;
  } catch (err) {
    console.error('[PWA] Error al disparar prompt de instalación:', err);
    return 'unavailable';
  }
}

/**
 * Suscribirse a cambios en la disponibilidad de instalación
 */
export function onPWAInstallChange(callback) {
  installListeners.add(callback);
  if (isInstallPromptAvailable) {
    callback(deferredInstallPrompt);
  }
  return () => installListeners.delete(callback);
}

/**
 * Registra de forma segura el Service Worker
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado con éxito. Scope:', registration.scope);

        // Detectar si hay una nueva versión del Service Worker esperando activación
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[PWA] Nueva versión disponible. Recarga para actualizar.');
              } else {
                console.log('[PWA] Contenido precacheado para funcionamiento offline.');
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[PWA] Registro de Service Worker falló o fue omitido:', error.message);
      });
  });
}

export default registerServiceWorker;
