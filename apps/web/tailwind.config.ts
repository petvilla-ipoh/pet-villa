import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        villa: {
          coral: "#e8927c",
          peach: "#f5c4b3",
          bg: "#faf6f2",
          text: "#3d1f0d",
          green: "#7a9e7e",
          brown: "#3d1f0d",
          sidebar: "#2a1508",
          cream: "#fffaf7",
          line: "#efd8cd"
        }
      },
      borderRadius: {
        villa: "24px",
        pill: "999px"
      },
      boxShadow: {
        villa: "0 20px 55px rgba(61, 31, 13, 0.10)",
        soft: "0 12px 30px rgba(232, 146, 124, 0.28)"
      },
      fontFamily: {
        title: ["var(--font-title)", "Playfair Display", "serif"],
        body: ["var(--font-body)", "Nunito", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
