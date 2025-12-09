/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{tsx,html}", "./contents/**/*.{tsx,html}"],
  darkMode: "class",
  prefix: "scgpt-",
  theme: {
    extend: {
      colors: {
        primary: "#10a37f",
        "primary-hover": "#1a7f64"
      }
    }
  }
}
