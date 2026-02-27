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
        bg: {
          top: "var(--bg-gradient-top)",
          bottom: "var(--bg-gradient-bottom)",
          card: "var(--bg-card)",
          glass: "var(--bg-card-glass)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          secondary: "var(--accent-secondary)",
        },
        cta: {
          from: "var(--cta-from)",
          to: "var(--cta-to)",
          glow: "var(--cta-glow)",
        },
        element: {
          wood: "var(--element-wood)",
          fire: "var(--element-fire)",
          earth: "var(--element-earth)",
          metal: "var(--element-metal)",
          water: "var(--element-water)",
        },
        t1: "var(--t1)",
        t2: "var(--t2)",
        t3: "var(--t3)",
        glass: {
          border: "var(--glass-border)",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "Pretendard Variable", "sans-serif"],
        serif: ["Noto Serif KR", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
