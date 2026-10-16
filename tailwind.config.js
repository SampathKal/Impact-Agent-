/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        instrument: ["'Instrument Serif'", "serif"]
      },
      transitionTimingFunction: {
        entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
        overlay: "cubic-bezier(0.76, 0, 0.24, 1)"
      }
    }
  },
  plugins: []
};
