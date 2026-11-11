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
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc5fb",
          400: "#36a4f7",
          500: "#0c87eb",
          600: "#006bc9",
          700: "#0155a3",
          800: "#064886",
          900: "#0b3c6f",
          950: "#07264a",
        },
        slate: {
          850: "#151e2e",
          900: "#0f172a",
          950: "#080d1a",
        }
      },
    },
  },
  plugins: [],
};
export default config;
