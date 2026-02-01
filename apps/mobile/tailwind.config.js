/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
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
        accent: {
          DEFAULT: '#703BF7',
          alt: '#6f3bf6',
          light: '#a584f9',
        },
        border: {
          DEFAULT: '#262626',
          light: '#333333',
          subtle: '#4c4c4c',
        },
        status: {
          success: '#09cf82',
          warning: '#ff9400',
          error: '#c5221f',
        }
      },
      fontFamily: {
        primary: ['Urbanist', 'system-ui', 'sans-serif'],
        fallback: ['Inter', 'Manrope', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '10px',
        base: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
        '3xl': '43px',
        '4xl': '58px',
        nav: '69px',
        pill: '75px',
        circle: '100px',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '30px',
        '9': '34px',
        '10': '38px',
        '11': '40px',
        '12': '46px',
        '14': '50px',
        '16': '60px',
        '20': '80px',
        '24': '100px',
        '28': '120px',
        '32': '150px',
        '36': '160px',
        '40': '162px',
        '48': '200px',
      }
    },
  },
  plugins: [],
}

