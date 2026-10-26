import express from 'express';
import os from 'os';
import { execFile } from 'child_process';
import util from 'util';
import { getAllStats, refreshGoogleDriveQuota, getLocalDiskStats } from '../services/statsService.js';
import { authGuard, roleGuard } from '../middleware/auth.js';

const execFilePromise = util.promisify(execFile);
const router = express.Router();

// Registro de eventos en memoria del sistema
const systemEvents = [
  { timestamp: new Date().toISOString(), level: 'INFO', message: 'Servicio CloudMedia Hub activo en 0.0.0.0:3001' },
  { timestamp: new Date(Date.now() - 1800000).toISOString(), level: 'SUCCESS', message: 'Monitor de cuota de 500GB sincronizado con rclone' },
  { timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'INFO', message: 'Punto de montaje PC_Storage verificado en sistema' }
];

export function logSystemEvent(level, message) {
  systemEvents.unshift({
    timestamp: new Date().toISOString(),
    level,
    message
  });
  if (systemEvents.length > 50) systemEvents.pop();
}

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
    logSystemEvent('INFO', `Actualización manual de cuota iniciada por ${req.user.username}`);
    const [googleDrive, localDisk] = await Promise.all([
      refreshGoogleDriveQuota(),
      getLocalDiskStats()
    ]);

    const result = {
      ...googleDrive,
      googleDrive,
      localDisk
    };

    logSystemEvent('SUCCESS', `Cuota de Google Drive actualizada: ${googleDrive.human_used} / ${googleDrive.human_max} (${googleDrive.percentage}%)`);
    res.json(result);
  } catch (error) {
    console.error('Error refreshing stats:', error);
    logSystemEvent('ERROR', `Fallo al refrescar cuota: ${error.message}`);
    res.status(500).json({ error: 'Error al actualizar cuota de almacenamiento' });
  }
});

// GET /api/stats/system (admin)
router.get('/system', authGuard, roleGuard(['admin']), async (req, res) => {
  try {
    let rcloneActive = false;
    try {
      const { stdout } = await execFilePromise('systemctl', ['is-active', 'rclone-pc.service']);
      rcloneActive = stdout.trim() === 'active';
    } catch {
      rcloneActive = false;
    }

    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    res.json({
      uptimeSeconds: uptime,
      uptimeFormatted: `${hours}h ${minutes}m ${seconds}s`,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      memory: process.memoryUsage(),
      rcloneActive,
      events: systemEvents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
