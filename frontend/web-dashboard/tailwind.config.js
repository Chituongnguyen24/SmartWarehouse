/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6750A4',
          on: '#FFFFFF',
          container: '#EADDFF',
          onContainer: '#21005D',
        },
        secondary: {
          DEFAULT: '#625B71',
          on: '#FFFFFF',
          container: '#E8DEF8',
          onContainer: '#1D192B',
        },
        error: {
          DEFAULT: '#B3261E',
          on: '#FFFFFF',
          container: '#F9DEDC',
          onContainer: '#410E0B',
        },
        background: {
          DEFAULT: '#FFFBFE',
          on: '#1C1B1F',
        },
        surface: {
          DEFAULT: '#FFFBFE',
          on: '#1C1B1F',
          variant: '#E7E0EC',
          onVariant: '#49454F',
        },
        outline: '#79747E',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '28px',
      }
    },
  },
  plugins: [],
}
