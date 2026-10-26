import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME } from '../styles/themes';

const ThemeContext = createContext(null);

function updateFaviconColor(accentColor) {
  if (typeof document === 'undefined') return;
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="cloudGrad" x1="4" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stop-color="${accentColor}"/><stop offset="1" stop-color="${accentColor}"/></linearGradient><linearGradient id="playGrad" x1="12" y1="11" x2="20" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#f1f5f9"/></linearGradient></defs><path d="M9 22C6.23858 22 4 19.7614 4 17C4 14.4716 5.87412 12.3807 8.31846 12.0468C8.94827 8.58882 11.9613 6 15.6 6C19.7974 6 23.2 9.4026 23.2 13.6C25.8509 13.805 28 16.0354 28 18.75C28 21.6495 25.6495 24 22.75 24L9 24C7.89543 24 7 23.1046 7 22" stroke="url(#cloudGrad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 11.5L20.5 15.5L13.5 19.5V11.5Z" fill="url(#playGrad)" stroke="${accentColor}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  
  const encodedSvg = encodeURIComponent(svgString);
  const dataUri = `data:image/svg+xml,${encodedSvg}`;
  
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
  }
  link.href = dataUri;
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    const saved = localStorage.getItem('cmh_theme');
    return saved && THEMES[saved] ? saved : DEFAULT_THEME;
  });

  const [gridDensity, setGridDensity] = useState(() => {
    return localStorage.getItem('cmh_grid_density') || 'normal'; // 'compact' | 'normal' | 'spacious'
  });

  const currentTheme = THEMES[themeId] || THEMES[DEFAULT_THEME];

  useEffect(() => {
    const root = document.documentElement;
    const colors = currentTheme.colors;

    root.style.setProperty('--color-bg', colors.bg);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-card', colors.card);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-hover', colors.accentHover);
    root.style.setProperty('--color-accent-glow', colors.accentGlow);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-muted', colors.textMuted);
    root.setAttribute('data-theme', themeId);

    root.classList.remove('theme-light');
    root.classList.add('dark');

    updateFaviconColor(colors.accent);
    localStorage.setItem('cmh_theme', themeId);
  }, [themeId, currentTheme]);

  useEffect(() => {
    localStorage.setItem('cmh_grid_density', gridDensity);
  }, [gridDensity]);

  const changeTheme = (newThemeId) => {
    if (THEMES[newThemeId]) {
      setThemeId(newThemeId);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        currentTheme,
        changeTheme,
        gridDensity,
        setGridDensity,
        availableThemes: Object.values(THEMES)
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return ctx;
}
