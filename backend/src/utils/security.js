import path from 'path';
import { CLEANUP_SCAN_DIRS } from '../config.js';

export function resolveSafePath(baseDir, targetPath = '') {
  const normalizedBase = path.resolve(baseDir);
  // Remove leading slashes to prevent absolute path override in path.resolve
  const sanitizedTarget = targetPath.replace(/^[/\\]+/, '');
  const resolved = path.resolve(normalizedBase, sanitizedTarget);

  if (resolved !== normalizedBase && !resolved.startsWith(normalizedBase + path.sep)) {
    throw new Error('Acceso no permitido: intento de escape de directorio');
  }

  return resolved;
}

export function isAllowedCleanupPath(filePath) {
  const normalizedTarget = path.resolve(filePath);
  return CLEANUP_SCAN_DIRS.some((scanDir) => {
    const normalizedScan = path.resolve(scanDir);
    return normalizedTarget === normalizedScan || normalizedTarget.startsWith(normalizedScan + path.sep);
  });
}
