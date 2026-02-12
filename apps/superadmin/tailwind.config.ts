import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        grey: { '08': '#1A1A1A', '10': '#2A2A2A', '15': '#333333', '60': '#999999' },
        purple: { '60': '#7C3AED', '70': '#6D28D9' },
        // Design System Colors
        bg: {
          primary: '#141414',
          secondary: '#191919',
          tertiary: '#262626',
        },
        text: {
          primary: '#ffffff',
          secondary: '#999999',
          muted: '#666666',
        },
        brand: {
          DEFAULT: '#703BF7',
          alt: '#6f3bf6',
          light: '#a584f9',
        },
        border: {
          DEFAULT: '#262626',
          light: '#333333',
          subtle: '#4c4c4c',
        }
      },
      fontFamily: {
        primary: ['Urbanist', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'md': '10px',
        'base': '12px',
        'lg': '16px',
        'xl': '20px',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}

export default config
