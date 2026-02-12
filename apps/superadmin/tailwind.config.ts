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
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        brand: {
          DEFAULT: 'var(--color-accent)',
          alt: 'var(--color-accent-hover)',
          light: '#a584f9',
        },
        border: {
          DEFAULT: 'var(--color-border-default)',
          light: 'var(--color-border-light)',
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
