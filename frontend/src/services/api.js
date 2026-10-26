/**
 * API Client for CloudMedia Hub Frontend
 */

export const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('cmh_token');
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ================= AUTH =================
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
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

  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    localStorage.removeItem('cmh_token');
    return null;
  }

  const data = await res.json();
  return data.user;
}

export async function logout() {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch {
    // Ignore error
  }
  localStorage.removeItem('cmh_token');
}

// ================= STATS =================
export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error al obtener estadísticas de almacenamiento');
  return await res.json();
}

export async function refreshStats() {
  const res = await fetch(`${API_BASE}/api/stats/refresh`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error al actualizar la cuota en rclone');
  return await res.json();
}

// ================= FILES =================
export async function fetchFiles(targetPath = '') {
  const url = `${API_BASE}/api/files${targetPath ? `?path=${encodeURIComponent(targetPath)}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al listar los archivos');
  }
  return await res.json();
}

export async function createFolder(parentPath, folderName) {
  const res = await fetch(`${API_BASE}/api/files/folder`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ parentPath, folderName })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al crear la carpeta');
  }
  return await res.json();
}

export async function renameItem(oldPath, newPath) {
  const res = await fetch(`${API_BASE}/api/files/rename`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ oldPath, newPath })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al renombrar el elemento');
  }
  return await res.json();
}

export async function deleteItem(targetPath) {
  const res = await fetch(`${API_BASE}/api/files?path=${encodeURIComponent(targetPath)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
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

    xhr.onerror = () => reject(new Error('Error de red al intentar subir el archivo'));
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
  const res = await fetch(`${API_BASE}/api/media-info?path=${encodeURIComponent(mediaPath)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al obtener la información técnica del video');
  }
  return await res.json();
}

export async function fetchCatalog() {
  const res = await fetch(`${API_BASE}/api/media/catalog`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error al obtener el catálogo de medios');
  return await res.json();
}

// ================= METADATA & SERIES =================
export async function fetchMetadata(itemPath = null) {
  const url = `${API_BASE}/api/metadata${itemPath ? `?path=${encodeURIComponent(itemPath)}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) return {};
  const data = await res.json();
  return data.metadata || data.item || {};
}

export async function syncMetadata() {
  const res = await fetch(`${API_BASE}/api/movies/sync-metadata`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error al iniciar sincronización');
  return await res.json();
}

export async function fetchSeriesTree(category = 'Series') {
  const res = await fetch(`${API_BASE}/api/metadata/series?category=${category}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.tree || [];
}

// ================= WATCH PROGRESS =================
export async function fetchWatchProgress(mediaPath = null) {
  const url = `${API_BASE}/api/watch-progress${mediaPath ? `?path=${encodeURIComponent(mediaPath)}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.progress;
}

export async function saveWatchProgress({ path: mediaPath, currentTime, duration, season, episode }) {
  const res = await fetch(`${API_BASE}/api/watch-progress`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ path: mediaPath, currentTime, duration, season, episode })
  });
  if (!res.ok) return null;
  return await res.json();
}

// ================= USERS (ADMIN) =================
export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/api/users`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Error al listar usuarios');
  const data = await res.json();
  return data.users || [];
}

export async function createUser({ username, password, role }) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password, role })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al crear usuario');
  }
  return await res.json();
}

export async function updateUser(id, { password, role }) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ password, role })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar usuario');
  }
  return await res.json();
}

export async function deleteUser(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al eliminar usuario');
  }
  return await res.json();
}

// ================= CLEANUP =================
export async function fetchCleanupFiles() {
  const res = await fetch(`${API_BASE}/api/cleanup`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Error al escanear archivos pesados locales');
  return await res.json();
}

export async function executeCleanupAction({ action, filePath, destinationCategory }) {
  const res = await fetch(`${API_BASE}/api/cleanup/action`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action, filePath, destinationCategory })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al ejecutar la acción de limpieza');
  }
  return await res.json();
}
