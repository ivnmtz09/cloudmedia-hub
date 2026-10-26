import express from 'express';
import { getAllStats, refreshGoogleDriveQuota, getLocalDiskStats } from '../services/statsService.js';
import { authGuard, roleGuard } from '../middleware/auth.js';

const router = express.Router();

// GET /api/stats (viewer+)
router.get('/', authGuard, roleGuard(['viewer']), async (req, res) => {
  try {
    const stats = await getAllStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Error al obtener estadisticas de almacenamiento' });
  }
});

// POST /api/stats/refresh (admin)
router.post('/refresh', authGuard, roleGuard(['admin']), async (req, res) => {
  try {
    const [googleDrive, localDisk] = await Promise.all([
      refreshGoogleDriveQuota(),
      getLocalDiskStats()
    ]);

    const result = {
      ...googleDrive,
      googleDrive,
      localDisk
    };

    res.json(result);
  } catch (error) {
    console.error('Error refreshing stats:', error);
    res.status(500).json({ error: 'Error al actualizar cuota de almacenamiento' });
  }
});

export default router;
