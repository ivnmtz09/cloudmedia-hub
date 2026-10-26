import path from 'path';
import os from 'os';

export const PORT = process.env.PORT || 3001;
export const HOST = process.env.HOST || '0.0.0.0';

export const PC_STORAGE_ROOT = process.env.PC_STORAGE_ROOT || '/home/ivnmtz09/GoogleDrive/PC_Storage';
export const QUOTA_FILE = process.env.QUOTA_FILE || '/home/ivnmtz09/GoogleDrive/.pc_storage_quota.json';
export const QUOTA_REFRESH_SCRIPT = process.env.QUOTA_REFRESH_SCRIPT || '/usr/local/bin/check-pc-storage-quota.sh';

export const CLEANUP_SCAN_DIRS = [
  '/home/ivnmtz09/Descargas',
  '/home/ivnmtz09/Vídeos',
  '/home/ivnmtz09/Videos'
];

export const ALLOWED_CATEGORIES = [
  'Peliculas',
  'Series',
  'Videos_Personales',
  'Backups_PC',
  'Documentos'
];

export const CACHE_DIR = path.resolve(process.cwd(), '.cache/thumbnails');
