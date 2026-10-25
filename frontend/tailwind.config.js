/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nina: {
          navy: '#0f172a',
          primary: '#1e3a8a',
          blue: '#2563eb',
          lightBlue: '#38bdf8',
          accent: '#0d9488',
          cream: '#f8fafc',
          border: '#e2e8f0',
          surface: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
