import express from 'express';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authGuard, roleGuard } from '../middleware/auth.js';
import { readMetadata, syncAllMetadata, getSeriesTree } from '../services/metadataService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POSTERS_DIR = path.resolve(__dirname, '../../data/posters');

const router = express.Router();

// GET /api/metadata/poster?slug=... (Público para renderizado de imágenes)
router.get('/poster', async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'Slug requerido' });

    const safeSlug = path.basename(slug);
    const posterPath = path.join(POSTERS_DIR, `${safeSlug}.jpg`);

    if (existsSync(posterPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 días
      const data = await fs.readFile(posterPath);
      return res.send(data);
    }

    return res.status(404).json({ error: 'Póster no encontrado' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al servir póster' });
  }
});

// GET /api/metadata (Requiere viewer+)
router.get('/', authGuard, async (req, res) => {
  try {
    const { path: itemPath } = req.query;
    const metadataMap = await readMetadata();

    if (itemPath) {
      const item = metadataMap[itemPath] || null;
      return res.json({ item });
    }

    return res.json({ metadata: metadataMap });
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener metadatos' });
  }
});

// GET /api/metadata/series (Requiere viewer+)
router.get('/series', authGuard, async (req, res) => {
  try {
    const { category = 'Series' } = req.query;
    const tree = await getSeriesTree(category);
    return res.json({ tree });
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener árbol de series' });
  }
});

// POST /api/movies/sync-metadata (Requiere moderator+)
router.post('/sync-metadata', authGuard, roleGuard('moderator'), async (req, res) => {
  try {
    // Lanzar en background de forma no bloqueante
    syncAllMetadata().catch((err) => console.error('Background sync failed:', err));

    return res.json({
      status: 'started',
      message: 'Sincronización de metadatos iniciada en segundo plano con iTunes, Jikan y Wikipedia'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al iniciar sincronización' });
  }
});

export default router;
