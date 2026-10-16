/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        telegram: {
          blue: '#2AABEE',
          darkBlue: '#229ED9',
          darkBg: '#0f172a',
          sidebarDark: '#1e293b',
          chatBgDark: '#0b1120',
          bubbleDarkSelf: '#2b5278',
          bubbleDarkOther: '#1e293b',
          bubbleLightSelf: '#e3f2fd',
          bubbleLightOther: '#ffffff'
        }
      }
    },
  },
  plugins: [],
}
