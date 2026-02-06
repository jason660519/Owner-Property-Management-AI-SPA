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
      },
    },
  },
  plugins: [],
}

export default config
