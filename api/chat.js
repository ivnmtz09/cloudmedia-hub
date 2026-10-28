import { getGeminiClient } from './utils/gemini.js';

/**
 * Serverless Function /api/chat
 * Chatbot cinemático interactivo con Google Gemini (@google/genai)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  const { message, history = [], catalog = [] } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Mensaje requerido en el cuerpo de la petición' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY no está configurada en las variables de entorno de Vercel.'
    });
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Catálogo simplificado para contextualizar a la IA (máximo 80 títulos para optimizar tokens)
  const catalogContext = Array.isArray(catalog)
    ? catalog.slice(0, 80).map((c) => c.cleanTitle || c.name || c.title).filter(Boolean)
    : [];

  const systemInstruction = `Eres "CloudMedIA", el asistente inteligente y experto cinematográfico de CloudMedia Hub.
Tu objetivo es recomendar películas, series o animes del catálogo del usuario, analizar tramas, explicar detalles curiosos y guiar al usuario sobre qué ver según sus gustos o estado de ánimo.

REGLAS DE RESPUESTA:
1. Responde de forma carismática, atractiva y concisa en español (máximo 2 a 3 párrafos).
2. Si el usuario pregunta por recomendaciones, menciona títulos disponibles en su catálogo cuando sea posible.
3. Menciona los títulos entre comillas dobles (ej: "Batman: El Caballero de la Noche") para que la plataforma pueda generar tarjetas clicables de reproducción.

Títulos destacados actualmente disponibles en la nube del usuario:
${catalogContext.length > 0 ? catalogContext.join(', ') : 'Catálogo disponible en Google Drive'}`;

  try {
    // Formatear historial para el SDK de Gemini
    const contents = [];
    for (const h of history.slice(-6)) {
      if (h.sender === 'user') {
        contents.push({ role: 'user', parts: [{ text: h.text }] });
      } else if (h.sender === 'bot' || h.role === 'model') {
        contents.push({ role: 'model', parts: [{ text: h.text || h.message }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction
      }
    });

    const reply = response.text || 'No pude procesar tu solicitud cinematográfica en este momento.';

    // Extraer títulos que coincidan para devolver tarjetas clicables
    const lowerReply = reply.toLowerCase();
    const matchedMedia = Array.isArray(catalog)
      ? catalog.filter((item) => {
          const title = (item.cleanTitle || item.name || '').toLowerCase();
          return title.length > 3 && lowerReply.includes(title);
        }).slice(0, 4)
      : [];

    return res.status(200).json({
      success: true,
      reply,
      matchedMedia
    });
  } catch (error) {
    console.error('[API Chat Error]:', error);
    return res.status(500).json({
      error: 'Error al comunicarse con Gemini AI',
      message: error.message
    });
  }
}

