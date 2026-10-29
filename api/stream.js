import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getGoogleDriveClient } from './utils/googleDrive.js';
import { DEFAULT_CATALOG_ITEMS } from './utils/defaultCatalog.js';

/**
 * Serverless Function /api/stream
 * Transmisión nativa HTTP 206 Partial Content y Remuxing dinámico en tiempo real
 * Compatible tanto con disco local (PC_Storage) como con Google Drive v3 en la nube.
 */
export default async function handler(req, res) {
  // CORS y cabeceras de transmisión universales
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetPath = req.query.path || req.query.file || '';
  const fileIdParam = req.query.fileId || req.query.id || '';
  const audioTrack = req.query.audioTrack !== undefined ? parseInt(req.query.audioTrack, 10) : 0;
  const remux = req.query.remux === 'true';
  const start = Math.max(0, parseFloat(req.query.start || '0'));

  if (!targetPath && !fileIdParam) {
    return res.status(400).json({ error: 'Parámetro path o fileId requerido para streaming' });
  }

  // Resolver contra el catálogo predeterminado si aplica
  const catalogItem = DEFAULT_CATALOG_ITEMS.find(
    (item) =>
      (targetPath && item.path === targetPath) ||
      (fileIdParam && (item.fileId === fileIdParam || item.id === fileIdParam))
  );

  const resolvedPath = targetPath || catalogItem?.path || '';
  const resolvedFileId = fileIdParam || catalogItem?.fileId || catalogItem?.id || '';

  // ================= 1. VERIFICAR ARCHIVO EN ALMACENAMIENTO LOCAL (PC_STORAGE) =================
  const searchRoots = [
    process.env.STORAGE_BASE_DIR,
    '/home/ivnmtz09/GoogleDrive/PC_Storage',
    process.cwd(),
    path.join(process.cwd(), '..')
  ].filter(Boolean);

  let localFilePath = null;
  if (resolvedPath) {
    if (path.isAbsolute(resolvedPath) && fs.existsSync(resolvedPath)) {
      localFilePath = resolvedPath;
    } else {
      for (const root of searchRoots) {
        const full = path.resolve(root, resolvedPath);
        if (fs.existsSync(full)) {
          localFilePath = full;
          break;
        }
      }
    }
  }

  if (localFilePath) {
    try {
      const stat = fs.statSync(localFilePath);
      const fileSize = stat.size;
      const ext = path.extname(localFilePath).toLowerCase();
      const isMkv = ext === '.mkv';
      const mimeType = isMkv ? 'video/x-matroska' : ext === '.mp4' ? 'video/mp4' : 'video/mp4';

      // Petición HEAD (los navegadores verifican cabeceras antes del buffer de video)
      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize,
          'Content-Type': mimeType
        });
        return res.end();
      }

      // Si se solicita remuxing con ffmpeg (para decodificar pistas de audio AC3 o empaquetar MKV a MP4 fluido)
      const hasFfmpeg = fs.existsSync('/usr/bin/ffmpeg');
      if (remux && hasFfmpeg) {
        const ffmpegArgs = [
          '-ss', start.toString(),
          '-i', localFilePath,
          '-map', '0:v:0',
          '-map', `0:a:${audioTrack}?`,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-f', 'mp4',
          '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
          'pipe:1'
        ];

        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Connection': 'keep-alive'
        });

        const ffmpegProc = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'ignore'] });
        let killed = false;
        const cleanup = () => {
          if (!killed) {
            killed = true;
            try { ffmpegProc.kill('SIGKILL'); } catch {}
          }
        };

        req.on('close', cleanup);
        res.on('close', cleanup);
        ffmpegProc.stdout.on('error', cleanup);
        return ffmpegProc.stdout.pipe(res);
      }

      // Transmisión nativa con soporte HTTP 206 Partial Content (Range Requests)
      const rangeHeader = req.headers.range;
      if (rangeHeader && fileSize > 0) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const startByte = parseInt(parts[0], 10) || 0;
        const endByte = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (endByte - startByte) + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${startByte}-${endByte}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600'
        });

        const stream = fs.createReadStream(localFilePath, { start: startByte, end: endByte });
        stream.on('error', (err) => {
          console.error('[Stream File Error]:', err.message);
          if (!res.headersSent) res.status(500).end();
        });
        return stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600'
        });

        const stream = fs.createReadStream(localFilePath);
        stream.on('error', (err) => {
          console.error('[Stream File Error]:', err.message);
          if (!res.headersSent) res.status(500).end();
        });
        return stream.pipe(res);
      }
    } catch (err) {
      console.error('[API Stream Local Error]:', err.message);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Error transmitiendo archivo local', message: err.message });
      }
      return;
    }
  }

  // ================= 2. TRANSMISIÓN EN LA NUBE VÍA GOOGLE DRIVE API v3 =================
  const isDriveId = /^[a-zA-Z0-9_-]{25,}$/.test(resolvedFileId);

  if (isDriveId) {
    try {
      const drive = getGoogleDriveClient();
      const meta = await drive.files.get({
        fileId: resolvedFileId,
        fields: 'id, name, mimeType, size',
        supportsAllDrives: true
      });

      const fileSize = parseInt(meta.data.size, 10) || 0;
      const mimeType = meta.data.mimeType || 'video/mp4';
      const rangeHeader = req.headers.range;

      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize,
          'Content-Type': mimeType
        });
        return res.end();
      }

      if (rangeHeader && fileSize > 0) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const startByte = parseInt(parts[0], 10) || 0;
        const endByte = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (endByte - startByte) + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${startByte}-${endByte}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600'
        });

        const driveStream = await drive.files.get(
          { fileId: resolvedFileId, alt: 'media', supportsAllDrives: true },
          {
            responseType: 'stream',
            headers: { Range: `bytes=${startByte}-${endByte}` }
          }
        );

        driveStream.data.on('error', (err) => {
          console.error('[Stream Drive Error]:', err.message);
          if (!res.headersSent) res.status(500).end();
        });

        return driveStream.data.pipe(res);
      } else {
        res.writeHead(200, {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600'
        });

        const driveStream = await drive.files.get(
          { fileId: resolvedFileId, alt: 'media', supportsAllDrives: true },
          { responseType: 'stream' }
        );

        driveStream.data.on('error', (err) => {
          console.error('[Stream Drive Error]:', err.message);
          if (!res.headersSent) res.status(500).end();
        });

        return driveStream.data.pipe(res);
      }
    } catch (error) {
      console.warn('[API Stream Drive Error]:', error.message);
      if (!res.headersSent) {
        return res.status(503).json({
          error: 'Google Drive no configurado o sin credenciales válidas en Vercel',
          message: error.message
        });
      }
      return;
    }
  }

  // Si no se encuentra el archivo en local y no es un ID de Google Drive válido
  return res.status(404).json({
    error: 'Archivo multimedia no encontrado',
    message: 'El archivo no existe en el disco local montado ni cuenta con un ID de Google Drive válido.',
    path: resolvedPath,
    fileId: resolvedFileId
  });
}
