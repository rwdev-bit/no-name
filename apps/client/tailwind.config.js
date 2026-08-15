/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          100: 'rgb(var(--color-primary) / 0.1)',
          200: 'rgb(var(--color-primary) / 0.2)',
          400: 'rgb(var(--color-primary) / 0.7)',
          500: 'rgb(var(--color-primary) / 0.8)',
          600: 'rgb(var(--color-primary))',
          700: 'rgb(var(--color-primary) / 0.85)',
        },
        surface: {
          50:  'var(--bg-main)',
          100: 'var(--text-primary)',
          200: 'var(--text-primary)',
          300: 'var(--text-primary)',
          400: 'var(--text-secondary)',
          500: 'var(--text-muted)',
          600: 'var(--text-muted)',
          700: 'var(--bg-hover)',
          800: 'var(--bg-card)',
          900: 'var(--bg-sidebar)',
          950: 'var(--bg-main)',
        },
        border: {
          DEFAULT: 'var(--border)',
        },
        red: {
          300: '#fca5a5',
          400: '#f87171',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        green: {
          300: '#86efac',
          400: '#4ade80',
          800: '#166534',
          900: '#14532d',
        },
        yellow: {
          300: '#fde047',
          700: '#a16207',
          900: '#713f12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
