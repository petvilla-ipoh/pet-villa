import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        villa: {
          primary: "#e8927c",
          "primary-light": "#f5c4b3",
          "primary-bg": "#fff8f5",
          background: "#faf6f2",
          surface: "#ffffff",
          "text-primary": "#3d1f0d",
          "text-secondary": "#7a5c45",
          "text-muted": "#bfaa9f",
          "accent-green": "#7a9e7e",
          "host-dark": "#3d1f0d",
          "host-sidebar": "#2a1508",
          coral: "#e8927c",
          peach: "#f5c4b3",
          bg: "#faf6f2",
          text: "#3d1f0d",
          green: "#7a9e7e",
          brown: "#3d1f0d",
          sidebar: "#2a1508",
          cream: "#ffffff",
          line: "#f5c4b3"
        }
      },
      borderRadius: {
        villa: "24px",
        pill: "999px"
      },
      boxShadow: {
        sm: "0 2px 8px rgba(61,31,13,0.06)",
        md: "0 4px 16px rgba(61,31,13,0.10)",
        lg: "0 8px 32px rgba(61,31,13,0.14)",
        villa: "0 4px 16px rgba(61,31,13,0.10)",
        soft: "0 12px 30px rgba(232,146,124,0.18)"
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
