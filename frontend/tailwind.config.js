/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#121212',
        'dark-surface': '#1E1E1E',
        'dark-text': '#FFFFFF',
        'dark-text-secondary': '#B0B0B0',
        'brand-primary': '#64FFDA',
        'status-success': '#4CAF50',
        'status-danger': '#F44336',
        'status-info': '#2196F3',
      },
    },
  },
  plugins: [],
}