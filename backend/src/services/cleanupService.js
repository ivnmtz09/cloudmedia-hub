import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { CLEANUP_SCAN_DIRS, ALLOWED_CATEGORIES } from '../config.js';
import { isAllowedCleanupPath } from '../utils/security.js';
import { formatBytes, getMediaCategory } from '../utils/formatters.js';

const MIN_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const activeJobs = new Map();

async function walkDirectory(dirPath, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  const results = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // Ignorar ocultos

      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          const subResults = await walkDirectory(fullPath, maxDepth, currentDepth + 1);
          results.push(...subResults);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          if (stat.size >= MIN_SIZE_BYTES) {
            results.push({
              name: entry.name,
              filePath: fullPath,
              size: stat.size,
              humanSize: formatBytes(stat.size),
              category: getMediaCategory(entry.name),
              extension: path.extname(entry.name).toLowerCase(),
              modifiedAt: stat.mtime.toISOString(),
              directory: dirPath
            });
          }
        }
      } catch (err) {
        // Ignorar permisos denegados o archivos eliminados
      }
    }
  } catch (err) {
    // Directorio no accesible
  }

  return results;
}

export async function getLargeFiles() {
  const allFiles = [];

  for (const scanDir of CLEANUP_SCAN_DIRS) {
    if (fsSync.existsSync(scanDir)) {
      const files = await walkDirectory(scanDir);
      allFiles.push(...files);
    }
  }

  // Ordenar por tamaño descendente
  allFiles.sort((a, b) => b.size - a.size);

  const totalBytes = allFiles.reduce((acc, f) => acc + f.size, 0);

  return {
    count: allFiles.length,
    totalBytes,
    humanTotalSize: formatBytes(totalBytes),
    files: allFiles
  };
}

export function getCleanupJobs() {
  return Array.from(activeJobs.values());
}

export async function executeCleanupAction({ action, filePath, destinationCategory }) {
  if (!filePath) {
    throw new Error('Ruta de archivo no proporcionada');
  }

  if (!isAllowedCleanupPath(filePath)) {
    throw new Error('La ruta especificada no está dentro de los directorios permitidos para limpieza');
  }

  if (!fsSync.existsSync(filePath)) {
    throw new Error('El archivo no existe');
  }

  if (action === 'delete') {
    await fs.unlink(filePath);
    return {
      success: true,
      action: 'delete',
      filePath,
      message: `Archivo "${path.basename(filePath)}" eliminado permanentemente`
    };
  }

  if (action === 'move') {
    if (!destinationCategory || !ALLOWED_CATEGORIES.includes(destinationCategory)) {
      throw new Error(`Categoría destino no válida. Opciones permitidas: ${ALLOWED_CATEGORIES.join(', ')}`);
    }

    const remoteDest = `gdrive:PC_Storage/${destinationCategory}`;
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filename = path.basename(filePath);

    const job = {
      id: jobId,
      action: 'move',
      filePath,
      filename,
      destinationCategory,
      remoteDest,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null
    };

    activeJobs.set(jobId, job);

    // Lanzar rclone move en segundo plano
    const rclone = spawn('rclone', ['move', filePath, remoteDest, '-v']);

    rclone.on('close', (code) => {
      job.completedAt = new Date().toISOString();
      if (code === 0) {
        job.status = 'completed';
      } else {
        job.status = 'failed';
        job.error = `rclone terminó con código de salida ${code}`;
      }
    });

    rclone.on('error', (err) => {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.error = err.message;
    });

    return {
      success: true,
      action: 'move',
      jobId,
      filePath,
      filename,
      destinationCategory,
      remoteDest,
      status: 'running',
      message: `Moviendo "${filename}" a ${remoteDest} en segundo plano`
    };
  }

  throw new Error(`Acción desconocida: ${action}`);
}
