import express from 'express';
import { authGuard, roleGuard } from '../middleware/auth.js';
import { syncAll } from '../services/metadataService.js';

const router = express.Router();

// POST /api/movies/sync-metadata (admin o moderator)
router.post('/sync-metadata', authGuard, roleGuard(['moderator']), async (req, res) => {
  try {
    // Launch sync in background, return immediately
    const syncPromise = syncAll();
    // Count approximate items (fire and forget)
    syncPromise.catch(err => console.error('[sync-metadata] Background error:', err.message));

    res.json({ status: 'started', message: 'Sincronizacion de metadatos iniciada en segundo plano' });
  } catch (err) {
    console.error('Error starting sync:', err);
    res.status(500).json({ error: 'Error al iniciar sincronizacion' });
  }
});

export default router;
