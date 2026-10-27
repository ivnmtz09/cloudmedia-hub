import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const METADATA_FILE = path.join(DATA_DIR, 'movies_metadata.json');

let aiClient = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({ apiKey });
    }
  }
  return aiClient;
}

/**
 * Lee la base de datos ligera movies_metadata.json
 * @returns {Promise<Record<string, any>>}
 */
export async function readMetadataCache() {
  try {
    if (!existsSync(METADATA_FILE)) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(METADATA_FILE, JSON.stringify({}, null, 2), 'utf-8');
      return {};
    }
    const raw = await fs.readFile(METADATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.warn('[MetadataEnricher] Error leyendo movies_metadata.json:', err.message);
    return {};
  }
}

/**
 * Guarda datos en movies_metadata.json de forma atómica/segura
 * @param {Record<string, any>} data 
 */
export async function writeMetadataCache(data) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(METADATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[MetadataEnricher] Error escribiendo movies_metadata.json:', err.message);
  }
}

/**
 * Limpieza local de respaldo con Regex en caso de que Gemini esté temporalmente saturado u offline
 */
function localRegexClean(filename, isDirectory = false) {
  const ext = path.extname(filename);
  const baseName = filename.slice(0, ext ? -ext.length : undefined);

  let seasonNumber = null;
  const sMatch = baseName.match(/(?:temporada|season|s)\s*(\d+)/i) || baseName.match(/(\d+)x\d+/i);
  if (sMatch) {
    seasonNumber = parseInt(sMatch[1], 10);
  }

  let clean = baseName
    .replace(/\b(2160p|4k|1080p|720p|480p)\b/gi, '')
    .replace(/\b(dual|lat|latino|esp|castellano|eng|sub|hd|rip|web-rip|bluray|x264|x265|hevc|h264)\b/gi, '')
    .replace(/(\d+(?:\.\d+)?\s*(?:GB|MB))/gi, '')
    .replace(/s\d+e\d+|\d+x\d+/gi, '')
    .replace(/(?:temporada|season)\s*\d+/gi, '')
    .replace(/[\[\]\(\)\{\}_\-\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let type = 'pelicula';
  if (seasonNumber !== null || /serie|temporada|season/i.test(filename)) {
    type = 'serie';
  }

  return {
    cleanTitle: clean || baseName,
    type,
    seasonNumber,
    year: null
  };
}

/**
 * Usa Gemini SDK (@google/genai) para extraer el nombre canónico oficial y tipo
 * @param {string} rawName 
 * @param {string} category 
 * @param {boolean} isDirectory 
 * @returns {Promise<{cleanTitle: string, type: 'pelicula' | 'serie' | 'anime', seasonNumber: number | null, year: number | null}>}
 */
export async function cleanNameWithGemini(rawName, category = '', isDirectory = false) {
  const ai = getAIClient();
  const fallback = localRegexClean(rawName, isDirectory);

  if (!ai) {
    return fallback;
  }

  const prompt = `Actúa como un experto catalogador cinematográfico de CloudMedia Hub.
Analiza el siguiente nombre de archivo o carpeta multimedia: "${rawName}"
Contexto de categoría: "${category}".

Instrucciones:
1. Extrae el "cleanTitle": Título canónico oficial limpio para buscar en TMDB (The Movie Database). Elimina resoluciones (1080p, 4k), codecs (x264, hevc), audios (Dual, LAT, ESP), extensiones (.mkv, .mp4), y tamaños de archivo.
2. Identifica el "type": "pelicula", "serie" o "anime".
3. Si es una temporada de serie/anime (ej: "Temporada 1", "Season 2", "S02"), extrae el "seasonNumber" numérico (ej: 1, 2). Si no, null.
4. Si se especifica año, extrae "year" numérico o null.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "cleanTitle": "Nombre canónico para TMDB",
  "type": "pelicula" | "serie" | "anime",
  "seasonNumber": null,
  "year": null
}`;

  // Intentar con modelo configurado o fallback
  const candidateModels = [
    process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash'
  ];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const rawText = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawText);

      return {
        cleanTitle: parsed.cleanTitle || fallback.cleanTitle,
        type: ['pelicula', 'serie', 'anime'].includes(parsed.type?.toLowerCase())
          ? parsed.type.toLowerCase()
          : fallback.type,
        seasonNumber: typeof parsed.seasonNumber === 'number' ? parsed.seasonNumber : fallback.seasonNumber,
        year: typeof parsed.year === 'number' ? parsed.year : fallback.year
      };
    } catch (err) {
      console.warn(`[MetadataEnricher] Gemini (${model}) warning:`, err.message?.slice(0, 100));
    }
  }

  return fallback;
}

/**
 * Consulta la API de TMDB con el nombre limpio para obtener poster, backdrop, sinopsis y actores
 * @param {{cleanTitle: string, type: string, seasonNumber?: number | null, year?: number | null}} params
 */
export async function fetchTMDBData({ cleanTitle, type = 'pelicula', seasonNumber = null, year = null }) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[MetadataEnricher] TMDB_API_KEY no configurada.');
    return null;
  }

  const isTV = type === 'serie' || type === 'anime';

  try {
    let searchUrl = '';
    if (isTV) {
      searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&language=es-MX`;
    } else {
      searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&language=es-MX${year ? `&year=${year}` : ''}`;
    }

    let searchRes = await fetch(searchUrl);
    let searchData = await searchRes.json();

    // Si no hay resultados en búsqueda específica, intentar búsqueda alternativa o multi
    if ((!searchData.results || searchData.results.length === 0) && !isTV) {
      const altUrl = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&language=es-MX`;
      const altRes = await fetch(altUrl);
      const altData = await altRes.json();
      if (altData.results && altData.results.length > 0) {
        return await fetchTMDBDetails({
          tmdbId: altData.results[0].id,
          isTV: true,
          seasonNumber,
          apiKey
        });
      }
    }

    if (!searchData.results || searchData.results.length === 0) {
      // Intento simplificando puntuación
      const simplified = cleanTitle.replace(/[:\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
      if (simplified !== cleanTitle) {
        const retryUrl = `https://api.themoviedb.org/3/search/${isTV ? 'tv' : 'movie'}?api_key=${apiKey}&query=${encodeURIComponent(simplified)}&language=es-MX`;
        const retryRes = await fetch(retryUrl);
        searchData = await retryRes.json();
      }
    }

    const matched = searchData.results?.[0];
    if (!matched) {
      return null;
    }

    return await fetchTMDBDetails({
      tmdbId: matched.id,
      isTV,
      seasonNumber,
      apiKey
    });
  } catch (err) {
    console.error('[MetadataEnricher] Error consultando TMDB:', err.message);
    return null;
  }
}

/**
 * Obtiene detalles completos y créditos desde TMDB para una película o serie
 */
async function fetchTMDBDetails({ tmdbId, isTV, seasonNumber, apiKey }) {
  const endpoint = isTV
    ? `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=es-MX&append_to_response=credits`
    : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=es-MX&append_to_response=credits`;

  const res = await fetch(endpoint);
  if (!res.ok) return null;
  const data = await res.json();

  let poster_path = data.poster_path;
  let backdrop_path = data.backdrop_path;
  let overview = data.overview;
  let title = isTV ? (data.name || data.original_name) : (data.title || data.original_title);
  let cast = data.credits?.cast || [];

  // Para Series y Anime: si se solicitó una temporada específica, obtener el póster de temporada
  if (isTV && seasonNumber !== null && seasonNumber !== undefined && seasonNumber >= 0) {
    try {
      const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${apiKey}&language=es-MX&append_to_response=credits`;
      const seasonRes = await fetch(seasonUrl);
      if (seasonRes.ok) {
        const seasonData = await seasonRes.json();
        if (seasonData.poster_path) {
          poster_path = seasonData.poster_path;
        }
        if (seasonData.overview) {
          overview = seasonData.overview;
        }
        if (seasonData.name) {
          title = `${title} - ${seasonData.name}`;
        }
        if (seasonData.credits?.cast && seasonData.credits.cast.length > 0) {
          cast = seasonData.credits.cast;
        }
      }
    } catch (seasonErr) {
      console.warn(`[MetadataEnricher] Error obteniendo temporada ${seasonNumber}:`, seasonErr.message);
    }
  }

  const actors = cast.slice(0, 10).map((actor) => ({
    name: actor.name,
    character: actor.character || '',
    profilePath: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
  }));

  const genres = (data.genres || []).map((g) => g.name);

  return {
    tmdbId,
    title,
    synopsis: overview || '',
    poster_path,
    backdrop_path,
    posterUrl: poster_path ? `https://image.tmdb.org/t/p/w500${poster_path}` : null,
    backdropUrl: backdrop_path ? `https://image.tmdb.org/t/p/original${backdrop_path}` : null,
    genres,
    actors,
    year: isTV
      ? (data.first_air_date ? new Date(data.first_air_date).getFullYear() : null)
      : (data.release_date ? new Date(data.release_date).getFullYear() : null),
    rating: data.vote_average ? Number(data.vote_average.toFixed(1)) : null
  };
}

/**
 * Enriquece un elemento individual (película, serie o temporada).
 * Si ya existe en movies_metadata.json con datos completos, lo retorna directamente del caché.
 *
 * @param {string} itemPath Ruta relativa del archivo o carpeta (ej: "Peliculas/Batman.mkv" o "Series/Naruto")
 * @param {string} itemName Nombre del archivo o carpeta
 * @param {boolean} isDirectory Si es directorio
 * @param {string} [parentPath] Ruta del directorio padre
 * @returns {Promise<any>}
 */
export async function getOrEnrichMetadata(itemPath, itemName, isDirectory = false, parentPath = '') {
  if (!itemPath) return null;

  const cache = await readMetadataCache();
  const existing = cache[itemPath];

  // Si ya tiene metadatos completos con póster, fondo y actores en caché, devolverlo
  if (existing && existing.posterUrl && existing.backdropUrl && existing.actors && existing.actors.length > 0) {
    return existing;
  }

  // Detectar categoría a partir de la ruta
  const pathParts = itemPath.split('/').filter(Boolean);
  const rootCategory = pathParts[0] || '';
  const isSeriesOrAnime = rootCategory === 'Series' || rootCategory === 'Anime';

  // Lógica de Series / Anime para carpetas y temporadas:
  // Carpeta raíz (ej: "Series/Naruto"): depth 2
  // Subcarpeta de temporada (ej: "Series/Naruto/Temporada 1"): depth 3
  let cleanInfo = null;
  let targetCleanTitle = null;
  let seasonNumber = null;

  if (isSeriesOrAnime) {
    if (pathParts.length === 2 && isDirectory) {
      // Carpeta raíz de serie (ej: "Series/Naruto")
      cleanInfo = await cleanNameWithGemini(itemName, rootCategory, true);
      cleanInfo.type = rootCategory === 'Anime' ? 'anime' : 'serie';
      targetCleanTitle = cleanInfo.cleanTitle;
    } else if (pathParts.length >= 3) {
      // Subcarpeta o episodio dentro de una serie
      // El nombre de la serie es pathParts[1]
      const seriesFolderName = pathParts[1];
      const seriesClean = await cleanNameWithGemini(seriesFolderName, rootCategory, true);
      targetCleanTitle = seriesClean.cleanTitle;

      // Detectar temporada en el nombre de la carpeta actual o en pathParts[2]
      const seasonMatch = (pathParts[2] || itemName).match(/(?:temporada|season|s)\s*(\d+)/i);
      if (seasonMatch) {
        seasonNumber = parseInt(seasonMatch[1], 10);
      }
      cleanInfo = {
        cleanTitle: targetCleanTitle,
        type: rootCategory === 'Anime' ? 'anime' : 'serie',
        seasonNumber,
        year: null
      };
    }
  }

  if (!cleanInfo) {
    cleanInfo = await cleanNameWithGemini(itemName, rootCategory, isDirectory);
    if (seasonNumber !== null && cleanInfo.seasonNumber === null) {
      cleanInfo.seasonNumber = seasonNumber;
    }
  }

  // Buscar en TMDB
  const tmdb = await fetchTMDBData({
    cleanTitle: targetCleanTitle || cleanInfo.cleanTitle,
    type: cleanInfo.type,
    seasonNumber: cleanInfo.seasonNumber,
    year: cleanInfo.year
  });

  const record = {
    path: itemPath,
    filename: itemName,
    title: tmdb?.title || cleanInfo.cleanTitle || itemName,
    cleanTitle: cleanInfo.cleanTitle || itemName,
    type: cleanInfo.type,
    seasonNumber: cleanInfo.seasonNumber,
    synopsis: tmdb?.synopsis || (existing?.synopsis || 'Sin sinopsis disponible.'),
    posterUrl: tmdb?.posterUrl || existing?.posterUrl || null,
    backdropUrl: tmdb?.backdropUrl || existing?.backdropUrl || null,
    poster_path: tmdb?.poster_path || null,
    backdrop_path: tmdb?.backdrop_path || null,
    genres: tmdb?.genres?.length ? tmdb.genres : (existing?.genres || ['General']),
    actors: tmdb?.actors?.length ? tmdb.actors : (existing?.actors || []),
    year: tmdb?.year || cleanInfo.year || existing?.year || null,
    rating: tmdb?.rating || existing?.score || null,
    category: rootCategory,
    updatedAt: new Date().toISOString()
  };

  // Guardar en la base de datos local
  cache[itemPath] = record;
  await writeMetadataCache(cache);

  return record;
}

/**
 * Enriquece en masa los elementos de un directorio listado.
 * Añade la propiedad `metadata` a cada elemento que sea video o carpeta multimedia.
 *
 * @param {Array<any>} items Elementos devueltos por listFiles
 * @param {string} currentPath Directorio actual
 * @returns {Promise<Array<any>>}
 */
export async function enrichDirectoryItems(items = [], currentPath = '') {
  if (!items || items.length === 0) return [];

  const cache = await readMetadataCache();
  let cacheModified = false;

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      try {
        const isVideo = item.category === 'video';
        const isMediaFolder = item.isDirectory && (
          currentPath === 'Series' ||
          currentPath === 'Anime' ||
          currentPath.startsWith('Series/') ||
          currentPath.startsWith('Anime/')
        );

        if (!isVideo && !isMediaFolder) {
          return {
            ...item,
            metadata: cache[item.path] || null
          };
        }

        // Si ya está en caché con datos
        if (cache[item.path] && (cache[item.path].posterUrl || cache[item.path].backdropUrl)) {
          return {
            ...item,
            metadata: cache[item.path]
          };
        }

        // Si no está enriquecido, enriquecer en segundo plano / demanda
        const meta = await getOrEnrichMetadata(item.path, item.name, item.isDirectory, currentPath);
        if (meta) {
          cache[item.path] = meta;
          cacheModified = true;
        }

        return {
          ...item,
          metadata: meta || cache[item.path] || null
        };
      } catch (err) {
        console.warn(`[MetadataEnricher] Error procesando ${item.name}:`, err.message);
        return {
          ...item,
          metadata: cache[item.path] || null
        };
      }
    })
  );

  if (cacheModified) {
    await writeMetadataCache(cache);
  }

  return enrichedItems;
}
