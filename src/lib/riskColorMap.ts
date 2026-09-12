import type { RiskBand } from "./riskBand.js";

/**
 * COLOR SYSTEM & RATIONALE:
 * The identity/accent color (#3a5a6b) is deliberately COOL (calm chrome, "this is the app"),
 * while every risk-band color is deliberately WARM (functional signal, "pay attention to this")
 * — the two families must never overlap in hue so a user can distinguish "an interactive control"
 * from "a risk indicator" at a glance.
 *
 * Base (background):      #f5f2ec   (warm bone — never pure #ffffff)
 * Ink (text):             #1f2421   (deep forest-charcoal — never pure #000000)
 * Accent (primary/focus): #3a5a6b   (deep petrol/slate-teal — one solid color, no gradient)
 * Card/border neutral:    #e8e3d8   (warm greige)
 * Risk band — low:        #e6ede3   (sage)
 * Risk band — moderate:   #f2e6c8   (honey)
 * Risk band — high:       #eccb9c   (amber-copper)
 * Risk band — critical:   #d99a8a   (deep brick)
 */

export interface RiskVisualConfig {
  color: string;
  noiseIntensity: number;
  speed: number;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const RISK_COLOR_MAP: Record<RiskBand | "neutral", RiskVisualConfig> = {
  low: {
    color: "#e6ede3",
    noiseIntensity: 0.8,
    speed: 1.0,
    label: "Low Risk",
    badgeBg: "#e6ede3",
    badgeText: "#2a4225",
    badgeBorder: "#c8d9c2",
  },
  moderate: {
    color: "#f2e6c8",
    noiseIntensity: 1.2,
    speed: 1.5,
    label: "Moderate Risk",
    badgeBg: "#f2e6c8",
    badgeText: "#524118",
    badgeBorder: "#ded0a6",
  },
  high: {
    color: "#eccb9c",
    noiseIntensity: 1.6,
    speed: 2.2,
    label: "High Risk",
    badgeBg: "#eccb9c",
    badgeText: "#573511",
    badgeBorder: "#d6ad76",
  },
  critical: {
    color: "#d99a8a",
    noiseIntensity: 2.0,
    speed: 3.0,
    label: "Critical Risk",
    badgeBg: "#d99a8a",
    badgeText: "#4f1e14",
    badgeBorder: "#bf7765",
  },
  neutral: {
    color: "#f5f2ec",
    noiseIntensity: 0.5,
    speed: 0.8,
    label: "Neutral",
    badgeBg: "#e8e3d8",
    badgeText: "#1f2421",
    badgeBorder: "#d4cdc0",
  },
};
