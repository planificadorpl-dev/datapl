/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ios: {
          bg: '#F2F2F7',
          card: '#FFFFFF',
          text: '#000000',
          subtext: '#8E8E93',
          border: '#C6C6C8',
          blue: '#007AFF', // Standard action color
        }
      },
      boxShadow: {
        'ios': '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [],
}
