import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[GeminiService] ADVERTENCIA: GEMINI_API_KEY no configurada en las variables de entorno.');
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Enriquecimiento de metadatos mediante Gemini Pro / Flash.
 * Recibe el nombre de archivo o título y genera metadatos estructurados en JSON.
 *
 * @param {string} filename Nombre del archivo o título crudo.
 * @returns {Promise<{cleanTitle: string, synopsis: string, mainCast: string[], genres: string[], keywords: string[]}>}
 */
export async function enrichMetadataWithAI(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('El parámetro filename es requerido');
  }

  const ai = getAIClient();
  if (!ai) {
    // Fallback elegante si no hay API key disponible
    const clean = filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[\._-]/g, ' ')
      .replace(/\b(1080p|720p|4k|2160p|dual|lat|eng|bluray|x264|x265)\b/gi, '')
      .trim();

    return {
      cleanTitle: clean,
      synopsis: 'Metadatos generados automáticamente en modo local (sin API Key de Gemini configurada).',
      mainCast: [],
      genres: ['General'],
      keywords: clean.toLowerCase().split(/\s+/).filter(Boolean)
    };
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  const prompt = `Actúa como un experto catalogador cinematográfico de CloudMedia Hub.
Analiza el siguiente nombre de archivo de película o serie: "${filename}"

Limpia el título eliminando marcas de resolución (1080p, 4K), codecs (x264, HEVC), audios (DUAL, LAT) y extensiones.
Genera información cinematográfica precisa y atractiva en español.

Debes responder ÚNICAMENTE con un objeto JSON válido con este esquema exacto:
{
  "cleanTitle": "Título oficial y limpio",
  "synopsis": "Sinopsis atractiva, fluida y sin spoilers (máximo 3 párrafos cortos)",
  "mainCast": ["Actor 1", "Actor 2", "Actor 3", "Actor 4"],
  "genres": ["Género 1", "Género 2"],
  "keywords": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    return {
      cleanTitle: parsed.cleanTitle || filename,
      synopsis: parsed.synopsis || 'Sin sinopsis disponible.',
      mainCast: Array.isArray(parsed.mainCast) ? parsed.mainCast : [],
      genres: Array.isArray(parsed.genres) ? parsed.genres : ['General'],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : []
    };
  } catch (error) {
    console.error('[GeminiService] Error en enrichMetadataWithAI:', error.message);
    throw new Error(`Fallo al enriquecer metadatos con Gemini AI: ${error.message}`);
  }
}

/**
 * Búsqueda semántica usando Gemini AI sobre el catálogo multimedia actual.
 *
 * @param {string} userQuery Consulta en lenguaje natural del usuario.
 * @param {Array<Object>} catalogItems Lista de elementos del catálogo con path, title, genres, synopsis, etc.
 * @returns {Promise<Array<{path: string, title: string, relevanceScore: number, matchReason: string}>>}
 */
export async function semanticSearchWithAI(userQuery, catalogItems = []) {
  if (!userQuery || typeof userQuery !== 'string') {
    throw new Error('La consulta de búsqueda (query) es requerida');
  }

  if (!catalogItems || catalogItems.length === 0) {
    return [];
  }

  const ai = getAIClient();
  if (!ai) {
    // Fallback a búsqueda simple por texto si no hay clave de Gemini
    const qLower = userQuery.toLowerCase();
    return catalogItems
      .filter((item) => {
        const titleMatch = (item.title || item.name || '').toLowerCase().includes(qLower);
        const genreMatch = (item.genres || []).some((g) => g.toLowerCase().includes(qLower));
        const synMatch = (item.synopsis || '').toLowerCase().includes(qLower);
        return titleMatch || genreMatch || synMatch;
      })
      .slice(0, 10)
      .map((item) => ({
        path: item.path || item.id,
        title: item.title || item.name,
        relevanceScore: 0.8,
        matchReason: 'Coincidencia léxica local (Gemini API no configurada).'
      }));
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  // Compactar catálogo para optimizar tokens
  const simplifiedCatalog = catalogItems.slice(0, 100).map((item) => ({
    path: item.path || item.id,
    title: item.title || item.name,
    genres: item.genres || [],
    synopsis: (item.synopsis || '').slice(0, 160)
  }));

  const prompt = `Eres el motor de búsqueda semántica de CloudMedia Hub.
El usuario busca contenido usando la siguiente consulta en lenguaje natural:
"${userQuery}"

Aquí está el catálogo disponible:
${JSON.stringify(simplifiedCatalog, null, 2)}

Analiza la intención del usuario (temas, estado de ánimo, sinopsis, géneros, viajes en el tiempo, comedia, etc.).
Filtra y ordena los títulos que mejor encajen con la búsqueda.
Si ningún elemento encaja, devuelve una lista vacía.

Responde ÚNICAMENTE con un array JSON de objetos con la siguiente estructura:
[
  {
    "path": "ruta/exacta/del/catalogo",
    "title": "Título del elemento",
    "relevanceScore": 0.95,
    "matchReason": "Explicación breve de por qué coincide con la consulta"
  }
]`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim() || '[]';
    const matches = JSON.parse(text);

    return Array.isArray(matches) ? matches : [];
  } catch (error) {
    console.error('[GeminiService] Error en semanticSearchWithAI:', error.message);
    throw new Error(`Fallo en la búsqueda semántica con Gemini AI: ${error.message}`);
  }
}
