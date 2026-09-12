import { describe, it, expect } from "vitest";
import { getRiskBand } from "../riskBand.js";
import { RISK_COLOR_MAP } from "../riskColorMap.js";

describe("riskBand and riskColorMap", () => {
  describe("getRiskBand boundary and threshold tests", () => {
    it("classifies riskScore < 25 as low when feasible", () => {
      expect(getRiskBand(0, true)).toBe("low");
      expect(getRiskBand(15, true)).toBe("low");
      expect(getRiskBand(24, true)).toBe("low");
      expect(getRiskBand(24.99, true)).toBe("low");
    });

    it("classifies 25 <= riskScore < 50 as moderate when feasible", () => {
      // 24 vs 25 boundary
      expect(getRiskBand(25, true)).toBe("moderate");
      expect(getRiskBand(35, true)).toBe("moderate");
      expect(getRiskBand(49, true)).toBe("moderate");
      expect(getRiskBand(49.99, true)).toBe("moderate");
    });

    it("classifies 50 <= riskScore < 75 as high", () => {
      // 49 vs 50 boundary (FEASIBILITY_RISK_THRESHOLD = 50 boundary)
      expect(getRiskBand(50, false)).toBe("high");
      expect(getRiskBand(50, true)).toBe("high");
      expect(getRiskBand(60, false)).toBe("high");
      expect(getRiskBand(74, false)).toBe("high");
      expect(getRiskBand(74.99, false)).toBe("high");
    });

    it("classifies riskScore >= 75 as critical", () => {
      // 74 vs 75 boundary
      expect(getRiskBand(75, false)).toBe("critical");
      expect(getRiskBand(85, false)).toBe("critical");
      expect(getRiskBand(100, false)).toBe("critical");
    });

    it("classifies any riskScore as critical if feasible is false even if riskScore is low", () => {
      // Even if riskScore < 25 or < 50, !feasible overrides to critical per specification
      expect(getRiskBand(10, false)).toBe("critical");
      expect(getRiskBand(24, false)).toBe("critical");
      expect(getRiskBand(35, false)).toBe("critical");
      expect(getRiskBand(49, false)).toBe("critical");
    });
  });

  describe("RISK_COLOR_MAP configuration", () => {
    it("maps low risk to exact documented hex and properties", () => {
      expect(RISK_COLOR_MAP.low).toEqual({
        color: "#e6ede3",
        noiseIntensity: 0.8,
        speed: 1.0,
        label: "Low Risk",
        badgeBg: "#e6ede3",
        badgeText: "#2a4225",
        badgeBorder: "#c8d9c2",
      });
    });

    it("maps moderate risk to exact documented hex and properties", () => {
      expect(RISK_COLOR_MAP.moderate).toEqual({
        color: "#f2e6c8",
        noiseIntensity: 1.2,
        speed: 1.5,
        label: "Moderate Risk",
        badgeBg: "#f2e6c8",
        badgeText: "#524118",
        badgeBorder: "#ded0a6",
      });
    });

    it("maps high risk to exact documented hex and properties", () => {
      expect(RISK_COLOR_MAP.high).toEqual({
        color: "#eccb9c",
        noiseIntensity: 1.6,
        speed: 2.2,
        label: "High Risk",
        badgeBg: "#eccb9c",
        badgeText: "#573511",
        badgeBorder: "#d6ad76",
      });
    });

    it("maps critical risk to exact documented hex and properties", () => {
      expect(RISK_COLOR_MAP.critical).toEqual({
        color: "#d99a8a",
        noiseIntensity: 2.0,
        speed: 3.0,
        label: "Critical Risk",
        badgeBg: "#d99a8a",
        badgeText: "#4f1e14",
        badgeBorder: "#bf7765",
      });
    });

    it("maps neutral state to exact documented base/greige hex and properties", () => {
      expect(RISK_COLOR_MAP.neutral).toEqual({
        color: "#f5f2ec",
        noiseIntensity: 0.5,
        speed: 0.8,
        label: "Neutral",
        badgeBg: "#e8e3d8",
        badgeText: "#1f2421",
        badgeBorder: "#d4cdc0",
      });
    });
  });
});
