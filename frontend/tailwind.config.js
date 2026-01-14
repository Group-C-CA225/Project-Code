/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#222831',  // Main Background / Text
          gray: '#393E46',  // Cards / Secondary Background
          teal: '#00ADB5',  // Primary Buttons / Accents
          light: '#EEEEEE', // Text on Dark / Light Backgrounds
        }
      }
    },
  },
  plugins: [],
}