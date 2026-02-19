import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "#FAF8F5",
        brand: {
          600: "#16A34A",
          700: "#15803D",
        },
        primary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532d",
        },
        beige: {
          50: "#fdfcfb",
          100: "#faf8f5",
          200: "#f5f1ea",
        },
      },
      borderRadius: {
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 10px 35px -16px rgba(17, 24, 39, 0.18)",
      },
      backgroundImage: {
        "mosque-pattern":
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14) 0 8%, transparent 9%), radial-gradient(circle at 80% 35%, rgba(255,255,255,0.12) 0 7%, transparent 8%), linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
      },
    },
  },
  plugins: [],
};

export default config;
