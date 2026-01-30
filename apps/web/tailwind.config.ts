import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
      },
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        // 基於 Figma 設計的色彩系統
        grey: {
          '08': '#1A1A1A',   // Grey/08 - 主要背景
          '10': '#2A2A2A',   // Grey/10 - 次要背景
          '15': '#333333',   // Grey/15 - 邊框色
          '60': '#999999',   // Grey/60 - 次要文字
        },
        purple: {
          '60': '#7C3AED',   // Purple/60 - 主要互動色
          '70': '#6D28D9',   // Purple/70 - Hover 狀態
          '80': '#5B21B6',   // Purple/80 - Active 狀態
        },
        success: '#10B981',  // 成功綠色
        warning: '#EF4444',  // 警示紅色
        info: '#64748B',     // 資訊藍色
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // 基於 Figma 的文字層級
        'heading-xl': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-lg': ['36px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-md': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        // 基於 Figma 的圓角系統
        'sm': '8px',    // 小按鈕
        'md': '10px',   // 中按鈕
        'lg': '12px',   // 大按鈕、卡片
        'xl': '16px',   // 大型容器
        '2xl': '28px',  // 膠囊標籤
        '3xl': '75px',  // 特殊圓角
        'full': '9999px', // 完全圓形
      },
      spacing: {
        // 基於 8px 網格系統
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      boxShadow: {
        // 自定義陰影效果
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'button': '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config