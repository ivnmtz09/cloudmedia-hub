import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { authGuard } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROGRESS_FILE = path.resolve(__dirname, '../../data/watch_progress.json');

const router = express.Router();

async function readProgress() {
  try {
    const raw = await fs.readFile(PROGRESS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeProgress(data) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

router.use(authGuard);

// GET /api/watch-progress?path=...
router.get('/', async (req, res) => {
  try {
    const { path: mediaPath } = req.query;
    const progressMap = await readProgress();

    if (!mediaPath) {
      // Retorna todos los progresos del usuario actual
      const userPrefix = `${req.user.id}:`;
      const userItems = {};
      for (const [key, val] of Object.entries(progressMap)) {
        if (key.startsWith(userPrefix)) {
          const actualPath = key.slice(userPrefix.length);
          userItems[actualPath] = val;
        }
      }
      return res.json({ progress: userItems });
    }

    const key = `${req.user.id}:${mediaPath}`;
    const item = progressMap[key] || null;
    return res.json({ progress: item });
  } catch (err) {
    return res.status(500).json({ error: 'Error al consultar progreso de visualización' });
  }
});

// POST /api/watch-progress
router.post('/', async (req, res) => {
  try {
    const { path: mediaPath, currentTime, duration, season, episode } = req.body;
    if (!mediaPath || currentTime === undefined) {
      return res.status(400).json({ error: 'Faltan parámetros (path, currentTime)' });
    }

    const progressMap = await readProgress();
    const key = `${req.user.id}:${mediaPath}`;

    progressMap[key] = {
      path: mediaPath,
      currentTime: Number(currentTime),
      duration: Number(duration || 0),
      percentage: duration > 0 ? Math.round((currentTime / duration) * 100) : 0,
      season: season ? Number(season) : null,
      episode: episode ? Number(episode) : null,
      updatedAt: new Date().toISOString()
    };

    await writeProgress(progressMap);
    return res.json({ success: true, progress: progressMap[key] });
  } catch (err) {
    return res.status(500).json({ error: 'Error al guardar progreso de visualización' });
  }
});

export default router;
