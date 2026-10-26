import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { PORT, HOST } from './config.js';
import statsRouter from './routes/stats.js';
import filesRouter from './routes/files.js';
import streamRouter from './routes/stream.js';
import cleanupRouter from './routes/cleanup.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import metadataRouter from './routes/metadata.js';
import moviesRouter from './routes/movies.js';
import watchProgressRouter from './routes/watchProgress.js';
import { getMediaInfo, handleThumbnail } from './services/streamService.js';
import { listFiles } from './services/filesService.js';
import { authGuard, roleGuard } from './middleware/auth.js';
import { syncAll } from './services/metadataService.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Public endpoints (no auth required) ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CloudMedia Hub API',
    timestamp: new Date().toISOString()
  });
});

// Auth routes (login is public)
app.use('/api/auth', authRouter);

// Stream is public for embedded player
app.use('/api/stream', streamRouter);

// Thumbnail public (for embeds)
app.get('/api/thumbnail', async (req, res) => {
  try {
    const targetPath = req.query.path;
    if (!targetPath) {
      return res.status(400).json({ error: 'Ruta de archivo no proporcionada' });
    }
    await handleThumbnail(req, res);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Error al generar miniatura' });
    }
  }
});

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Protected and specialized routes ---
app.use('/api/stats', statsRouter);
app.use('/api/files', filesRouter);
app.use('/api/cleanup', cleanupRouter);
app.use('/api/users', usersRouter);
app.use('/api/metadata', metadataRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/watch-progress', watchProgressRouter);

// /api/media/catalog (viewer+)
app.get('/api/media/catalog', authGuard, roleGuard(['viewer']), async (req, res) => {
  try {
    const categories = ['Peliculas', 'Series', 'Videos_Personales', 'Anime'];
    const result = { movies: [], series: [], personal: [], anime: [], all: [] };
    for (const cat of categories) {
      try {
        const data = await listFiles(cat);
        const videoFiles = (data.items || []).filter(item => !item.isDirectory && item.category === 'video');
        const mapped = videoFiles.map(f => ({
          id: f.path,
          name: f.name,
          title: f.name.replace(/\.[^/.]+$/, '').replace(/[\._-]/g, ' '),
          path: f.path,
          size: f.size,
          humanSize: f.humanSize,
          category: cat,
          extension: f.extension,
          modifiedAt: f.modifiedAt
        }));
        if (cat === 'Peliculas') result.movies = mapped;
        if (cat === 'Series') result.series = mapped;
        if (cat === 'Videos_Personales') result.personal = mapped;
        if (cat === 'Anime') result.anime = mapped;
        result.all.push(...mapped);
      } catch {
        // Ignorar si carpeta vacia o no existe aun
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/media-info (viewer+)
app.get('/api/media-info', authGuard, roleGuard(['viewer']), async (req, res) => {
  try {
    const targetPath = req.query.path;
    if (!targetPath) {
      return res.status(400).json({ error: 'Ruta de archivo no proporcionada' });
    }
    const info = await getMediaInfo(targetPath);
    res.json(info);
  } catch (error) {
    console.error('Error fetching media info:', error);
    res.status(400).json({ error: error.message || 'Error al obtener informacion multimedia' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: err.message || 'Error interno del servidor',
      status: 500
    });
  }
});

// Servir frontend compilado (relativo al backend)
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback: todas las rutas no-API retornan index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDist, 'index.html'));
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`===============================================`);
  console.log(` CloudMedia Hub Backend activo en http://${HOST}:${PORT}`);
  console.log(` Directorio base: /home/ivnmtz09/GoogleDrive/PC_Storage`);
  console.log(`===============================================`);
  console.log(` Endpoints disponibles:`);
  console.log(`   GET  /api/health                  (publico)`);
  console.log(`   POST /api/auth/login               (publico)`);
  console.log(`   GET  /api/auth/me                  (viewer+)`);
  console.log(`   POST /api/auth/logout              (viewer+)`);
  console.log(`   GET  /api/stream                   (publico)`);
  console.log(`   GET  /api/thumbnail                (publico)`);
  console.log(`   GET  /api/files                    (viewer+)`);
  console.log(`   GET  /api/files/download           (viewer+)`);
  console.log(`   POST /api/files/folder             (moderator+)`);
  console.log(`   POST /api/files/rename             (admin)`);
  console.log(`   DELETE /api/files                  (admin)`);
  console.log(`   POST /api/files/upload             (moderator+)`);
  console.log(`   GET  /api/stats                    (viewer+)`);
  console.log(`   POST /api/stats/refresh            (admin)`);
  console.log(`   GET  /api/cleanup                  (admin)`);
  console.log(`   POST /api/cleanup/action           (admin)`);
  console.log(`   GET  /api/media/catalog            (viewer+)`);
  console.log(`   GET  /api/media-info               (viewer+)`);
  console.log(`   GET  /api/metadata                 (viewer+)`);
  console.log(`   GET  /api/metadata/poster          (publico)`);
  console.log(`   GET  /api/metadata/series          (viewer+)`);
  console.log(`   POST /api/movies/sync-metadata     (moderator+)`);
  console.log(`   GET  /api/watch-progress           (viewer+)`);
  console.log(`   POST /api/watch-progress           (viewer+)`);
  console.log(`   GET  /api/users                    (admin)`);
  console.log(`   POST /api/users                    (admin)`);
  console.log(`   PUT  /api/users/:id                (admin)`);
  console.log(`   DELETE /api/users/:id              (admin)`);
  console.log(`===============================================`);

  // Background metadata sync (non-blocking)
  syncAll().catch(err => console.error('[startup] syncAll error:', err.message));
});

export default app;
