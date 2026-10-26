import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import mime from 'mime-types';
import { execFile } from 'child_process';
import util from 'util';
const execFilePromise = util.promisify(execFile);
import multer from 'multer';
import { PC_STORAGE_ROOT } from '../config.js';
import { resolveSafePath } from '../utils/security.js';
import { formatBytes, getMediaCategory } from '../utils/formatters.js';

export async function listFiles(targetRelativePath = '') {
  const fullPath = resolveSafePath(PC_STORAGE_ROOT, targetRelativePath);

  const stat = await fs.stat(fullPath);
  if (!stat.isDirectory()) {
    throw new Error('La ruta especificada no es un directorio');
  }

  const dirents = await fs.readdir(fullPath, { withFileTypes: true });

  const items = await Promise.all(
    dirents.map(async (dirent) => {
      try {
        const itemFullPath = path.join(fullPath, dirent.name);
        const itemStat = await fs.stat(itemFullPath);
        const isDirectory = dirent.isDirectory();
        const relPath = path.relative(PC_STORAGE_ROOT, itemFullPath);
        const ext = path.extname(dirent.name).toLowerCase();
        const mimeType = isDirectory ? 'directory' : (mime.lookup(dirent.name) || 'application/octet-stream');
        const category = isDirectory ? 'folder' : getMediaCategory(dirent.name);

        return {
          name: dirent.name,
          path: relPath,
          isDirectory,
          size: isDirectory ? 0 : itemStat.size,
          humanSize: isDirectory ? '-' : formatBytes(itemStat.size),
          modifiedAt: itemStat.mtime.toISOString(),
          mimeType,
          category,
          extension: ext
        };
      } catch (err) {
        console.warn(`Error reading stat for ${dirent.name}:`, err.message);
        return null;
      }
    })
  );

  const validItems = items.filter(Boolean);

  // Ordenar: primero directorios, luego alfabéticamente
  validItems.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  const normalizedRel = path.relative(PC_STORAGE_ROOT, fullPath);
  const parentPath = normalizedRel === '' ? null : (path.dirname(normalizedRel) === '.' ? '' : path.dirname(normalizedRel));

  return {
    currentPath: normalizedRel,
    parentPath,
    items: validItems
  };
}

export async function createFolder(parentPath = '', folderName = '') {
  let relativeTarget = parentPath;
  if (folderName) {
    relativeTarget = path.join(parentPath, folderName);
  }

  if (!relativeTarget || relativeTarget.trim() === '') {
    throw new Error('Nombre de carpeta no especificado');
  }

  const fullPath = resolveSafePath(PC_STORAGE_ROOT, relativeTarget);
  await fs.mkdir(fullPath, { recursive: true });
  return {
    success: true,
    createdPath: path.relative(PC_STORAGE_ROOT, fullPath),
    message: 'Carpeta creada exitosamente'
  };
}

export async function renameItem(oldRelativePath, newRelativePath) {
  if (!oldRelativePath || !newRelativePath) {
    throw new Error('Se requieren oldPath y newPath');
  }

  const oldFullPath = resolveSafePath(PC_STORAGE_ROOT, oldRelativePath);
  const newFullPath = resolveSafePath(PC_STORAGE_ROOT, newRelativePath);

  if (oldFullPath === PC_STORAGE_ROOT) {
    throw new Error('No se puede renombrar el directorio raíz');
  }

  await fs.rename(oldFullPath, newFullPath);

  return {
    success: true,
    oldPath: path.relative(PC_STORAGE_ROOT, oldFullPath),
    newPath: path.relative(PC_STORAGE_ROOT, newFullPath),
    message: 'Elemento renombrado exitosamente'
  };
}

export async function deleteItem(targetRelativePath) {
  if (!targetRelativePath || targetRelativePath.trim() === '' || targetRelativePath === '/') {
    throw new Error('No se puede eliminar el directorio raíz');
  }

  const fullPath = resolveSafePath(PC_STORAGE_ROOT, targetRelativePath);

  if (fullPath === PC_STORAGE_ROOT) {
    throw new Error('No se puede eliminar el directorio raíz');
  }

  try {
    await fs.rm(fullPath, { recursive: true, force: true });
  } catch (err) {
    console.warn(`fs.rm fallo para ${fullPath} (${err.message}), intentando con rclone fallback...`);
    const relNormalized = path.relative(PC_STORAGE_ROOT, fullPath);
    try {
      // Intentar rclone purge si es directorio, o deletefile si es archivo
      const stat = await fs.stat(fullPath).catch(() => null);
      if (stat && stat.isDirectory()) {
        await execFilePromise('rclone', ['purge', `gdrive:PC_Storage/${relNormalized}`]);
      } else {
        await execFilePromise('rclone', ['deletefile', `gdrive:PC_Storage/${relNormalized}`]);
      }
    } catch (rcloneErr) {
      throw new Error(`Error al eliminar elemento: ${err.message}. Fallback rclone: ${rcloneErr.message}`);
    }
  }

  return {
    success: true,
    deletedPath: targetRelativePath,
    message: 'Elemento eliminado exitosamente'
  };
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const { contentType, seriesTitle, seasonNumber, destinationPath } = req.body;

      let destFolder = destinationPath || req.query.path || '';

      if (contentType === 'pelicula') {
        destFolder = 'Peliculas';
      } else if (contentType === 'serie' && seriesTitle) {
        const season = seasonNumber ? `Temporada ${seasonNumber}` : '';
        destFolder = path.join('Series', seriesTitle, season);
      } else if (contentType === 'anime' && seriesTitle) {
        const season = seasonNumber ? `Temporada ${seasonNumber}` : '';
        destFolder = path.join('Anime', seriesTitle, season);
      }

      const fullPath = resolveSafePath(PC_STORAGE_ROOT, destFolder);
      if (!fsSync.existsSync(fullPath)) {
        fsSync.mkdirSync(fullPath, { recursive: true });
      }
      cb(null, fullPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Mantener nombre original pero decodificar utf8 en caso de latin1
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch {
      // Ignorar fallback
    }
    cb(null, originalName);
  }
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    // Permitir subidas grandes
    fileSize: 100 * 1024 * 1024 * 1024 // 100 GB por archivo
  }
});
