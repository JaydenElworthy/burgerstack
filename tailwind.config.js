/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This makes 'font-sans' use Gopher
        sans: ['Gopher', 'sans-serif'],
      },
      colors: {
        picnicOrange: '#E55937',
        picnicYellow: '#FFE974',
      }
    },
  },
  plugins: [],
}
