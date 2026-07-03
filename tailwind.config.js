/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sve: {
          bg: '#0d0f14',
          surface: '#161a22',
          card: '#1c2130',
          border: '#2a3142',
          gold: '#c9a227',
          goldDim: '#8a7020',
          text: '#e8e6e3',
          muted: '#8b93a7',
          accent: '#4a6fa5',
        },
        craft: {
          forest: '#3d9e4f',
          sword: '#c9a227',
          rune: '#4a7fd4',
          dragon: '#c44b3f',
          abyss: '#7b4aad',
          haven: '#d4b84a',
          neutral: '#8b93a7',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        display: ['"Segoe UI"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(201, 162, 39, 0.15)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
