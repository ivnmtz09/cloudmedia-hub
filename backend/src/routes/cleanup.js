import express from 'express';
import {
  getLargeFiles,
  executeCleanupAction,
  getCleanupJobs
} from '../services/cleanupService.js';
import { authGuard, roleGuard } from '../middleware/auth.js';

const router = express.Router();

// GET /api/cleanup (admin)
router.get('/', authGuard, roleGuard(['admin']), async (req, res) => {
  try {
    const result = await getLargeFiles();
    res.json(result);
  } catch (error) {
    console.error('Error scanning large files for cleanup:', error);
    res.status(500).json({ error: error.message || 'Error al escanear archivos para limpieza' });
  }
});

// GET /api/cleanup/jobs (admin)
router.get('/jobs', authGuard, roleGuard(['admin']), (req, res) => {
  res.json({ jobs: getCleanupJobs() });
});

// POST /api/cleanup/action (admin)
router.post('/action', authGuard, roleGuard(['admin']), async (req, res) => {
  try {
    const { action, filePath, destinationCategory } = req.body;
    if (!action || !filePath) {
      return res.status(400).json({ error: 'Se requieren action y filePath' });
    }

    const result = await executeCleanupAction({ action, filePath, destinationCategory });
    res.json(result);
  } catch (error) {
    console.error('Error executing cleanup action:', error);
    res.status(400).json({ error: error.message || 'Error al ejecutar accion de limpieza' });
  }
});

export default router;
