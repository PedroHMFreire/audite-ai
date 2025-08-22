/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
}
