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
        /* ── Core Brand (from Stitch Design System) ── */
        background: "#FFF9FB",
        surface: {
          DEFAULT: "#FFFFFF",
          dim: "#e4d7d9",
          bright: "#fff8f8",
          container: {
            DEFAULT: "#f8eaed",
            low: "#fef0f3",
            high: "#f3e5e8",
            highest: "#eddfe2",
            lowest: "#ffffff",
          },
          variant: "#eddfe2",
          tint: "#8f4766",
        },
        primary: {
          DEFAULT: "#8f4766",
          pink: "#FFA6C9",
          rose: "#DE5D83",
          container: "#ffa6c9",
          fixed: { DEFAULT: "#ffd9e5", dim: "#ffb0ce" },
        },
        secondary: {
          DEFAULT: "#a73259",
          container: "#ff769d",
          fixed: { DEFAULT: "#ffd9e0", dim: "#ffb1c2" },
        },
        tertiary: {
          DEFAULT: "#386933",
          container: "#97ce8c",
          fixed: { DEFAULT: "#b8f1ac", dim: "#9dd592" },
        },
        nude: "#F1DDCF",
        outline: { DEFAULT: "#847378", variant: "#d6c1c7" },
        inverse: {
          surface: "#362e31",
          "on-surface": "#fbedf0",
          primary: "#ffb0ce",
        },
        /* ── Semantic text colors ── */
        text: {
          primary: "#2B2025",
          secondary: "#766970",
        },
        "primary-text": "#2B2025",
        "secondary-text": "#766970",
        "on-surface": { DEFAULT: "#211a1c", variant: "#524348" },
        "on-primary": { DEFAULT: "#ffffff", container: "#7b3756", fixed: "#3c0322", "fixed-variant": "#72304e" },
        "on-secondary": { DEFAULT: "#ffffff", container: "#750534", fixed: "#3f0019", "fixed-variant": "#871842" },
        "on-tertiary": { DEFAULT: "#ffffff", container: "#275824", fixed: "#002202", "fixed-variant": "#20511d" },
        "on-error": "#ffffff",
        "on-background": "#211a1c",
        /* ── Status / Feedback ── */
        status: {
          success: "#65A982",
          warning: "#E6A23C",
          danger: "#D94B63",
        },
        error: { DEFAULT: "#ba1a1a", container: "#ffdad6" },
        "on-error-container": "#93000a",
      },
      fontFamily: {
        poppins: ["var(--font-poppins)", "sans-serif"],
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        "2xs": "0 2px 8px -1px rgba(143, 71, 102, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.03)",
        "xs": "0 4px 14px -2px rgba(143, 71, 102, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
        "sm": "0 8px 22px -3px rgba(143, 71, 102, 0.12), 0 3px 8px -2px rgba(0, 0, 0, 0.04)",
        DEFAULT: "0 12px 30px -4px rgba(143, 71, 102, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.05)",
        "md": "0 16px 36px -6px rgba(143, 71, 102, 0.15), 0 6px 16px -3px rgba(0, 0, 0, 0.05)",
        "lg": "0 22px 48px -8px rgba(143, 71, 102, 0.18), 0 8px 22px -4px rgba(0, 0, 0, 0.06)",
        "xl": "0 28px 60px -10px rgba(143, 71, 102, 0.22), 0 12px 28px -5px rgba(0, 0, 0, 0.07)",
        "2xl": "0 36px 75px -12px rgba(143, 71, 102, 0.26), 0 16px 36px -6px rgba(0, 0, 0, 0.09)",
        "glow": "0 0 30px rgba(255, 166, 201, 0.4)",
        "card": "0 10px 32px -4px rgba(143, 71, 102, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
