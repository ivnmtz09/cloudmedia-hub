import { cleanTitleWithGemini, cleanTitleWithRegex } from './utils/gemini.js';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Consulta la API pública de The Movie Database (TMDB)
 */
async function queryTMDB(cleanTitle, type = 'pelicula', year = null) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('[Metadata API] TMDB_API_KEY no configurada en Vercel.');
    return null;
  }

  const isTV = type === 'serie' || type === 'anime';
  const endpoint = isTV ? 'tv' : 'movie';
  let searchUrl = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&language=es-MX&include_adult=false`;

  if (year) {
    searchUrl += isTV ? `&first_air_date_year=${year}` : `&year=${year}`;
  }

  try {
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    const firstResult = searchData.results?.[0];
    if (!firstResult) return null;

    // Obtener detalles adicionales con créditos (actores principales)
    const detailsUrl = `https://api.themoviedb.org/3/${endpoint}/${firstResult.id}?api_key=${apiKey}&language=es-MX&append_to_response=credits`;
    const detailsRes = await fetch(detailsUrl);
    const details = detailsRes.ok ? await detailsRes.json() : firstResult;

    const cast = (details.credits?.cast || [])
      .slice(0, 6)
      .map((actor) => ({
        name: actor.name,
        character: actor.character,
        photo: actor.profile_path ? `${TMDB_IMAGE_BASE}/w185${actor.profile_path}` : null
      }));

    return {
      tmdbId: firstResult.id,
      title: details.title || details.name || cleanTitle,
      original_title: details.original_title || details.original_name,
      overview: details.overview || 'Sinopsis no disponible en TMDB.',
      poster_path: details.poster_path ? `${TMDB_IMAGE_BASE}/w500${details.poster_path}` : null,
      backdrop_path: details.backdrop_path ? `${TMDB_IMAGE_BASE}/original${details.backdrop_path}` : null,
      vote_average: details.vote_average ? Math.round(details.vote_average * 10) / 10 : null,
      release_date: details.release_date || details.first_air_date,
      genres: (details.genres || []).map((g) => g.name),
      cast,
      status: details.status
    };
  } catch (err) {
    console.error('[Metadata API] Error consultando TMDB:', err.message);
    return null;
  }
}

/**
 * Serverless Function /api/metadata
 * Enriquecimiento cinematográfico con Gemini + TMDB
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawTitle = req.query.title || req.query.name || req.body?.title || req.body?.name || '';
  const forcedType = req.query.type || req.body?.type;

  if (!rawTitle) {
    return res.status(400).json({ error: 'Parámetro title o name requerido' });
  }

  try {
    // 1. Limpieza de título con IA Gemini o Regex
    const cleaned = process.env.GEMINI_API_KEY
      ? await cleanTitleWithGemini(rawTitle, forcedType || '')
      : cleanTitleWithRegex(rawTitle);

    const mediaType = forcedType || cleaned.type || 'pelicula';

    // 2. Consulta a TMDB con el nombre canónico
    const tmdbData = await queryTMDB(cleaned.cleanTitle, mediaType, cleaned.year);

    const enrichedMetadata = {
      cleanTitle: cleaned.cleanTitle,
      type: mediaType,
      seasonNumber: cleaned.seasonNumber,
      year: cleaned.year,
      poster_path: tmdbData?.poster_path || null,
      backdrop_path: tmdbData?.backdrop_path || null,
      overview: tmdbData?.overview || 'Sinopsis no disponible.',
      cast: tmdbData?.cast || [],
      genres: tmdbData?.genres || ['General'],
      rating: tmdbData?.vote_average || 7.0,
      release_date: tmdbData?.release_date || cleaned.year,
      tmdbId: tmdbData?.tmdbId || null
    };

    return res.status(200).json({
      success: true,
      metadata: enrichedMetadata,
      item: enrichedMetadata
    });
  } catch (error) {
    console.error('[API Metadata Error]:', error);
    return res.status(500).json({
      error: 'Error enriqueciendo metadatos',
      message: error.message
    });
  }
}

