import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { authGuard } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FAVORITES_FILE = path.resolve(__dirname, '../../data/favorites.json');

const router = express.Router();

async function readFavorites() {
  try {
    const raw = await fs.readFile(FAVORITES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeFavorites(data) {
  await fs.writeFile(FAVORITES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

router.use(authGuard);

// GET /api/favorites
router.get('/', async (req, res) => {
  try {
    const favoritesMap = await readFavorites();
    const userId = String(req.user.id);
    const userFavorites = Array.isArray(favoritesMap[userId]) ? favoritesMap[userId] : [];
    return res.json({ favorites: userFavorites });
  } catch (err) {
    return res.status(500).json({ error: 'Error al consultar favoritos' });
  }
});

// POST /api/favorites/toggle
router.post('/toggle', async (req, res) => {
  try {
    const { path: mediaPath } = req.body;
    if (!mediaPath || typeof mediaPath !== 'string') {
      return res.status(400).json({ error: 'Falta parámetro path' });
    }

    const favoritesMap = await readFavorites();
    const userId = String(req.user.id);
    let userFavorites = Array.isArray(favoritesMap[userId]) ? [...favoritesMap[userId]] : [];

    const index = userFavorites.indexOf(mediaPath);
    let isFavorite = false;

    if (index > -1) {
      userFavorites.splice(index, 1);
      isFavorite = false;
    } else {
      userFavorites.push(mediaPath);
      isFavorite = true;
    }

    favoritesMap[userId] = userFavorites;
    await writeFavorites(favoritesMap);

    return res.json({ isFavorite, favorites: userFavorites });
  } catch (err) {
    return res.status(500).json({ error: 'Error al alternar favorito' });
  }
});

export default router;
