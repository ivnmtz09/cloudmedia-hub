import { getGoogleDriveClient } from './utils/googleDrive.js';
import { cleanTitleWithRegex } from './utils/gemini.js';

// Extensiones de video reconocidas
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.m4v', '.ts', '.flv'];

function isVideoFile(file) {
  if (!file || !file.name) return false;
  const lowerName = file.name.toLowerCase();
  const hasVideoExt = VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const isVideoMime = file.mimeType && file.mimeType.startsWith('video/');
  return hasVideoExt || isVideoMime;
}

function isFolder(file) {
  return file.mimeType === 'application/vnd.google-apps.folder';
}

function detectCategory(folderPath, fileName) {
  const combined = `${folderPath}/${fileName}`.toLowerCase();
  if (combined.includes('anime') || combined.includes('naruto') || combined.includes('dragon ball') || combined.includes('one piece')) {
    return 'anime';
  }
  if (combined.includes('serie') || combined.includes('temporada') || combined.includes('season') || /s\d{1,2}e\d{1,2}/i.test(combined)) {
    return 'series';
  }
  if (combined.includes('personal') || combined.includes('home') || combined.includes('recuerdo')) {
    return 'personal';
  }
  return 'movies';
}

/**
 * Recorre recursivamente las carpetas de Google Drive hasta una profundidad máxima
 */
async function scanDriveFolder(drive, currentFolderId, relativePath = '', depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return [];

  const items = [];
  let pageToken = null;

  do {
    const query = `'${currentFolderId}' in parents and trashed = false`;
    const res = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, webContentLink, webViewLink, parents)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken: pageToken || undefined
    });

    const files = res.data.files || [];
    pageToken = res.data.nextPageToken;

    for (const file of files) {
      const itemRelativePath = relativePath ? `${relativePath}/${file.name}` : file.name;

      if (isFolder(file)) {
        // Escanear subcarpeta de forma recursiva
        const subItems = await scanDriveFolder(drive, file.id, itemRelativePath, depth + 1, maxDepth);
        items.push(...subItems);
      } else if (isVideoFile(file)) {
        const { cleanTitle, type, seasonNumber, year } = cleanTitleWithRegex(file.name);
        const category = detectCategory(relativePath, file.name);

        // Enlace directo de reproducción vía Vercel Serverless Stream o Google Drive webContentLink
        const streamUrl = `/api/stream?fileId=${file.id}`;
        const directWebContent = file.webContentLink || `https://drive.google.com/uc?id=${file.id}&export=download`;

        items.push({
          id: file.id,
          fileId: file.id,
          name: file.name,
          cleanTitle: cleanTitle || file.name,
          type,
          seasonNumber,
          year,
          category,
          path: itemRelativePath,
          size: file.size ? parseInt(file.size, 10) : 0,
          mimeType: file.mimeType || 'video/mp4',
          webContentLink: directWebContent,
          streamUrl,
          directDriveUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          thumbnailLink: file.thumbnailLink || null,
          modifiedTime: file.modifiedTime || new Date().toISOString()
        });
      }
    }
  } while (pageToken);

  return items;
}

/**
 * Serverless Function /api/catalog
 * Endpoint que lista el catálogo de películas y series directamente desde Google Drive v3
 */
export default async function handler(req, res) {
  // Encabezados CORS universales para Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const folderId = req.query.folderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!folderId) {
    return res.status(400).json({
      error: 'ID de carpeta raíz de Google Drive no especificado.',
      help: 'Configura la variable de entorno GOOGLE_DRIVE_ROOT_FOLDER_ID en Vercel o pásala como parámetro: /api/catalog?folderId=TU_FOLDER_ID'
    });
  }

  try {
    const drive = getGoogleDriveClient();
    const allItems = await scanDriveFolder(drive, folderId);

    const movies = allItems.filter((i) => i.category === 'movies');
    const series = allItems.filter((i) => i.category === 'series');
    const anime = allItems.filter((i) => i.category === 'anime');
    const personal = allItems.filter((i) => i.category === 'personal');

    return res.status(200).json({
      success: true,
      folderId,
      total: allItems.length,
      movies,
      series,
      anime,
      personal,
      all: allItems
    });
  } catch (error) {
    console.error('[API Catalog] Error consultando Google Drive API v3:', error);
    return res.status(500).json({
      error: 'Fallo al consultar el catálogo de Google Drive',
      message: error.message,
      details: error.stack
    });
  }
}

