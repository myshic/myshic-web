/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/popup.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
          'Roboto', 'Helvetica', 'Arial', 'sans-serif',
        ],
      },
      colors: {
        /* Netlight green accent */
        netgreen: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        /* Dark surface palette */
        surface: {
          900: '#0c0f14',
          800: '#13161d',
          700: '#1a1e27',
          600: '#252a35',
        },
      },
    },
  },
  plugins: [],
}
