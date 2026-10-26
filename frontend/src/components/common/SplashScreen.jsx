import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export function SplashScreen({ onFinish }) {
  const { currentTheme } = useTheme();
  const [phase, setPhase] = useState('entering'); // 'entering' | 'settling' | 'exiting' | 'done'

  useEffect(() => {
    // If in test automation or already seen in session, complete swiftly
    const isTest = typeof navigator !== 'undefined' && navigator.webdriver;
    const hasSeen = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('cmh_splash_seen');

    if (hasSeen) {
      setPhase('done');
      if (onFinish) onFinish();
      return;
    }

    if (isTest) {
      sessionStorage.setItem('cmh_splash_seen', 'true');
      setPhase('done');
      if (onFinish) onFinish();
      return;
    }

    // Programmatic animation sequence
    const t1 = setTimeout(() => {
      setPhase('settling');
    }, 600);

    const t2 = setTimeout(() => {
      setPhase('exiting');
    }, 1500);

    const t3 = setTimeout(() => {
      sessionStorage.setItem('cmh_splash_seen', 'true');
      setPhase('done');
      if (onFinish) onFinish();
    }, 1900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  const handleSkip = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cmh_splash_seen', 'true');
    }
    setPhase('done');
    if (onFinish) onFinish();
  };

  if (phase === 'done') return null;

  const accentColor = currentTheme?.colors?.accent || '#E50914';
  const bgColor = currentTheme?.colors?.bg || '#141414';

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-500 ${
        phase === 'exiting' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ backgroundColor: bgColor }}
      role="banner"
      aria-label="Pantalla de bienvenida CloudMedia Hub"
    >
      <div className="relative flex flex-col items-center justify-center text-center px-4">
        {/* Animated Vector Logo */}
        <div className="relative mb-6">
          <svg
            width="88"
            height="88"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-transform duration-700 ease-out"
            style={{
              transform: phase === 'entering' ? 'scale(0.85)' : 'scale(1)',
              filter: `drop-shadow(0 0 24px ${accentColor}40)`
            }}
          >
            <defs>
              <linearGradient id="splashCloudGrad" x1="4" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor={accentColor} />
                <stop offset="1" stopColor={currentTheme?.colors?.accentHover || accentColor} />
              </linearGradient>
              <linearGradient id="splashPlayGrad" x1="12" y1="11" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" />
                <stop offset="1" stopColor="#e2e8f0" />
              </linearGradient>
            </defs>

            {/* Cloud Outline Path with stroke animation */}
            <path
              d="M9 22C6.23858 22 4 19.7614 4 17C4 14.4716 5.87412 12.3807 8.31846 12.0468C8.94827 8.58882 11.9613 6 15.6 6C19.7974 6 23.2 9.4026 23.2 13.6C25.8509 13.805 28 16.0354 28 18.75C28 21.6495 25.6495 24 22.75 24L9 24C7.89543 24 7 23.1046 7 22"
              stroke="url(#splashCloudGrad)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="120"
              style={{
                animation: 'splashDrawStroke 1.2s var(--ease-spring) forwards'
              }}
            />

            {/* Central Play Triangle */}
            <path
              d="M13.5 11.5L20.5 15.5L13.5 19.5V11.5Z"
              fill="url(#splashPlayGrad)"
              stroke={accentColor}
              strokeWidth="1.2"
              strokeLinejoin="round"
              className="transition-opacity duration-500"
              style={{
                opacity: phase === 'entering' ? 0 : 1,
                transformOrigin: '16px 16px',
                transform: phase === 'entering' ? 'scale(0.5)' : 'scale(1)',
                transition: 'all 0.5s var(--ease-spring)'
              }}
            />
          </svg>
        </div>

        {/* Title Typography Reveal */}
        <div
          className="flex items-center tracking-tight font-bold text-3xl text-white transition-all duration-700"
          style={{
            opacity: phase === 'entering' ? 0 : 1,
            transform: phase === 'entering' ? 'translateY(8px)' : 'translateY(0)'
          }}
        >
          <span>Cloud</span>
          <span style={{ color: accentColor }}>Media</span>
          <span
            className="ml-2 text-xs px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${accentColor}25`,
              color: accentColor,
              border: `1px solid ${accentColor}40`
            }}
          >
            HUB
          </span>
        </div>

        <p
          className="text-xs text-slate-400 mt-2 tracking-widest uppercase font-mono transition-opacity duration-700"
          style={{ opacity: phase === 'entering' ? 0 : 0.8 }}
        >
          {currentTheme?.name || 'Streaming Experience'}
        </p>

        {/* Programmatic Progress Bar */}
        <div className="w-36 h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: phase === 'entering' ? '30%' : '100%',
              backgroundColor: accentColor
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
