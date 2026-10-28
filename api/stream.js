import { getGoogleDriveClient } from './utils/googleDrive.js';

/**
 * Serverless Function /api/stream
 * Transmisión nativa HTTP 206 Partial Content desde Google Drive v3 hacia la etiqueta <video> de React
 */
export default async function handler(req, res) {
  // CORS y cabeceras de transmisión
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { fileId } = req.query;
  if (!fileId) {
    return res.status(400).json({ error: 'Parámetro fileId requerido para streaming' });
  }

  try {
    const drive = getGoogleDriveClient();

    // 1. Obtener metadatos esenciales del archivo
    const meta = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
      supportsAllDrives: true
    });

    const fileSize = parseInt(meta.data.size, 10) || 0;
    const mimeType = meta.data.mimeType || 'video/mp4';
    const rangeHeader = req.headers.range;

    // Solo HEAD request (usado por navegadores para comprobar tamaño y capacidad de range)
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize,
        'Content-Type': mimeType
      });
      return res.end();
    }

    // 2. Manejo de Range Requests (HTTP 206 Partial Content) para scrubbing fluido
    if (rangeHeader && fileSize > 0) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600'
      });

      const driveStream = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        {
          responseType: 'stream',
          headers: { Range: `bytes=${start}-${end}` }
        }
      );

      driveStream.data.on('error', (err) => {
        console.error('[Stream Data Error]:', err.message);
        if (!res.headersSent) res.status(500).end();
      });

      return driveStream.data.pipe(res);
    } else {
      // 3. Transmisión completa (HTTP 200)
      res.writeHead(200, {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600'
      });

      const driveStream = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );

      driveStream.data.on('error', (err) => {
        console.error('[Stream Data Error]:', err.message);
        if (!res.headersSent) res.status(500).end();
      });

      return driveStream.data.pipe(res);
    }
  } catch (error) {
    console.error('[API Stream] Error transmitiendo archivo desde Google Drive:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Error de transmisión desde Google Drive',
        message: error.message
      });
    }
  }
}
