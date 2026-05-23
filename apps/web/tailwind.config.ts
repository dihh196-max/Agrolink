import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a5c2a',
          light: '#2d8a42',
          dark: '#0f3d1c',
        },
        secondary: {
          DEFAULT: '#f5a623',
          light: '#fbc654',
        },
        agro: {
          green: '#1a5c2a',
          gold: '#f5a623',
          earth: '#8b6914',
          sky: '#2563eb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
