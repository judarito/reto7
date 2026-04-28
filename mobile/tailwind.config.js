/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#121212',
        neonGreen: '#39FF14',
        neonOrange: '#FF5F1F',
      },
    },
  },
  plugins: [],
}
