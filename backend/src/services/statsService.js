import fs from 'fs/promises';
import { execFile, exec } from 'child_process';
import util from 'util';
import { QUOTA_FILE, QUOTA_REFRESH_SCRIPT } from '../config.js';
import { formatBytes } from '../utils/formatters.js';

const execPromise = util.promisify(exec);
const execFilePromise = util.promisify(execFile);

export async function getLocalDiskStats() {
  try {
    const { stdout } = await execPromise('df -B1 /');
    const lines = stdout.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const available = parseInt(parts[3], 10);
      const percentStr = parts[4].replace('%', '');
      const percentage = parseFloat(percentStr);

      return {
        total_bytes: total,
        used_bytes: used,
        available_bytes: available,
        percentage_used: percentage,
        human_total: formatBytes(total),
        human_used: formatBytes(used),
        human_available: formatBytes(available)
      };
    }
  } catch (error) {
    console.error('Error getting local disk stats via df:', error.message);
  }

  // Fallback using fs.statfs
  try {
    const stats = await fs.statfs('/');
    const total = stats.bsize * stats.blocks;
    const available = stats.bsize * stats.bavail;
    const used = total - available;
    const percentage = total > 0 ? parseFloat(((used / total) * 100).toFixed(2)) : 0;

    return {
      total_bytes: total,
      used_bytes: used,
      available_bytes: available,
      percentage_used: percentage,
      human_total: formatBytes(total),
      human_used: formatBytes(used),
      human_available: formatBytes(available)
    };
  } catch (error) {
    console.error('Fallback fs.statfs failed:', error.message);
    return {
      total_bytes: 0,
      used_bytes: 0,
      available_bytes: 0,
      percentage_used: 0,
      human_total: '0 B',
      human_used: '0 B',
      human_available: '0 B'
    };
  }
}

export async function getGoogleDriveQuota() {
  try {
    const raw = await fs.readFile(QUOTA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not read quota file ${QUOTA_FILE}:`, error.message);
    return {
      used_bytes: 0,
      max_bytes: 536870912000,
      percentage: 0,
      updated_at: new Date().toISOString(),
      file_count: 0,
      human_used: '0B',
      human_max: '500GB'
    };
  }
}

export async function refreshGoogleDriveQuota() {
  try {
    await execFilePromise(QUOTA_REFRESH_SCRIPT, [], { timeout: 45000 });
  } catch (error) {
    console.error('Error executing quota refresh script:', error.message);
    // Don't fail completely, try to read file anyway
  }
  return await getGoogleDriveQuota();
}

export async function getAllStats() {
  const [googleDrive, localDisk] = await Promise.all([
    getGoogleDriveQuota(),
    getLocalDiskStats()
  ]);

  return {
    ...googleDrive,
    googleDrive,
    localDisk
  };
}
