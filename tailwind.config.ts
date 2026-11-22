import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
          muted: "var(--surface-muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          subtle: "var(--accent-subtle)",
        },
        status: {
          working: "var(--status-working)",
          workingText: "var(--status-working-text)",
          off: "var(--status-off)",
          offText: "var(--status-off-text)",
          leave: "var(--status-leave)",
          leaveText: "var(--status-leave-text)",
          holiday: "var(--status-holiday)",
          holidayText: "var(--status-holiday-text)",
          compoff: "var(--status-compoff)",
          compoffText: "var(--status-compoff-text)",
          gap: "var(--status-gap)",
          gapText: "var(--status-gap-text)",
        },
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
