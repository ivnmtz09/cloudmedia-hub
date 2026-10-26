import React from 'react';

export function EpisodeProgressBar({ percentage = 0, className = '' }) {
  if (percentage <= 0) return null;

  const validPercent = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className={`w-full h-1 bg-white/20 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-theme-accent transition-all duration-300"
        style={{ width: `${validPercent}%` }}
      />
    </div>
  );
}

export default EpisodeProgressBar;
