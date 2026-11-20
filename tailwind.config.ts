import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "lila-bg": "#0a0a0f",
        "lila-panel": "#12121a",
        "lila-border": "#1e1e2e",
        "lila-accent": "#6366f1",
        "lila-human": "#22d3ee",
        "lila-bot": "#f1f5f9",
        "lila-kill": "#ef4444",
        "lila-death": "#f97316",
        "lila-loot": "#eab308",
        "lila-storm": "#a855f7",
      },
    },
  },
  plugins: [],
};

export default config;
