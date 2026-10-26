/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'theme-bg': 'var(--color-bg)',
        'theme-surface': 'var(--color-surface)',
        'theme-card': 'var(--color-card)',
        'theme-border': 'var(--color-border)',
        'theme-accent': 'var(--color-accent)',
        'theme-accent-hover': 'var(--color-accent-hover)',
        'theme-text': 'var(--color-text)',
        'theme-muted': 'var(--color-text-muted)',
        brand: {
          50: '#fdf2f2',
          100: '#fde8e8',
          400: '#f87171',
          500: '#e50914',
          600: '#dc2626',
          700: '#b91c1c',
        },
        dark: {
          950: '#0a0a0c',
          900: '#0f1117',
          850: '#131620',
          800: '#181c2a',
          750: '#1f2436',
          700: '#282e45',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 25px -5px rgba(229, 9, 20, 0.4)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.4)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.4)',
      },
      animation: {
        'slide-up': 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.25s ease-out both',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
