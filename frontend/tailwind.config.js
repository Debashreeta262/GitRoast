/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0c10",
        surface: "#11141b",
        "surface-card": "#161b24",
        "surface-border": "#212836",
        primary: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          light: "#818cf8",
          dark: "#3730a3",
        },
        roast: {
          DEFAULT: "#f43f5e",
          glow: "rgba(244, 63, 94, 0.2)",
        },
        success: "#10b981",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
