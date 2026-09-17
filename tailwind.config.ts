import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#343839",       // dark charcoal-slate background
        ink: "#ffffff",        // white text
        accent: "#3a5a6b",     // deep petrol/slate-teal — one solid color, no gradient
        neutral: "#454d4b",    // dark border and card neutral
        "risk-low": "#e6ede3", // sage
        "risk-mod": "#f2e6c8", // honey
        "risk-high": "#eccb9c",// amber-copper
        "risk-crit": "#d99a8a",// deep brick

        // Landing Identity Palette
        "landing-base": "#343839",         // dark background
        "landing-ink": "#ffffff",          // white text
        "landing-accent": "#2c4356",       // deep slate-navy
        "landing-accent-hover": "#1d2e3b", // deep state hover
        "signal-sage": "#8ba888",          // low risk / feasible signal
        "signal-amber": "#c98a3e",         // moderate risk signal
        "signal-terracotta": "#b5502f",     // high / critical risk signal
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-plus-jakarta)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 8px -2px rgba(31, 36, 33, 0.05), 0 1px 3px -1px rgba(31, 36, 33, 0.08)",
        "card-hover": "0 8px 24px -4px rgba(31, 36, 33, 0.12), 0 4px 8px -2px rgba(31, 36, 33, 0.06)",
        modal: "0 16px 40px -8px rgba(31, 36, 33, 0.16)",
      },
      transitionDuration: {
        deliberate: "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
