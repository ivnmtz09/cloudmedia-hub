import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, execFile } from 'child_process';
import util from 'util';
import mime from 'mime-types';
import { PC_STORAGE_ROOT, CLEANUP_SCAN_DIRS, CACHE_DIR } from '../config.js';
import { resolveSafePath } from '../utils/security.js';
import { formatBytes } from '../utils/formatters.js';

const execFilePromise = util.promisify(execFile);

// Asegurar que exista el directorio de caché de miniaturas
if (!fsSync.existsSync(CACHE_DIR)) {
  fsSync.mkdirSync(CACHE_DIR, { recursive: true });
}

export function getCorsHeaders(req) {
  const origin = req?.headers?.origin || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type, Accept, Origin',
    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
  };
}

export function resolveMediaFilePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Ruta no especificada');
  }

  // Si es absoluta, validar contra PC_STORAGE_ROOT o CLEANUP_SCAN_DIRS
  if (path.isAbsolute(inputPath)) {
    const isUnderStorage = inputPath.startsWith(path.resolve(PC_STORAGE_ROOT));
    const isUnderCleanup = CLEANUP_SCAN_DIRS.some((dir) => inputPath.startsWith(path.resolve(dir)));
    if (!isUnderStorage && !isUnderCleanup) {
      throw new Error('Ruta de archivo no autorizada');
    }
    return inputPath;
  }

  // Si es relativa, resolver dentro de PC_STORAGE_ROOT
  return resolveSafePath(PC_STORAGE_ROOT, inputPath);
}

export async function getMediaInfo(targetPath) {
  const fullPath = resolveMediaFilePath(targetPath);

  const stat = await fs.stat(fullPath);
  if (!stat.isFile()) {
    throw new Error('El elemento no es un archivo');
  }

  const { stdout } = await execFilePromise('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    fullPath
  ], { timeout: 15000 });

  const data = JSON.parse(stdout);
  const streams = data.streams || [];
  const format = data.format || {};

  const videoStream = streams.find((s) => s.codec_type === 'video');
  const audioStreams = streams.filter((s) => s.codec_type === 'audio');
  const subtitleStreams = streams.filter((s) => s.codec_type === 'subtitle');

  let durationSec = parseFloat(format.duration || (videoStream && videoStream.duration) || 0);

  // Formato MM:SS o HH:MM:SS
  const formatDuration = (sec) => {
    const totalSeconds = Math.floor(sec);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const audioTracks = audioStreams.map((stream, idx) => ({
    index: idx,
    streamIndex: stream.index,
    codec: stream.codec_name,
    channels: stream.channels,
    channelLayout: stream.channel_layout || `${stream.channels} ch`,
    sampleRate: stream.sample_rate,
    bitRate: stream.bit_rate ? parseInt(stream.bit_rate, 10) : null,
    language: (stream.tags && stream.tags.language) || 'und',
    title: (stream.tags && (stream.tags.title || stream.tags.handler_name)) || `Pista ${idx + 1}`,
    isDefault: stream.disposition ? stream.disposition.default === 1 : false
  }));

  const subtitleTracks = subtitleStreams.map((stream, idx) => ({
    index: idx,
    streamIndex: stream.index,
    codec: stream.codec_name,
    language: (stream.tags && stream.tags.language) || 'und',
    title: (stream.tags && (stream.tags.title || stream.tags.handler_name)) || `Subtítulo ${idx + 1}`,
    isDefault: stream.disposition ? stream.disposition.default === 1 : false
  }));

  return {
    filename: path.basename(fullPath),
    fullPath,
    format: format.format_name,
    duration: durationSec,
    durationFormatted: formatDuration(durationSec),
    size: stat.size,
    humanSize: formatBytes(stat.size),
    bitRate: format.bit_rate ? parseInt(format.bit_rate, 10) : null,
    video: videoStream ? {
      index: videoStream.index,
      codec: videoStream.codec_name,
      width: videoStream.width,
      height: videoStream.height,
      aspectRatio: videoStream.width && videoStream.height ? `${videoStream.width}:${videoStream.height}` : null,
      fps: videoStream.r_frame_rate ? Math.round(eval(videoStream.r_frame_rate) || 0) : null,
      bitRate: videoStream.bit_rate ? parseInt(videoStream.bit_rate, 10) : null
    } : null,
    audioTracks,
    subtitleTracks
  };
}

export async function handleStream(req, res) {
  const corsHeaders = getCorsHeaders(req);

  // Manejar preflight OPTIONS de CORS de inmediato
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  const targetPath = req.query.path;
  const fullPath = resolveMediaFilePath(targetPath);

  const stat = await fs.stat(fullPath);
  if (!stat.isFile()) {
    return res.status(400).json({ error: 'La ruta no corresponde a un archivo' });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const isMkv = ext === '.mkv';
  const isAvi = ext === '.avi';
  // Si remux=false está explícito, permitir stream directo (ej. para clientes VLC o pruebas Range)
  const forceRemux = req.query.remux === 'true' || (req.query.remux !== 'false' && (req.query.audioTrack !== undefined || isMkv || isAvi));

  // Manejar solicitudes HEAD de forma inmediata
  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Type': mime.lookup(fullPath) || 'video/mp4',
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      ...corsHeaders
    });
    return res.end();
  }

  if (forceRemux) {
    // Modo Remuxing ligero al vuelo con FFmpeg
    const startSec = Math.max(0, parseFloat(req.query.start || '0'));
    const audioTrackIdx = req.query.audioTrack !== undefined ? parseInt(req.query.audioTrack, 10) : 0;

    const ffmpegArgs = [
      '-ss', startSec.toString(),
      '-i', fullPath,
      '-map', '0:v:0',
      '-map', `0:a:${audioTrackIdx}?`,
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
      'Connection': 'keep-alive',
      ...corsHeaders
    });

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'ignore'] });

    let killed = false;
    const cleanupProcess = () => {
      if (!killed) {
        killed = true;
        try {
          ffmpegProcess.kill('SIGKILL');
        } catch {
          // Ignorar
        }
      }
    };

    req.on('close', cleanupProcess);
    res.on('close', cleanupProcess);
    res.on('finish', cleanupProcess);
    ffmpegProcess.stdout.on('error', cleanupProcess);

    ffmpegProcess.stdout.pipe(res);

    ffmpegProcess.on('error', (err) => {
      cleanupProcess();
      console.error('Error en proceso ffmpeg remux:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error durante el remuxing de video' });
      }
    });

    return;
  }

  // Modo Direct Streaming con HTTP 206 Partial Content (soporte Range)
  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = mime.lookup(fullPath) || 'video/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize) || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunkSize = (end - start) + 1;
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      ...corsHeaders
    };

    res.writeHead(206, headers);
    const stream = fsSync.createReadStream(fullPath, { start, end });
    stream.pipe(res);
  } else {
    const headers = {
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      ...corsHeaders
    };

    res.writeHead(200, headers);
    const stream = fsSync.createReadStream(fullPath);
    stream.pipe(res);
  }
}

export async function handleSubtitles(req, res) {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  const targetPath = req.query.path;
  if (!targetPath) {
    return res.status(400).json({ error: 'Ruta de archivo no proporcionada' });
  }

  const fullPath = resolveMediaFilePath(targetPath);
  const stat = await fs.stat(fullPath);
  if (!stat.isFile()) {
    return res.status(400).json({ error: 'La ruta no corresponde a un archivo' });
  }

  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      ...corsHeaders
    });
    return res.end();
  }

  const trackIdx = parseInt(req.query.track || '0', 10);
  const startSec = Math.max(0, parseFloat(req.query.start || '0'));

  const ffmpegArgs = [];
  if (startSec > 0) {
    ffmpegArgs.push('-ss', startSec.toString());
  }
  ffmpegArgs.push(
    '-i', fullPath,
    '-map', `0:s:${trackIdx}`,
    '-f', 'webvtt',
    'pipe:1'
  );

  res.writeHead(200, {
    'Content-Type': 'text/vtt; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
    'Connection': 'keep-alive',
    ...corsHeaders
  });

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'ignore'] });

  let killed = false;
  const cleanupProcess = () => {
    if (!killed) {
      killed = true;
      try {
        ffmpegProcess.kill('SIGKILL');
      } catch {
        // Ignorar
      }
    }
  };

  req.on('close', cleanupProcess);
  res.on('close', cleanupProcess);
  res.on('finish', cleanupProcess);
  ffmpegProcess.stdout.on('error', cleanupProcess);

  ffmpegProcess.stdout.pipe(res);

  ffmpegProcess.on('error', (err) => {
    cleanupProcess();
    console.error('Error en proceso ffmpeg subtitles:', err);
    if (!res.headersSent) {
      res.writeHead(200, {
        'Content-Type': 'text/vtt; charset=utf-8',
        ...corsHeaders
      });
      res.end('WEBVTT\n\n');
    }
  });
}

export async function handleThumbnail(req, res) {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  res.set(corsHeaders);
  const targetPath = req.query.path;
  const fullPath = resolveMediaFilePath(targetPath);

  const stat = await fs.stat(fullPath);
  if (!stat.isFile()) {
    return res.status(400).json({ error: 'La ruta no corresponde a un archivo' });
  }

  // Generar hash de caché basado en ruta y fecha de modificación
  const hash = crypto.createHash('md5').update(`${fullPath}:${stat.mtimeMs}`).digest('hex');
  const cacheFile = path.join(CACHE_DIR, `${hash}.jpg`);

  // Verificar si ya existe en caché
  try {
    await fs.access(cacheFile);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(cacheFile);
  } catch {
    // No existe en caché, proceder a generarla
  }

  // Intentar generar a 00:01:30 o fallback a 00:00:05
  let seekTime = '00:01:30';
  try {
    // Comprobar duración con ffprobe para no buscar más allá del final
    const { stdout } = await execFilePromise('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      fullPath
    ], { timeout: 8000 });
    const probe = JSON.parse(stdout);
    const duration = parseFloat(probe.format?.duration || 0);
    if (duration > 0 && duration <= 90) {
      const targetSec = Math.max(1, Math.floor(duration * 0.2));
      seekTime = `00:00:${targetSec.toString().padStart(2, '0')}`;
    }
  } catch {
    // Si ffprobe falla, intentar con 00:01:30 por defecto
  }

  try {
    await execFilePromise('ffmpeg', [
      '-ss', seekTime,
      '-i', fullPath,
      '-vframes', '1',
      '-update', '1',
      '-q:v', '2',
      '-y',
      cacheFile
    ], { timeout: 15000 });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(cacheFile);
  } catch (err) {
    // Si falla a 90s, intentar fallback a 00:00:01
    try {
      await execFilePromise('ffmpeg', [
        '-ss', '00:00:01',
        '-i', fullPath,
        '-vframes', '1',
        '-update', '1',
        '-q:v', '2',
        '-y',
        cacheFile
      ], { timeout: 15000 });

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(cacheFile);
    } catch (fallbackErr) {
      console.error('Error generando miniatura:', fallbackErr.message);
      return res.status(500).json({ error: 'No se pudo generar la miniatura del video' });
    }
  }
}
