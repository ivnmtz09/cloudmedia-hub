/**
 * API Client for CloudMedia Hub Frontend
 * Con interceptor global de red para detección de servidor local offline.
 */

const rawBase = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
export const API_BASE = rawBase.replace(/\/$/, '');

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

/**
 * Interceptor centralizado de fetch con timeout y detección offline
 */
export async function apiFetch(url, options = {}) {
  const timeoutMs = options.timeout ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = getAuthHeaders(options.headers || {});
  const fetchOptions = {
    ...options,
    headers,
    signal: options.signal || controller.signal
  };

  try {
    const res = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // Si recibimos respuesta del servidor, el backend está encendido
    if (isServerOffline) {
      setServerOfflineState(false);
    }

    return res;
  } catch (err) {
    clearTimeout(timeoutId);

    if (isNetworkError(err)) {
      console.warn('[API Interceptor] Servidor local offline o inalcanzable:', err.message);
      setServerOfflineState(true);
    }
    throw err;
  }
}

/**
 * Función para comprobar si el servidor ya volvió a encender
 */
export async function checkServerConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE}/api/stats/system?_t=${Date.now()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.status > 0) {
      setServerOfflineState(false);
      return true;
    }
  } catch {
    // Sigue offline
  }
  setServerOfflineState(true);
  return false;
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
  return `${API_BASE}/api/files/download?${query.toString()}`;
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

    xhr.open('POST', `${API_BASE}/api/files/upload`);
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
export function getStreamUrl(mediaPath, audioTrackIndex = null, remux = false, start = 0) {
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
  return `${API_BASE}/api/stream?${params.toString()}`;
}

export function getThumbnailUrl(mediaPath) {
  return `${API_BASE}/api/thumbnail?path=${encodeURIComponent(mediaPath)}`;
}

export async function fetchMediaInfo(mediaPath) {
  const res = await apiFetch(`${API_BASE}/api/media-info?path=${encodeURIComponent(mediaPath)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al obtener la información técnica del video');
  }
  return await res.json();
}

export async function fetchCatalog() {
  const res = await apiFetch(`${API_BASE}/api/media/catalog`);
  if (!res.ok) throw new Error('Error al obtener el catálogo de medios');
  return await res.json();
}

// ================= METADATA & SERIES =================
export async function fetchMetadata(itemPath = null) {
  const url = `${API_BASE}/api/metadata${itemPath ? `?path=${encodeURIComponent(itemPath)}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  return data.metadata || data.item || {};
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
