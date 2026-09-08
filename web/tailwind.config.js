/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F6F2',
        ink: '#1B1F23',
        teal: {
          DEFAULT: '#0F6B5C',
          dark: '#0B4F44',
          light: '#E4F0EC',
        },
        gold: {
          DEFAULT: '#C98A2C',
          light: '#FBF0DD',
        },
        line: '#DDD9CF',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
