/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'devdb-dark': '#1a1e29',
        'devdb-navy': '#132d46',
        'devdb-primary': '#01c38e',
        'devdb-white': '#ffffff',
      }
    },
  },
  plugins: [],
}