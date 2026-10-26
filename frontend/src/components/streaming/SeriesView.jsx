import React, { useState } from 'react';
import { Tv, Play, CheckCircle2, SkipForward, ChevronRight, Film } from 'lucide-react';
import EpisodeProgressBar from './EpisodeProgressBar';

export function SeriesView({ series, watchProgress = {}, onPlayEpisode, onBack }) {
  if (!series || !series.seasons || series.seasons.length === 0) {
    return (
      <div className="p-8 text-center text-theme-muted glass rounded-2xl">
        <Tv className="w-12 h-12 mx-auto mb-3 opacity-30 text-theme-accent" />
        <h3 className="text-base font-semibold text-theme-text">No hay temporadas registradas</h3>
        <p className="text-xs text-theme-muted mt-1">
          Sube contenido dentro de las carpetas de temporada para visualizarlas aquí.
        </p>
      </div>
    );
  }

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(
    series.seasons[0]?.number || 1
  );

  const currentSeason =
    series.seasons.find((s) => s.number === selectedSeasonNumber) || series.seasons[0];

  const totalEpisodes = series.seasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);

  // Determine next unwatched or in-progress episode
  let nextEpisode = null;
  for (const s of series.seasons) {
    for (const ep of s.episodes || []) {
      const prog = watchProgress[ep.path];
      if (!prog || prog.percentage < 90) {
        nextEpisode = ep;
        break;
      }
    }
    if (nextEpisode) break;
  }
  if (!nextEpisode && series.seasons[0]?.episodes?.[0]) {
    nextEpisode = series.seasons[0].episodes[0];
  }

  return (
    <div className="space-y-6 animate-fade-in text-theme-text">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden glass p-6 border border-white/10 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="w-24 h-36 sm:w-32 sm:h-48 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-xl">
          {series.posterUrl ? (
            <img src={series.posterUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Tv className="w-10 h-10 text-theme-accent" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-theme-accent/15 text-theme-accent border border-theme-accent/20">
              {series.type === 'anime' ? 'Anime' : 'Serie'}
            </span>
            <span className="text-xs text-theme-muted">
              {series.seasons.length} Temporada(s) • {totalEpisodes} Episodio(s)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-theme-text mb-2">
            {series.title}
          </h1>

          {series.synopsis && (
            <p className="text-sm text-theme-muted line-clamp-3 mb-4 max-w-3xl">
              {series.synopsis}
            </p>
          )}

          {nextEpisode && (
            <button
              onClick={() => onPlayEpisode(nextEpisode)}
              className="min-h-12 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-theme-accent hover:bg-theme-accent-hover text-white text-sm font-semibold transition-all shadow-lg shadow-theme-accent/25 focus-ring"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Reproducir {nextEpisode.cleanTitle || `T${nextEpisode.season}E${nextEpisode.episode}`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Seasons Selector and Episodes List */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Seasons Sidebar */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-theme-muted mb-3 px-1">
            Temporadas
          </h2>
          <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {series.seasons.map((s) => {
              const isSelected = s.number === selectedSeasonNumber;
              return (
                <button
                  key={s.number}
                  onClick={() => setSelectedSeasonNumber(s.number)}
                  className={`min-h-12 w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all focus-ring text-left ${
                    isSelected
                      ? 'border-theme-accent bg-theme-accent/15 text-theme-accent shadow-sm'
                      : 'border-theme-border/60 text-theme-muted hover:text-theme-text hover:bg-white/5'
                  }`}
                >
                  <span>Temporada {s.number}</span>
                  <span className="text-xs opacity-75 font-mono">
                    {s.episodes?.length || 0} ep.
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Episodes Grid */}
        <div className="md:col-span-3 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-theme-muted mb-3 px-1">
            Episodios — Temporada {selectedSeasonNumber}
          </h2>

          <div className="space-y-2">
            {(currentSeason?.episodes || []).map((ep, idx) => {
              const prog = watchProgress[ep.path];
              const isCompleted = prog && prog.percentage >= 90;

              return (
                <div
                  key={ep.path || idx}
                  onClick={() => onPlayEpisode(ep)}
                  className="group flex items-center gap-4 p-3 rounded-xl glass border border-white/5 hover:border-theme-accent/30 hover:bg-white/5 cursor-pointer transition-all"
                >
                  {/* Episode Number / Thumbnail Placeholder */}
                  <div className="w-16 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 relative overflow-hidden group-hover:border-theme-accent/40">
                    <span className="font-mono text-xs font-bold text-theme-muted group-hover:text-theme-accent">
                      {ep.episode ? `E${ep.episode}` : `#${idx + 1}`}
                    </span>
                    {prog && (
                      <div className="absolute bottom-0 inset-x-0">
                        <EpisodeProgressBar percentage={prog.percentage} />
                      </div>
                    )}
                  </div>

                  {/* Title & Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate group-hover:text-theme-accent transition-colors">
                        {ep.cleanTitle || ep.name}
                      </span>
                      {isCompleted && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-theme-muted">
                        T{ep.season || selectedSeasonNumber} : E{ep.episode || idx + 1}
                      </span>
                      {ep.badges?.map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-theme-accent/10 text-theme-accent border border-theme-accent/20"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Play Action */}
                  <div className="flex-shrink-0 p-2.5 rounded-lg bg-white/5 group-hover:bg-theme-accent group-hover:text-white text-theme-muted transition-all">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeriesView;
