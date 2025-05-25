/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'primary': '#e72d67',
        'accent': '#fef2f6',
        // Pastellfarben
        'pastel-pink': '#f7b0c9',
        'pastel-apricot': '#ffd4c1',
        'pastel-yellow': '#fff0cd',
        'pastel-mint': '#d4f0e2',
        'pastel-lavender': '#e1d4f0',
        'pastel-blue': '#c1e8ff',
        // Kräftige Pendants
        'bold-pink': '#e63e82',
        'bold-apricot': '#ff9b6a',
        'bold-yellow': '#ffce45',
        'bold-mint': '#4bcb98',
        'bold-lavender': '#9b6ddd',
        'bold-blue': '#47a9ff',
        // Grautöne
        'gray-light': '#f2e9ee',
        'gray-medium': '#d8d0d4',
        'gray-dark': '#806a74',
      },
      spacing: {
        'safe-smart': 'max(1rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))', 
      },
    },
  },
  plugins: [],
}