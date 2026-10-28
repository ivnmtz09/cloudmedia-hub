/**
 * API Client for CloudMedia Hub Frontend
 * Con interceptor global de red para detección de servidor local offline.
 */

/**
 * API Client for CloudMedia Hub Frontend
 * Con Sistema de Doble Servidor (Auto-Descubrimiento, Failover dinámico y Tolerancia a Fallos).
 */

// ================= 1. VARIABLES DE ENTORNO SERVERLESS VERCEL =================
// Por defecto en Vercel, las peticiones utilizan rutas relativas ('/api/...').
// Si se especifica VITE_API_URL o VITE_API_URL_LOCAL en desarrollo, se utiliza esa URL base.
const rawLocal = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_URL_LOCAL ||
  ''
).replace(/\/$/, '');

const rawVps = (
  import.meta.env.VITE_API_URL_VPS ||
  ''
).replace(/\/$/, '');

export const SERVERS = {
  vercel: {
    id: 'vercel',
    name: 'Vercel Serverless (Google Drive API)',
    shortName: 'Serverless',
    url: '',
    icon: '⚡'
  },
  local: {
    id: 'local',
    name: 'PC Base (Local)',
    shortName: 'Local',
    url: rawLocal || '',
    icon: '💻'
  },
  vps: {
    id: 'vps',
    name: 'Oracle Cloud (VPS)',
    shortName: 'VPS',
    url: rawVps || rawLocal || '',
    icon: '☁️'
  }
};

const SERVER_STORAGE_KEY = 'cmh_active_server_mode'; // 'auto' | 'local' | 'vps'

let currentMode = (typeof localStorage !== 'undefined' && localStorage.getItem(SERVER_STORAGE_KEY)) || 'auto';
let activeServerKey = currentMode !== 'auto' && SERVERS[currentMode] ? currentMode : 'vercel';
let activeBaseUrl = SERVERS[activeServerKey]?.url ?? rawLocal;

export let API_BASE = activeBaseUrl;

export function getActiveBaseUrl() {
  return activeBaseUrl;
}

const serverLatencies = {
  local: null,
  vps: null
};

const serverChangeListeners = new Set();

function notifyServerChange() {
  API_BASE = activeBaseUrl;
  const currentInfo = getActiveServerInfo();
  serverChangeListeners.forEach((listener) => {
    try {
      listener(currentInfo);
    } catch (e) {
      console.error('Error en listener de cambio de servidor:', e);
    }
  });
}

export function subscribeServerChange(listener) {
  serverChangeListeners.add(listener);
  return () => serverChangeListeners.delete(listener);
}

export function getActiveServerInfo() {
  return {
    mode: currentMode,
    activeKey: activeServerKey,
    activeServer: SERVERS[activeServerKey] || SERVERS.local,
    baseUrl: activeBaseUrl,
    hasVps: Boolean(rawVps && rawVps !== rawLocal),
    servers: SERVERS,
    latencies: { ...serverLatencies }
  };
}

export function setActiveServerMode(newMode) {
  if (newMode !== 'auto' && newMode !== 'local' && newMode !== 'vps') {
    newMode = 'auto';
  }
  currentMode = newMode;
  try {
    localStorage.setItem(SERVER_STORAGE_KEY, newMode);
  } catch (e) {}

  if (newMode === 'local') {
    activeServerKey = 'local';
    activeBaseUrl = SERVERS.local.url;
    notifyServerChange();
  } else if (newMode === 'vps' && SERVERS.vps.url) {
    activeServerKey = 'vps';
    activeBaseUrl = SERVERS.vps.url;
    notifyServerChange();
  } else {
    // Modo automático: correr carrera de ping
    runServerRace().catch(() => {});
  }
}

// ================= GESTOR GLOBAL DE ESTADO OFFLINE =================
let isServerOffline = false;
const offlineListeners = new Set();

export function setServerOfflineState(offline) {
  if (isServerOffline !== offline) {
    isServerOffline = offline;
    offlineListeners.forEach((listener) => {
      try {
        listener(isServerOffline);
      } catch (err) {
        console.error('Error en listener offline:', err);
      }
    });
  }
}

export function subscribeServerOffline(listener) {
  offlineListeners.add(listener);
  return () => offlineListeners.delete(listener);
}

export function getServerOfflineState() {
  return isServerOffline;
}

export function isNetworkError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const name = err.name || '';
  return (
    name === 'AbortError' ||
    name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('connection refused') ||
    msg.includes('err_connection_refused') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('err_connection_timed_out') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  );
}

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('cmh_token');
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ================= 2. GESTOR DINÁMICO DE CONEXIÓN & CARRERA DE RED =================

/**
 * Ping rápido a /api/stats con timeout corto de 2.5s
 */
export async function pingServer(serverKey) {
  const srv = SERVERS[serverKey];
  if (!srv || !srv.url) return { ok: false, latency: null };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);
  const startTime = Date.now();
  try {
    const res = await fetch(`${srv.url}/api/stats?_ping=${Date.now()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    serverLatencies[serverKey] = latency;
    // status 200 o 401 (servidor responde y autentica) confirman que el servidor está online
    const isOnline = res.status === 200 || res.status === 401;
    return { ok: isOnline, latency, status: res.status };
  } catch {
    clearTimeout(timeoutId);
    serverLatencies[serverKey] = null;
    return { ok: false, latency: null };
  }
}

/**
 * Carrera de red (Auto-Discovery):
 * Hace ping simultáneo a /api/stats de ambos servidores con timeout de 2.5s.
 * El servidor que responda primero con éxito gana la carrera y se fija como activeBaseUrl.
 * Si el usuario seleccionó un servidor manualmente, respeta esa elección.
 */
export async function runServerRace() {
  // Si el usuario seleccionó un servidor manualmente en localStorage, respetarlo
  if (currentMode !== 'auto' && SERVERS[currentMode]) {
    activeServerKey = currentMode;
    activeBaseUrl = SERVERS[currentMode].url;
    notifyServerChange();
    return getActiveServerInfo();
  }

  // Si no hay VPS configurado o es igual al local, mantenerse en local
  if (!rawVps || rawVps === rawLocal) {
    activeServerKey = 'local';
    activeBaseUrl = SERVERS.local.url;
    notifyServerChange();
    return getActiveServerInfo();
  }

  try {
    // Carrera de promesas: el que responda primero positivamente gana
    const racePromise = Promise.any([
      pingServer('local').then((res) => {
        if (!res.ok) throw new Error('Local falló');
        return 'local';
      }),
      pingServer('vps').then((res) => {
        if (!res.ok) throw new Error('VPS falló');
        return 'vps';
      })
    ]);

    const winnerKey = await racePromise;
    activeServerKey = winnerKey;
    activeBaseUrl = SERVERS[winnerKey].url;
    notifyServerChange();
    console.info(`[Auto-Discovery] ⚡ Servidor más rápido fijado: ${winnerKey.toUpperCase()} (${activeBaseUrl})`);
  } catch {
    console.warn('[Auto-Discovery] Ambos servidores fallaron en la carrera inicial de ping');
  }

  return getActiveServerInfo();
}

/**
 * Conmuta automáticamente al servidor de respaldo
 */
function failoverToBackupServer() {
  const previousKey = activeServerKey;
  const backupKey = previousKey === 'local' ? 'vps' : 'local';

  // Solo conmutar si el backup tiene URL válida y distinta
  if (SERVERS[backupKey].url && SERVERS[backupKey].url !== SERVERS[previousKey].url) {
    console.warn(`[Failover Interceptor] ⚠️ Conmutando automáticamente de ${previousKey.toUpperCase()} a ${backupKey.toUpperCase()} (${SERVERS[backupKey].url})`);
    activeServerKey = backupKey;
    activeBaseUrl = SERVERS[backupKey].url;
    notifyServerChange();
    return true;
  }
  return false;
}

function resolveRequestUrl(pathOrUrl, currentBase) {
  if (typeof pathOrUrl !== 'string') return pathOrUrl;

  if (!pathOrUrl.startsWith('http://') && !pathOrUrl.startsWith('https://')) {
    return `${currentBase}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  // Si es URL absoluta que coincide con algún servidor conocido (Local o VPS),
  // asegurar que se redirija al currentBase activo
  for (const srvKey of ['local', 'vps']) {
    const srvUrl = SERVERS[srvKey]?.url;
    if (srvUrl && pathOrUrl.startsWith(srvUrl)) {
      return `${currentBase}${pathOrUrl.slice(srvUrl.length)}`;
    }
  }

  return pathOrUrl;
}

// ================= 3. INTERCEPTOR DE FAILOVER (TOLERANCIA A FALLOS) =================
/**
 * Interceptor centralizado de fetch con timeout, auto-failover y detección offline
 */
export async function apiFetch(pathOrUrl, options = {}) {
  const timeoutMs = options.timeout ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = getAuthHeaders(options.headers || {});
  const fetchOptions = {
    ...options,
    headers,
    signal: options.signal || controller.signal
  };

  const targetUrl = resolveRequestUrl(pathOrUrl, activeBaseUrl);

  try {
    const res = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);

    // Si recibimos respuesta del servidor, el backend está encendido
    if (isServerOffline) {
      setServerOfflineState(false);
    }

    return res;
  } catch (err) {
    clearTimeout(timeoutId);

    // Interceptor de Failover: si falla por error de red y NO hemos reintentado todavía
    if (isNetworkError(err) && !options._isRetry) {
      const switched = failoverToBackupServer();
      if (switched) {
        try {
          const retryUrl = resolveRequestUrl(pathOrUrl, activeBaseUrl);
          const retryOptions = {
            ...options,
            _isRetry: true
          };
          console.info(`[Failover Interceptor] 🔄 Reintentando petición en ${activeServerKey.toUpperCase()}: ${retryUrl}`);
          return await apiFetch(retryUrl, retryOptions);
        } catch (retryErr) {
          // Solo si el segundo servidor TAMBIÉN falla, se dispara isServerOffline
          if (isNetworkError(retryErr)) {
            console.error('[Failover Interceptor] ❌ Ambos servidores (Local y VPS) fallaron:', retryErr.message);
            setServerOfflineState(true);
          }
          throw retryErr;
        }
      }
    }

    // Si ya era reintento o no hay servidor de respaldo
    if (isNetworkError(err)) {
      console.warn('[API Interceptor] Servidor inalcanzable:', err.message);
      setServerOfflineState(true);
    }
    throw err;
  }
}

/**
 * Función para comprobar si el servidor ya volvió a encender
 */
export async function checkServerConnection() {
  for (const srvKey of [activeServerKey, activeServerKey === 'local' ? 'vps' : 'local']) {
    const srv = SERVERS[srvKey];
    if (!srv?.url) continue;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${srv.url}/api/stats/system?_t=${Date.now()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.status > 0) {
        if (srvKey !== activeServerKey) {
          activeServerKey = srvKey;
          activeBaseUrl = srv.url;
          notifyServerChange();
        }
        setServerOfflineState(false);
        return true;
      }
    } catch {
      // Intentar siguiente
    }
  }
  setServerOfflineState(true);
  return false;
}

// Inicializar carrera de auto-descubrimiento en segundo plano en navegador
if (typeof window !== 'undefined') {
  setTimeout(() => {
    runServerRace().catch(() => {});
  }, 100);
}

// ================= AUTH =================
export async function login(username, password) {
  const res = await apiFetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Credenciales inválidas');
  }

  const data = await res.json();
  if (data.token) {
    localStorage.setItem('cmh_token', data.token);
  }
  return data;
}

export async function fetchCurrentUser() {
  const token = localStorage.getItem('cmh_token');
  if (!token) return null;

  const res = await apiFetch(`${API_BASE}/api/auth/me`);

  if (!res.ok) {
    localStorage.removeItem('cmh_token');
    return null;
  }

  const data = await res.json();
  return data.user;
}

export async function logout() {
  try {
    await apiFetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST'
    });
  } catch {
    // Ignore error
  }
  localStorage.removeItem('cmh_token');
}

export async function changePassword({ currentPassword, newPassword }) {
  const res = await apiFetch(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al cambiar la contraseña');
  }

  const data = await res.json();
  if (data.token) {
    localStorage.setItem('cmh_token', data.token);
  }
  return data;
}

export async function updateProfile({ username }) {
  const res = await apiFetch(`${API_BASE}/api/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar perfil');
  }

  const data = await res.json();
  if (data.token) {
    localStorage.setItem('cmh_token', data.token);
  }
  return data;
}

export async function fetchProfileStats() {
  const res = await apiFetch(`${API_BASE}/api/auth/profile/stats`);

  if (!res.ok) {
    throw new Error('Error al obtener estadísticas del perfil');
  }

  return await res.json();
}

// ================= STATS =================
export async function fetchStats() {
  const res = await apiFetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error('Error al obtener estadísticas de almacenamiento');
  return await res.json();
}

export async function refreshStats() {
  const res = await apiFetch(`${API_BASE}/api/stats/refresh`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Error al actualizar la cuota en rclone');
  return await res.json();
}

export async function fetchSystemStatus() {
  const res = await apiFetch(`${API_BASE}/api/stats/system`);
  if (!res.ok) throw new Error('Error al obtener estado del sistema');
  return await res.json();
}

// ================= FILES =================
export async function fetchFiles(targetPath = '') {
  const url = `${API_BASE}/api/files${targetPath ? `?path=${encodeURIComponent(targetPath)}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al listar los archivos');
  }
  return await res.json();
}

export async function createFolder(parentPath, folderName) {
  const res = await apiFetch(`${API_BASE}/api/files/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentPath, folderName })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al crear la carpeta');
  }
  return await res.json();
}

export async function renameItem(oldPath, newPath) {
  const res = await apiFetch(`${API_BASE}/api/files/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath, newPath })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al renombrar el elemento');
  }
  return await res.json();
}

export async function deleteItem(targetPath) {
  const res = await apiFetch(`${API_BASE}/api/files?path=${encodeURIComponent(targetPath)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al eliminar el elemento');
  }
  return await res.json();
}

export function getDownloadUrl(filePath) {
  const token = localStorage.getItem('cmh_token');
  const query = new URLSearchParams({ path: filePath });
  if (token) {
    query.set('token', token);
  }
  return `${getActiveBaseUrl()}/api/files/download?${query.toString()}`;
}

export function uploadFile(destinationPath, file, onProgress, classification = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('destinationPath', destinationPath || '');

    if (classification.contentType) {
      formData.append('contentType', classification.contentType);
    }
    if (classification.seriesTitle) {
      formData.append('seriesTitle', classification.seriesTitle);
    }
    if (classification.seasonNumber) {
      formData.append('seasonNumber', classification.seasonNumber);
    }
    if (classification.episodeNumber) {
      formData.append('episodeNumber', classification.episodeNumber);
    }

    xhr.open('POST', `${getActiveBaseUrl()}/api/files/upload`);
    const token = localStorage.getItem('cmh_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent, e.loaded, e.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (isServerOffline) setServerOfflineState(false);
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          resolve({ success: true });
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || 'Error al subir el archivo'));
        } catch {
          reject(new Error(`Error ${xhr.status}: Fallo en la subida`));
        }
      }
    };

    xhr.onerror = () => {
      setServerOfflineState(true);
      reject(new Error('Error de red al intentar subir el archivo'));
    };
    xhr.ontimeout = () => {
      setServerOfflineState(true);
      reject(new Error('Tiempo de espera agotado al conectar con el servidor'));
    };

    xhr.send(formData);
  });
}

// ================= STREAMING & MEDIA INFO =================
export function getStreamUrl(itemOrPath, audioTrackIndex = null, remux = false, start = 0) {
  // 1. Si es un objeto de medio directo de Google Drive API
  if (itemOrPath && typeof itemOrPath === 'object') {
    if (itemOrPath.streamUrl) {
      return itemOrPath.streamUrl.startsWith('http') || !getActiveBaseUrl()
        ? itemOrPath.streamUrl
        : `${getActiveBaseUrl()}${itemOrPath.streamUrl}`;
    }
    if (itemOrPath.fileId || itemOrPath.id) {
      const fileId = itemOrPath.fileId || itemOrPath.id;
      const base = getActiveBaseUrl();
      return `${base}/api/stream?fileId=${encodeURIComponent(fileId)}`;
    }
    if (itemOrPath.webContentLink) {
      return itemOrPath.webContentLink;
    }
    if (itemOrPath.directDriveUrl) {
      return itemOrPath.directDriveUrl;
    }
  }

  // 2. Si es una cadena (ruta o ID directo de archivo)
  const mediaPath = typeof itemOrPath === 'string' ? itemOrPath : (itemOrPath?.path || '');

  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    return mediaPath;
  }

  // Si es un ID de archivo de Google Drive (alfanumérico largo)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(mediaPath)) {
    const base = getActiveBaseUrl();
    return `${base}/api/stream?fileId=${encodeURIComponent(mediaPath)}`;
  }

  const token = localStorage.getItem('cmh_token');
  const params = new URLSearchParams({ path: mediaPath });
  if (audioTrackIndex !== null && audioTrackIndex !== undefined) {
    params.set('audioTrack', audioTrackIndex);
  }
  if (remux) {
    params.set('remux', 'true');
  }
  if (start > 0) {
    params.set('start', Math.floor(start));
  }
  if (token) {
    params.set('token', token);
  }
  return `${getActiveBaseUrl()}/api/stream?${params.toString()}`;
}

export function getThumbnailUrl(itemOrPath) {
  if (itemOrPath && typeof itemOrPath === 'object') {
    if (itemOrPath.thumbnailLink) return itemOrPath.thumbnailLink;
    if (itemOrPath.poster_path) return itemOrPath.poster_path;
  }
  const mediaPath = typeof itemOrPath === 'string' ? itemOrPath : (itemOrPath?.path || '');
  return `${getActiveBaseUrl()}/api/thumbnail?path=${encodeURIComponent(mediaPath)}`;
}

export function getSubtitleUrl(mediaPath, subtitleTrackIndex = 0, start = 0) {
  const token = localStorage.getItem('cmh_token');
  const params = new URLSearchParams({
    path: mediaPath,
    track: subtitleTrackIndex
  });
  if (start > 0) {
    params.set('start', Math.floor(start));
  }
  if (token) {
    params.set('token', token);
  }
  return `${getActiveBaseUrl()}/api/stream/subtitles?${params.toString()}`;
}

export async function fetchMediaInfo(mediaPath) {
  const res = await apiFetch(`/api/media-info?path=${encodeURIComponent(mediaPath)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al obtener la información técnica del video');
  }
  return await res.json();
}

export async function fetchCatalog(folderId = null) {
  const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
  const res = await apiFetch(`/api/catalog${query}`);
  if (res.ok) {
    return await res.json();
  }
  // Fallback para entornos con backend tradicional
  const fallback = await apiFetch(`/api/media/catalog`).catch(() => null);
  if (fallback && fallback.ok) return await fallback.json();
  throw new Error('Error al obtener el catálogo de medios');
}

// ================= METADATA & SERIES =================
export async function fetchMetadata(itemPath = null) {
  const url = `/api/metadata${itemPath ? `?path=${encodeURIComponent(itemPath)}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  return data.metadata || data.item || {};
}

export async function fetchMediaItemMetadata(itemPath, name = '', isDir = false) {
  const clean = name || (itemPath ? itemPath.split('/').pop() : '');
  const params = new URLSearchParams({ title: clean, path: itemPath || '' });
  if (isDir) params.set('type', 'serie');
  const res = await apiFetch(`/api/metadata?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.metadata || data.item || null;
}

// ================= AI CHAT (GEMINI + TMDB + SEARCH) =================
export async function sendChatMessage(message, history = [], catalog = []) {
  const res = await apiFetch(`/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, catalog })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al comunicarse con CloudMedIA');
  }

  return await res.json();
}

export async function syncMetadata() {
  const res = await apiFetch(`${API_BASE}/api/movies/sync-metadata`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Error al iniciar sincronización');
  return await res.json();
}

export async function fetchSeriesTree(category = 'Series') {
  const res = await apiFetch(`${API_BASE}/api/metadata/series?category=${category}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.tree || [];
}

// ================= WATCH PROGRESS =================
export async function fetchWatchProgress(mediaPath = null) {
  const url = `${API_BASE}/api/watch-progress${mediaPath ? `?path=${encodeURIComponent(mediaPath)}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.progress;
}

export async function saveWatchProgress({ path: mediaPath, currentTime, duration, season, episode }) {
  const res = await apiFetch(`${API_BASE}/api/watch-progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: mediaPath, currentTime, duration, season, episode })
  });
  if (!res.ok) return null;
  return await res.json();
}

// ================= FAVORITES (MI LISTA) =================
export async function fetchFavorites() {
  try {
    const res = await apiFetch(`${API_BASE}/api/favorites`);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data.favorites) ? data.favorites : [];
      try {
        localStorage.setItem('cmh_favorites', JSON.stringify(list));
      } catch (e) {}
      return list;
    }
  } catch (err) {
    console.warn('[Favorites] Error en fetchFavorites, usando fallback local:', err);
  }

  // Fallback a localStorage
  try {
    const saved = localStorage.getItem('cmh_favorites');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(mediaPath) {
  try {
    const res = await apiFetch(`${API_BASE}/api/favorites/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: mediaPath })
    });
    if (res.ok) {
      const data = await res.json();
      try {
        if (Array.isArray(data.favorites)) {
          localStorage.setItem('cmh_favorites', JSON.stringify(data.favorites));
        }
      } catch (e) {}
      return data;
    }
  } catch (err) {
    console.warn('[Favorites] Error en toggleFavorite backend, aplicando fallback local:', err);
  }

  // Fallback local en localStorage
  try {
    const saved = localStorage.getItem('cmh_favorites');
    let list = saved ? JSON.parse(saved) : [];
    const index = list.indexOf(mediaPath);
    let isFavorite = false;
    if (index > -1) {
      list.splice(index, 1);
      isFavorite = false;
    } else {
      list.push(mediaPath);
      isFavorite = true;
    }
    localStorage.setItem('cmh_favorites', JSON.stringify(list));
    return { isFavorite, favorites: list };
  } catch {
    return { isFavorite: false, favorites: [] };
  }
}

// ================= USERS (ADMIN) =================
export async function fetchUsers() {
  const res = await apiFetch(`${API_BASE}/api/users`);
  if (!res.ok) throw new Error('Error al listar usuarios');
  const data = await res.json();
  return data.users || [];
}

export async function createUser({ username, password, role }) {
  const res = await apiFetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al crear usuario');
  }
  return await res.json();
}

export async function updateUser(id, { password, role }) {
  const res = await apiFetch(`${API_BASE}/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, role })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar usuario');
  }
  return await res.json();
}

export async function deleteUser(id) {
  const res = await apiFetch(`${API_BASE}/api/users/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al eliminar usuario');
  }
  return await res.json();
}

// ================= CLEANUP =================
export async function fetchCleanupFiles() {
  const res = await apiFetch(`${API_BASE}/api/cleanup`);
  if (!res.ok) throw new Error('Error al escanear archivos pesados locales');
  return await res.json();
}

export async function executeCleanupAction({ action, filePath, destinationCategory }) {
  const res = await apiFetch(`${API_BASE}/api/cleanup/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, filePath, destinationCategory })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al ejecutar la acción de limpieza');
  }
  return await res.json();
}
