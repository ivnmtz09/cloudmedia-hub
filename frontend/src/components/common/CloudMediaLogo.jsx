import React from 'react';

export function CloudMediaLogo({ size = 32, variant = 'logomark', className = '' }) {
  const isType = variant === 'logotype';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-300 hover:scale-105"
        aria-hidden="true"
      >
        {/* Glow / Backdrop Circle */}
        <defs>
          <linearGradient id="cloudGrad" x1="4" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--color-accent, #6366f1)" />
            <stop offset="1" stopColor="var(--color-accent-hover, #818cf8)" />
          </linearGradient>
          <linearGradient id="playGrad" x1="12" y1="11" x2="20" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* Cloud Body Shape */}
        <path
          d="M9 22C6.23858 22 4 19.7614 4 17C4 14.4716 5.87412 12.3807 8.31846 12.0468C8.94827 8.58882 11.9613 6 15.6 6C19.7974 6 23.2 9.4026 23.2 13.6C25.8509 13.805 28 16.0354 28 18.75C28 21.6495 25.6495 24 22.75 24L9 24C7.89543 24 7 23.1046 7 22"
          stroke="url(#cloudGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Triangle / Play Symbol */}
        <path
          d="M13.5 11.5L20.5 15.5L13.5 19.5V11.5Z"
          fill="url(#playGrad)"
          stroke="var(--color-accent, #6366f1)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {isType && (
        <span className="font-bold tracking-tight text-lg text-theme-text flex items-center">
          Cloud<span className="text-theme-accent">Media</span>
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded font-mono font-semibold bg-theme-accent/15 text-theme-accent border border-theme-accent/20">
            HUB
          </span>
        </span>
      )}
    </div>
  );
}

export default CloudMediaLogo;
