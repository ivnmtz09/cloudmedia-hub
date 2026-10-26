import express from 'express';
import path from 'path';
import { PC_STORAGE_ROOT } from '../config.js';
import { resolveSafePath } from '../utils/security.js';
import { authGuard, roleGuard } from '../middleware/auth.js';
import {
  listFiles,
  createFolder,
  renameItem,
  deleteItem,
  uploadMiddleware
} from '../services/filesService.js';

const router = express.Router();

// GET /api/files?path=... (viewer+)
router.get('/', authGuard, roleGuard(['viewer']), async (req, res) => {
  try {
    const targetPath = req.query.path || '';
    const result = await listFiles(targetPath);
    res.json(result);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(400).json({ error: error.message || 'Error al listar archivos' });
  }
});

// GET /api/files/download?path=... (viewer+)
router.get('/download', authGuard, roleGuard(['viewer']), async (req, res) => {
  try {
    const targetPath = req.query.path;
    if (!targetPath) {
      return res.status(400).json({ error: 'Ruta no especificada para descarga' });
    }
    const fullPath = resolveSafePath(PC_STORAGE_ROOT, targetPath);
    res.download(fullPath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(400).json({ error: error.message || 'Error al descargar archivo' });
  }
});

// POST /api/files/folder (moderator+)
router.post('/folder', authGuard, roleGuard(['moderator']), async (req, res) => {
  try {
    const { path: folderPath, parentPath, folderName } = req.body;
    let targetParent = parentPath || '';
    let name = folderName || '';

    if (folderPath && !folderName) {
      targetParent = folderPath;
    }

    const result = await createFolder(targetParent, name);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(400).json({ error: error.message || 'Error al crear carpeta' });
  }
});

// POST /api/files/rename (admin)
router.post('/rename', authGuard, roleGuard(['admin']), async (req, res) => {
  try {
    const { oldPath, newPath, path: itemPath, newName } = req.body;
    let from = oldPath;
    let to = newPath;

    if (itemPath && newName && (!oldPath || !newPath)) {
      from = itemPath;
      to = path.join(path.dirname(itemPath), newName);
    }

    const result = await renameItem(from, to);
    res.json(result);
  } catch (error) {
    console.error('Error renaming item:', error);
    res.status(400).json({ error: error.message || 'Error al renombrar archivo o carpeta' });
  }
});

// DELETE /api/files (admin)
router.delete('/', authGuard, roleGuard(['admin']), async (req, res) => {
  try {
    const targetPath = req.query.path || req.body?.path;
    if (!targetPath) {
      return res.status(400).json({ error: 'Ruta no especificada para eliminacion' });
    }

    const result = await deleteItem(targetPath);
    res.json(result);
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(400).json({ error: error.message || 'Error al eliminar archivo o carpeta' });
  }
});

// POST /api/files/upload (moderator+)
router.post('/upload', authGuard, roleGuard(['moderator']), uploadMiddleware.any(), (req, res) => {
  try {
    const uploadedFiles = req.files || [];
    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No se subio ningun archivo' });
    }

    const fileInfos = uploadedFiles.map((file) => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      destination: file.destination,
      path: file.path
    }));

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} archivo(s) subido(s) exitosamente`,
      files: fileInfos
    });
  } catch (error) {
    console.error('Error handling upload:', error);
    res.status(500).json({ error: error.message || 'Error al procesar la subida de archivos' });
  }
});

export default router;
