import fs from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { PC_STORAGE_ROOT } from '../config.js';
import { listFiles } from './filesService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const METADATA_FILE = path.join(DATA_DIR, 'movies_metadata.json');
const POSTERS_DIR = path.join(DATA_DIR, 'posters');

export function parseFileName(filename) {
  const ext = path.extname(filename);
  let baseName = filename.slice(0, -ext.length);

  const badges = [];

  // Resolution
  const resMatch = baseName.match(/\b(2160p|4k|1080p|720p|480p)\b/i);
  if (resMatch) badges.push(resMatch[1].toUpperCase());

  // Audio / Language
  if (/\bdual\b/i.test(baseName)) badges.push('DUAL');
  if (/\blat\b|\blatino\b/i.test(baseName)) badges.push('LAT');
  if (/\besp\b|\bcastellano\b/i.test(baseName)) badges.push('ESP');
  if (/\beng\b|\bingles\b/i.test(baseName)) badges.push('ENG');

  // File size pattern in name (e.g., "1.20 GB", "707.03 MB")
  const sizeMatch = baseName.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
  if (sizeMatch) badges.push(sizeMatch[1].toUpperCase());

  // Format
  if (ext) badges.push(ext.replace('.', '').toUpperCase());

  // Episode & Season detection
  let season = null;
  let episode = null;

  const sMatch = baseName.match(/s(\d+)e(\d+)/i) || baseName.match(/(\d+)x(\d+)/i);
  if (sMatch) {
    season = parseInt(sMatch[1], 10);
    episode = parseInt(sMatch[2], 10);
  } else {
    const epMatch = baseName.match(/(?:cap|ep|episodio)\s*(\d+)/i);
    if (epMatch) episode = parseInt(epMatch[1], 10);
  }

  // Clean title: remove badges, resolutions, sizes, brackets, extensions
  let cleanTitle = baseName
    .replace(/\b(2160p|4k|1080p|720p|480p)\b/gi, '')
    .replace(/\b(dual|lat|latino|esp|castellano|eng|sub|hd|rip|web-rip|bluray|x264|x265|hevc|h264)\b/gi, '')
    .replace(/(\d+(?:\.\d+)?\s*(?:GB|MB))/gi, '')
    .replace(/s\d+e\d+|\d+x\d+/gi, '')
    .replace(/(?:cap|ep|episodio)\s*\d+/gi, '')
    .replace(/[\[\]\(\)\{\}_\-\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTitle) cleanTitle = baseName;

  return {
    cleanTitle,
    badges,
    season,
    episode,
    originalName: filename
  };
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function readMetadata() {
  try {
    const raw = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function writeMetadata(data) {
  await fs.writeFile(METADATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function downloadPoster(url, slug) {
  try {
    await fs.mkdir(POSTERS_DIR, { recursive: true });
    const localPath = path.join(POSTERS_DIR, `${slug}.jpg`);
    if (existsSync(localPath)) return `/api/metadata/poster?slug=${slug}`;

    const res = await fetch(url, { headers: { 'User-Agent': 'CloudMediaHub/2.0' } });
    if (!res.ok) return null;

    const fileStream = createWriteStream(localPath);
    await pipeline(res.body, fileStream);
    return `/api/metadata/poster?slug=${slug}`;
  } catch (err) {
    console.warn(`Error al descargar póster para ${slug}:`, err.message);
    return null;
  }
}

export async function fetchOnlineMetadata(cleanTitle, category = 'Peliculas') {
  const slug = slugify(cleanTitle);

  // 1. ANIME: Usar Jikan API
  if (category === 'Anime') {
    try {
      const jikanUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanTitle)}&limit=1`;
      const res = await fetch(jikanUrl, { headers: { 'User-Agent': 'CloudMediaHub/2.0' } });
      if (res.ok) {
        const json = await res.json();
        const anime = json.data && json.data[0];
        if (anime) {
          let posterUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
          let localPoster = null;
          if (posterUrl) localPoster = await downloadPoster(posterUrl, slug);

          return {
            title: anime.title || cleanTitle,
            synopsis: anime.synopsis || '',
            posterUrl: localPoster || posterUrl,
            year: anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null),
            score: anime.score || null,
            source: 'jikan'
          };
        }
      }
    } catch (err) {
      console.warn('Jikan API error:', err.message);
    }
  }

  // 2. PELÍCULAS Y SERIES: iTunes API ES
  try {
    const itunesUrl = `https://itunes.apple.com/search?media=movie&country=CO&lang=es_es&term=${encodeURIComponent(cleanTitle)}&limit=1`;
    const res = await fetch(itunesUrl, { headers: { 'User-Agent': 'CloudMediaHub/2.0' } });
    if (res.ok) {
      const json = await res.json();
      if (json.results && json.results.length > 0) {
        const item = json.results[0];
        let posterUrl = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x900bb') : null;
        let localPoster = null;
        if (posterUrl) localPoster = await downloadPoster(posterUrl, slug);

        return {
          title: item.trackName || cleanTitle,
          synopsis: item.longDescription || item.shortDescription || '',
          posterUrl: localPoster || posterUrl,
          year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
          genre: item.primaryGenreName || null,
          source: 'itunes'
        };
      }
    }
  } catch (err) {
    console.warn('iTunes API error:', err.message);
  }

  // 3. Fallback: Wikipedia ES REST API
  try {
    const wikiUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`;
    const res = await fetch(wikiUrl, { headers: { 'User-Agent': 'CloudMediaHub/2.0' } });
    if (res.ok) {
      const json = await res.json();
      let posterUrl = json.thumbnail?.source || null;
      let localPoster = null;
      if (posterUrl) localPoster = await downloadPoster(posterUrl, slug);

      return {
        title: json.title || cleanTitle,
        synopsis: json.extract || '',
        posterUrl: localPoster || posterUrl,
        source: 'wikipedia'
      };
    }
  } catch (err) {
    console.warn('Wikipedia API error:', err.message);
  }

  return {
    title: cleanTitle,
    synopsis: '',
    posterUrl: null,
    source: 'local'
  };
}

export async function syncAllMetadata() {
  console.log('[MetadataService] Iniciando sincronización de metadatos...');
  const metadataMap = await readMetadata();
  const categories = ['Peliculas', 'Series', 'Anime', 'Videos_Personales'];

  for (const cat of categories) {
    try {
      const catData = await listFiles(cat);
      const items = (catData.items || []).filter((i) => !i.isDirectory && i.category === 'video');

      for (const item of items) {
        const parsed = parseFileName(item.name);
        const existing = metadataMap[item.path];

        if (!existing || !existing.posterUrl || !existing.synopsis) {
          const online = await fetchOnlineMetadata(parsed.cleanTitle, cat);
          metadataMap[item.path] = {
            path: item.path,
            filename: item.name,
            cleanTitle: parsed.cleanTitle,
            badges: parsed.badges,
            season: parsed.season,
            episode: parsed.episode,
            title: online.title || parsed.cleanTitle,
            synopsis: online.synopsis || '',
            posterUrl: online.posterUrl || null,
            year: online.year || null,
            score: online.score || null,
            category: cat,
            updatedAt: new Date().toISOString()
          };
        }
      }
    } catch (err) {
      console.warn(`[MetadataService] Error escaneando ${cat}:`, err.message);
    }
  }

  await writeMetadata(metadataMap);
  console.log('[MetadataService] Sincronización de metadatos finalizada.');
  return metadataMap;
}

export const syncAll = syncAllMetadata;

export async function getSeriesTree(category = 'Series') {
  const root = path.join(PC_STORAGE_ROOT, category);
  const result = [];

  try {
    const seriesEntries = await fs.readdir(root, { withFileTypes: true });
    for (const sEntry of seriesEntries) {
      if (sEntry.isDirectory()) {
        const seriesName = sEntry.name;
        const seriesPath = path.join(root, seriesName);
        const seasons = [];

        const seasonEntries = await fs.readdir(seriesPath, { withFileTypes: true });
        for (const seaEntry of seasonEntries) {
          if (seaEntry.isDirectory()) {
            const seasonName = seaEntry.name;
            const seasonNumberMatch = seasonName.match(/\d+/);
            const seasonNumber = seasonNumberMatch ? parseInt(seasonNumberMatch[0], 10) : 1;

            const epPath = path.join(seriesPath, seasonName);
            const epFiles = await fs.readdir(epPath);
            const episodes = epFiles
              .filter((f) => /\.(mp4|mkv|webm|avi)$/i.test(f))
              .map((epName) => {
                const parsed = parseFileName(epName);
                return {
                  name: epName,
                  path: `${category}/${seriesName}/${seasonName}/${epName}`,
                  season: seasonNumber,
                  episode: parsed.episode || 1,
                  cleanTitle: parsed.cleanTitle,
                  badges: parsed.badges
                };
              })
              .sort((a, b) => (a.episode || 0) - (b.episode || 0));

            seasons.push({
              name: seasonName,
              number: seasonNumber,
              episodes
            });
          }
        }

        seasons.sort((a, b) => a.number - b.number);
        result.push({
          title: seriesName,
          type: category.toLowerCase(),
          seasons
        });
      }
    }
  } catch (err) {
    console.warn(`[MetadataService] Error construyendo árbol de ${category}:`, err.message);
  }

  return result;
}
