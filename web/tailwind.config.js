/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // toggled by ThemeContext adding/removing "dark" on <html>
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Every color below reads from a CSS custom property (see index.css),
      // so light/dark values live in exactly ONE place and every component
      // that already uses e.g. bg-canvas or text-ink automatically adapts -
      // no per-component "dark:" classes needed, no hardcoded hex values
      // scattered across the codebase.
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        teal: {
          DEFAULT: 'rgb(var(--color-teal) / <alpha-value>)',
          dark: 'rgb(var(--color-teal-dark) / <alpha-value>)',
          light: 'rgb(var(--color-teal-light) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--color-gold) / <alpha-value>)',
          light: 'rgb(var(--color-gold-light) / <alpha-value>)',
        },
        line: 'rgb(var(--color-line) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        // Fixed brand color for solid buttons - deliberately does NOT flip
        // with theme, so white button text always has enough contrast
        // regardless of light/dark mode (see index.css comment).
        primary: '#0F6B5C',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
