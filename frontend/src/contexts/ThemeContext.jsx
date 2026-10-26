import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME } from '../styles/themes';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('cmh_theme') || DEFAULT_THEME;
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
    root.style.setProperty('--glass-color', colors.glassColor);
    root.setAttribute('data-theme', themeId);

    // Actualizar clase de tema si es daylight (light mode)
    if (themeId === 'daylight-studio') {
      root.classList.add('theme-light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('theme-light');
      root.classList.add('dark');
    }

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
