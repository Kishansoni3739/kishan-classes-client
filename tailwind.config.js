/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        brand: "#0f766e",
        saffron: "#f59e0b",
        paper: "#f7f8f5"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 32, 42, 0.10)"
      }
    }
  },
  plugins: []
};
