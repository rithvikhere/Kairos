import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#f5f2ec",       // warm bone — never pure #ffffff
        ink: "#1f2421",        // deep forest-charcoal — never pure #000000
        accent: "#3a5a6b",     // deep petrol/slate-teal — one solid color, no gradient
        neutral: "#e8e3d8",    // warm greige
        "risk-low": "#e6ede3", // sage
        "risk-mod": "#f2e6c8", // honey
        "risk-high": "#eccb9c",// amber-copper
        "risk-crit": "#d99a8a",// deep brick
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
