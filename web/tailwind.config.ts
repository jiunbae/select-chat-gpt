import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#10a37f",
        "primary-hover": "#1a7f64",
        "chatgpt-dark": "#212121",
        "chatgpt-light": "#f7f7f8",
      },
    },
  },
  plugins: [],
} satisfies Config;
