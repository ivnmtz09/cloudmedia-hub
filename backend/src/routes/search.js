import express from 'express';
import { authGuard, roleGuard } from '../middleware/auth.js';
import { readMetadata } from '../services/metadataService.js';
import { listFiles } from '../services/filesService.js';
import { semanticSearchWithAI } from '../services/geminiService.js';

const router = express.Router();

/**
 * POST /api/search/semantic
 * Búsqueda semántica usando lenguaje natural procesada con Google Gemini AI.
 * Requiere rol 'viewer' o superior.
 */
router.post('/semantic', authGuard, roleGuard('viewer'), async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Parámetro query requerido en el cuerpo de la petición' });
    }

    // 1. Obtener catálogo actual combinando metadatos guardados y archivos físicos
    const metadataMap = await readMetadata().catch(() => ({}));
    const catalogItems = [];

    // Cargar películas y series del almacenamiento
    const categories = ['Peliculas', 'Series', 'Anime', 'Videos_Personales'];
    for (const cat of categories) {
      try {
        const fileList = await listFiles(cat);
        const videos = (fileList.items || []).filter((item) => !item.isDirectory && item.category === 'video');

        for (const v of videos) {
          const meta = metadataMap[v.path] || {};
          catalogItems.push({
            id: v.path,
            path: v.path,
            name: v.name,
            title: meta.title || v.name.replace(/\.[^/.]+$/, '').replace(/[\._-]/g, ' '),
            category: cat,
            genres: meta.genres || [],
            synopsis: meta.synopsis || meta.overview || '',
            year: meta.year || null,
            score: meta.score || null
          });
        }
      } catch (err) {
        // Continuar con otras categorías si alguna está vacía
      }
    }

    // 2. Invocar servicio de IA con Gemini
    const matches = await semanticSearchWithAI(query, catalogItems);

    return res.json({
      status: 'success',
      query,
      totalMatches: matches.length,
      results: matches
    });
  } catch (err) {
    console.error('Error en /api/search/semantic:', err);
    return res.status(500).json({ error: err.message || 'Error al ejecutar búsqueda semántica' });
  }
});

export default router;
