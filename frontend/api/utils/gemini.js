import { GoogleGenAI } from '@google/genai';

let geminiClient = null;

export function getGeminiClient() {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

/**
 * Limpieza rápida local con expresiones regulares en caso de no tener API key o cuota agotada
 */
export function cleanTitleWithRegex(rawName) {
  if (!rawName) return { cleanTitle: '', type: 'pelicula', seasonNumber: null, year: null };

  const nameWithoutExt = rawName.replace(/\.[^/.]+$/, '');
  
  // 1. Detectar año de 4 dígitos si está explícito
  const yMatch = nameWithoutExt.match(/\b(19\d{2}|20\d{2})\b/);
  let year = yMatch ? parseInt(yMatch[1], 10) : null;

  // 2. Normalización canónica para la saga The Avengers / Los Vengadores de Marvel
  if (/avengers|vengadores/i.test(nameWithoutExt)) {
    if (/era\s*de\s*ultr[oó]n|ultron/i.test(nameWithoutExt)) {
      return {
        cleanTitle: 'Avengers: Era de Ultrón',
        type: 'pelicula',
        seasonNumber: null,
        year: year || 2015
      };
    }
    if (!/infinity|endgame/i.test(nameWithoutExt)) {
      return {
        cleanTitle: 'The Avengers',
        type: 'pelicula',
        seasonNumber: null,
        year: year || 2012
      };
    }
  }

  // 3. Detección estricta de temporada (1 o 2 dígitos delimitados por límites de palabra)
  let seasonNumber = null;
  const sMatch = nameWithoutExt.match(/\b(?:temporada|season)\s*(\d{1,2})\b/i) ||
                 nameWithoutExt.match(/\b[sS](\d{1,2})[eE]\d{1,3}\b/i) ||
                 nameWithoutExt.match(/\b(\d{1,2})x\d{1,3}\b/i);
  if (sMatch) {
    const num = parseInt(sMatch[1], 10);
    if (num > 0 && num <= 50) {
      seasonNumber = num;
    }
  }

  let clean = nameWithoutExt
    .replace(/\b(2160p|4k|1080p|720p|480p)\b/gi, '')
    .replace(/\b(dual|lat|latino|esp|castellano|eng|sub|hd|hdr|rip|web-rip|bluray|x264|x265|hevc|h264|remux)\b/gi, '')
    .replace(/(\d+(?:\.\d+)?\s*(?:GB|MB))/gi, '')
    .replace(/\bs\d+e\d+\b|\b\d+x\d+\b/gi, '')
    .replace(/\b(?:temporada|season)\s*\d+\b/gi, '')
    .replace(/[\[\]\(\)\{\}_\-\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let type = 'pelicula';
  // Si la ruta o nombre pertenece a Peliculas, es estrictamente película
  if (/peliculas|película|movies/i.test(rawName)) {
    type = 'pelicula';
    seasonNumber = null;
  } else if (seasonNumber !== null || /\b(?:serie|series|temporada|season)\b/i.test(rawName)) {
    type = 'serie';
  } else if (/\b(?:anime|naruto|one\s*piece|dragon\s*ball|bleach|shingeki)\b/i.test(rawName)) {
    type = 'anime';
  }

  return {
    cleanTitle: clean || nameWithoutExt,
    type,
    seasonNumber,
    year
  };
}

/**
 * Limpia el nombre crudo de un archivo de video utilizando Gemini AI (@google/genai)
 */
export async function cleanTitleWithGemini(rawName, categoryHint = '') {
  const fallback = cleanTitleWithRegex(rawName);
  const ai = getGeminiClient();
  if (!ai) return fallback;

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt = `Actúa como un catalogador cinematográfico profesional.
Analiza este nombre de archivo multimedia: "${rawName}"
Pista de categoría: "${categoryHint}".

Extrae y normaliza:
1. "cleanTitle": Nombre canónico y limpio para buscar en TMDB (sin resoluciones, codecs ni marcas como 1080p, Dual, x264, etc.).
2. "type": "pelicula", "serie" o "anime".
3. "seasonNumber": número de temporada o null si es película.
4. "year": año de lanzamiento numérico o null.

Responde ÚNICAMENTE con este JSON:
{
  "cleanTitle": "Título oficial",
  "type": "pelicula" | "serie" | "anime",
  "seasonNumber": null,
  "year": null
}`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      cleanTitle: parsed.cleanTitle || fallback.cleanTitle,
      type: ['pelicula', 'serie', 'anime'].includes(parsed.type?.toLowerCase())
        ? parsed.type.toLowerCase()
        : fallback.type,
      seasonNumber: typeof parsed.seasonNumber === 'number' ? parsed.seasonNumber : fallback.seasonNumber,
      year: typeof parsed.year === 'number' ? parsed.year : fallback.year
    };
  } catch (err) {
    console.warn('[Gemini] Fallback por error:', err.message);
    return fallback;
  }
}
