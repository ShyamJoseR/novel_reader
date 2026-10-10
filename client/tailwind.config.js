/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        dyslexic: ['"Atkinson Hyperlegible"', 'sans-serif']
      },
      colors: {
        sepia: {
          50: '#fbf7ee',
          100: '#f6eedc',
          200: '#eddcb9',
          800: '#433422',
          900: '#2c2216',
          950: '#1b140c',
        },
        forest: {
          900: '#0c1a15',
          950: '#060d0a',
        },
        latte: {
          900: '#1f1915',
          950: '#140f0c',
        }
      }
    },
  },
  plugins: [],
}
