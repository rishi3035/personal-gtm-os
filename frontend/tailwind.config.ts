import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#090b10",
          900: "#0e1118",
          850: "#131620",
          800: "#171b28",
          750: "#1d2232",
          700: "#242a3e",
        },
        neon: {
          purple: "#c084fc",
          "purple-deep": "#9333ea",
          "purple-glow": "#a855f7",
          lime: "#a3e635",
          "lime-glow": "#84cc16",
          pink: "#f472b6",
          cyan: "#38bdf8",
        },
        brand: {
          500: "#a855f7",
          600: "#9333ea",
        }
      },
      boxShadow: {
        "neon-purple": "0 0 25px -4px rgba(168, 85, 247, 0.45)",
        "neon-lime": "0 0 25px -4px rgba(163, 230, 53, 0.45)",
        "card-glow": "0 10px 30px -10px rgba(0, 0, 0, 0.7)",
      }
    },
  },
  plugins: [],
};
export default config;
