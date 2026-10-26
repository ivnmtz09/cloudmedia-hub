import express from 'express';
import {
  handleStream,
  getMediaInfo,
  handleThumbnail
} from '../services/streamService.js';

const router = express.Router();

// GET /api/stream?path=...&audioTrack=...&remux=...&start=...
router.get('/', async (req, res) => {
  try {
    await handleStream(req, res);
  } catch (error) {
    console.error('Error in streaming endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Error al transmitir video' });
    }
  }
});

// GET /api/stream/media-info?path=... (y montado también como /api/media-info)
router.get('/media-info', async (req, res) => {
  try {
    const targetPath = req.query.path;
    if (!targetPath) {
      return res.status(400).json({ error: 'Ruta de archivo no proporcionada' });
    }
    const info = await getMediaInfo(targetPath);
    res.json(info);
  } catch (error) {
    console.error('Error fetching media info:', error);
    res.status(400).json({ error: error.message || 'Error al obtener información multimedia' });
  }
});

// GET /api/stream/thumbnail?path=... (y montado también como /api/thumbnail)
router.get('/thumbnail', async (req, res) => {
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

export default router;
