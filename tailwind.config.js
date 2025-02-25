/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette for the dark theme
        'dark-bg': '#121212',
        'dark-surface': '#1E1E1E',
        'dark-border': '#333333',
        'dark-text': '#E0E0E0',
        'dark-text-secondary': '#AAAAAA',
        
        // Brand colors
        'brand-primary': '#3B82F6',
        'brand-secondary': '#10B981',
        'brand-accent': '#8B5CF6',
        
        // Status colors
        'status-success': '#10B981',
        'status-warning': '#F59E0B',
        'status-danger': '#EF4444',
        'status-info': '#3B82F6',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      spacing: {
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
        '96': '24rem',
      },
      maxHeight: {
        '0': '0',
        'xl': '36rem',
        '2xl': '42rem',
        '3xl': '48rem',
      },
      minWidth: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        'full': '100%',
      },
    },
  },
  plugins: [],
  darkMode: 'class', // or 'media' for system preference
}
