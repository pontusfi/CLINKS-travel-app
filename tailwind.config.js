/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0B0A12',
        'bg-outer': '#100E16',
        card: '#15131D',
        surface: '#16141F',
        border: 'rgba(255,255,255,0.06)',
        'border-light': 'rgba(255,255,255,0.12)',
        'text-primary': '#F5F3FA',
        'text-secondary': '#B6B0C8',
        'text-muted': '#6B6680',
        accent: '#9B5CFF',
        pink: '#FF3D8B',
        lime: '#C6FF4D',
        green: '#6BE58A',
        'drink-beer': '#FFB23D',
        'drink-wine': '#FF5C6E',
        'drink-shot': '#FF3D8B',
        'drink-cocktail': '#35E2FF',
        'drink-soft': '#6BE58A',
        'drink-other': '#B98CFF',
      },
      fontFamily: {
        grotesk: ['SpaceGrotesk', 'System'],
        'grotesk-bold': ['SpaceGrotesk-Bold', 'System'],
        mono: ['SpaceMono', 'monospace'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '28px',
      },
    },
  },
  plugins: [],
}
