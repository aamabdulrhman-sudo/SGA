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
        navy: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          600: "#1E3A5F",
          700: "#152C47",
          800: "#0F172A",
          900: "#0B1120",
        },
      },
      fontFamily: {
        arabic: ["Cairo", "IBM Plex Sans Arabic", "Tahoma", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
