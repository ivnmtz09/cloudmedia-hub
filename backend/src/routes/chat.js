import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { readMetadataCache } from '../services/metadataEnricher.js';
import { authGuard, roleGuard } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();
let aiClient = null;

function normalizeStr(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[:\-–—'"`’“”]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function addTitleVariants(targetSet, rawTitle) {
  if (!rawTitle) return;
  const norm = normalizeStr(rawTitle);
  if (norm.length >= 5) {
    targetSet.add(norm);
    const noArt = norm.replace(/^(?:el|la|los|las|un|una|the|a|an)\s+/i, '');
    if (noArt.length >= 5) {
      targetSet.add(noArt);
    }
  }

  // Subtítulo si contiene ':' o ' - '
  if (rawTitle.includes(':') || rawTitle.includes(' - ')) {
    const parts = rawTitle.split(/[:\-]/).map((p) => p.trim());
    if (parts.length > 1) {
      const subtitle = parts.slice(1).join(' ').trim();
      const normSub = normalizeStr(subtitle);
      if (normSub.length >= 6) {
        targetSet.add(normSub);
        const subNoArt = normSub.replace(/^(?:el|la|los|las|un|una|the|a|an)\s+/i, '');
        if (subNoArt.length >= 5) {
          targetSet.add(subNoArt);
        }
      }
    }
  }

  // Si tiene al menos 3 palabras, agregar combinaciones de las últimas palabras distintivas
  const words = norm.split(' ');
  if (words.length >= 3) {
    const last2 = words.slice(-2).join(' ');
    if (last2.length >= 8) targetSet.add(last2);
    if (words.length >= 4) {
      const last3 = words.slice(-3).join(' ');
      if (last3.length >= 10) targetSet.add(last3);
    }
  }
}

/**
 * Analiza la respuesta generada por Gemini y compara contra metadataCache
 * para extraer hasta 4 títulos que coincidan con lo que la IA recomendó o mencionó.
 * @param {string} text - Texto de respuesta de Gemini
 * @param {Record<string, any>} metadataCache - Catálogo completo en caché
 * @param {number} maxItems - Máximo número de elementos a retornar
 * @returns {Array<object>}
 */
export function extractMatchedMedia(text, metadataCache, maxItems = 4) {
  if (!text || typeof text !== 'string' || !metadataCache) return [];

  const normReply = ` ${normalizeStr(text)} `;
  if (!normReply.trim()) return [];

  const matched = [];

  for (const item of Object.values(metadataCache)) {
    if (!item || !item.path) continue;
    const candidates = new Set();

    if (item.title) addTitleVariants(candidates, item.title);
    if (item.cleanTitle) addTitleVariants(candidates, item.cleanTitle);

    let bestPos = -1;

    for (const cand of candidates) {
      if (cand.length < 5) continue;

      const searchPattern = ` ${cand} `;
      let idx = normReply.indexOf(searchPattern);
      if (idx === -1) {
        idx = normReply.indexOf(cand);
      }

      if (idx !== -1) {
        if (bestPos === -1 || idx < bestPos) {
          bestPos = idx;
        }
      }
    }

    if (bestPos !== -1) {
      const posterUrl = item.posterUrl || (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null);
      const backdropUrl = item.backdropUrl || (item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null);

      matched.push({
        position: bestPos,
        media: {
          path: item.path,
          title: item.title || item.cleanTitle || item.filename,
          posterUrl,
          backdropUrl,
          rating: item.rating ? Number(item.rating) : null,
          year: item.year || null,
          type: item.type || 'película',
          synopsis: item.synopsis || ''
        }
      });
    }
  }

  // Ordenar por el orden en que aparecen mencionados en la respuesta
  matched.sort((a, b) => a.position - b.position);

  return matched.slice(0, maxItems).map((m) => m.media);
}

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
 * POST /api/chat
 * Chatbot inteligente impulsado por Google Gemini (@google/genai)
 * Incluye el catálogo de películas/series en su contexto y Google Search como herramienta.
 */
router.post('/', authGuard, roleGuard('viewer'), async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'El mensaje del usuario es requerido.' });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Servicio de IA no disponible. Verifique GEMINI_API_KEY en las variables de entorno.'
      });
    }

    // 1. Obtener catálogo actual de movies_metadata.json
    const metadataCache = await readMetadataCache();
    const catalogSummary = Object.values(metadataCache).map((item) => ({
      title: item.title || item.cleanTitle || item.filename,
      type: item.type || 'película',
      genres: item.genres || [],
      year: item.year || null,
      rating: item.rating || null,
      actors: (item.actors || []).slice(0, 4).map((a) => a.name),
      synopsis: (item.synopsis || '').slice(0, 180),
      path: item.path
    }));

    // 2. Construir la instrucción del sistema
    const systemInstruction = `Eres "CloudMedia Copilot", el asistente cinematográfico de élite y recomendador de CloudMedia Hub.
Tu misión es guiar al usuario a través del catálogo de entretenimiento en la nube, sugerir títulos, analizar tramas y responder cualquier inquietud sobre cine, series, anime y cultura general.

CATÁLOGO ACTUALMENTE DISPONIBLE EN EL SERVIDOR CLOUDMEDIA HUB:
${JSON.stringify(catalogSummary, null, 2)}

DIRECTRICES:
1. Cuando el usuario consulte qué ver o pida recomendaciones (ej: "¿Qué películas de acción tenemos?", "recomiéndame algo bueno", "sorpréndeme con una joya"), busca y resalta PRIMERO los títulos disponibles en el catálogo de CloudMedia Hub presentado arriba.
2. Menciona detalles como géneros, actores y año cuando recomiendes un título del catálogo.
3. Si el usuario pregunta por películas o series que NO están en el catálogo, o hace preguntas generales del mundo del cine, actores o cualquier otro tema del mundo, aprovecha la herramienta de búsqueda de Google para entregar información precisa y actualizada.
4. Responde con un tono cinéfilo, cordial, entusiasta y elegante.
5. Utiliza formato Markdown limpio (negritas para títulos, listas numeradas o con viñetas, citas y emojis apropiados).
6. IDENTIFICACIÓN PRECISA DE TÍTULOS: Cuando recomiendes o menciones cualquier título que forme parte del catálogo de CloudMedia Hub, menciónalo SIEMPRE claramente por su nombre oficial (por ejemplo: **Batman: La máscara del fantasma** o **El Hijo de Batman**), de manera destacada para que el sistema de CloudMedia Hub genere tarjetas interactivas de reproducción directa ("Smart Watch") para el usuario.`;

    // 3. Preparar historial para Gemini
    // Formato de mensajes para @google/genai
    const formattedContents = [];

    // Añadir turnos previos del historial (últimos 8 mensajes para contexto óptimo)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-8);
      for (const turn of recentHistory) {
        if (turn.role && turn.text) {
          formattedContents.push({
            role: turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user',
            parts: [{ text: turn.text }]
          });
        }
      }
    }

    // Mensaje actual del usuario
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const candidateModels = [
      'gemini-3.5-flash-lite',
      process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      'gemini-3.8-flash'
    ];

    let aiResponse = null;
    let usedGoogleSearch = false;
    let sources = [];

    // 4. Intentar con herramienta Google Search
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: formattedContents,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }]
          }
        });

        aiResponse = response;
        usedGoogleSearch = true;

        // Extraer fuentes si Google Search aportó referencias
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
          sources = groundingMetadata.groundingChunks
            .map((chunk) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
            .filter(Boolean);
        }
        break;
      } catch (searchErr) {
        // Si googleSearch excede cuota o falla, reintentar sin tools de forma resiliente
        console.warn(`[ChatAPI] Search tool no disponible con ${model} (${searchErr.message?.slice(0, 80)}). Reintentando en modo estándar...`);
        try {
          const standardResponse = await ai.models.generateContent({
            model,
            contents: formattedContents,
            config: {
              systemInstruction
            }
          });
          aiResponse = standardResponse;
          usedGoogleSearch = false;
          break;
        } catch (stdErr) {
          console.warn(`[ChatAPI] Error con ${model}:`, stdErr.message?.slice(0, 80));
        }
      }
    }

    if (!aiResponse || !aiResponse.text) {
      throw new Error('No se pudo generar respuesta con los modelos de Gemini disponibles.');
    }

    // 5. Analizar la respuesta generada y extraer títulos coincidentes con el catálogo
    const matchedMedia = extractMatchedMedia(aiResponse.text, metadataCache, 4);

    return res.json({
      reply: aiResponse.text,
      grounded: usedGoogleSearch && sources.length > 0,
      sources,
      matchedMedia
    });
  } catch (error) {
    console.error('[ChatAPI] Error en /api/chat:', error);
    return res.status(500).json({
      error: error.message || 'Error al procesar la conversación con Gemini.'
    });
  }
});

export default router;
