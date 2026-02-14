import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primitive colors
        grey: { '08': '#1A1A1A', '10': '#2A2A2A', '15': '#333333', '60': '#999999' },
        purple: { '60': '#7C3AED', '70': '#6D28D9' },

        // Semantic colors (mapped to CSS variables — auto-switch with theme)
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
        border: {
          default: 'var(--color-border-default)',
          light: 'var(--color-border-light)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
        },
      },
      fontFamily: {
        primary: ['Urbanist', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'md': '10px',
        'base': '12px',
        'lg': '16px',
        'xl': '20px',
      },
    },
  },
  plugins: [],
}

export default config
