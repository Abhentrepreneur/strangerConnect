/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#141414',
        primary: '#7C3AED',
        secondary: '#EC4899',
        accent: '#06B6D4',
        muted: '#888888',
        border: '#2A2A2A',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
