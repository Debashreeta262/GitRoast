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
        // Semantic background tokens (Linear/Vercel calm dark slate)
        bg: {
          DEFAULT: "#0B0F19",
          subtle: "#111827",
        },
        background: "#0B0F19",

        // Surface / Card tokens
        surface: {
          DEFAULT: "#111827",
          elevated: "#161E2E",
          hover: "#1F2A3C",
          card: "#111827",
          border: "#1F2A3C",
        },

        // Border tokens
        border: {
          DEFAULT: "#1F2A3C",
          subtle: "#161E2E",
          focus: "#4F46E5",
        },

        // Text tokens (Warm white, slate secondary, muted tertiary)
        text: {
          primary: "#F9FAFB",
          secondary: "#94A3B8",
          muted: "#64748B",
        },

        // Confident primary accent (Indigo/Blue family, used universally for primary actions)
        accent: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#6366F1",
          dark: "#3730A3",
          glow: "rgba(79, 70, 229, 0.2)",
        },
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#6366F1",
          dark: "#3730A3",
        },

        // Roast accent (Warm coral/rose, used strictly for roast elements)
        roast: {
          DEFAULT: "#F43F5E",
          hover: "#E11D48",
          light: "#FB7185",
          glow: "rgba(244, 63, 94, 0.2)",
        },

        // Unified score scale (<40 danger, 40-69 warning, 70+ success)
        score: {
          danger: "#EF4444",
          warning: "#F59E0B",
          success: "#10B981",
        },

        // Semantic status tokens
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#0EA5E9",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.4)",
        card: "0 4px 16px -2px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)",
        "glow-accent": "0 0 20px -4px rgba(79, 70, 229, 0.25)",
        "glow-roast": "0 0 20px -4px rgba(244, 63, 94, 0.25)",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
    },
  },
  plugins: [],
}
