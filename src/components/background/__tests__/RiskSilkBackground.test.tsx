// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RiskSilkBackground } from "../RiskSilkBackground.js";
import { RISK_COLOR_MAP } from "../../../lib/riskColorMap.js";

describe("RiskSilkBackground", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const setupMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  };

  it("renders static color fallback fill when prefers-reduced-motion is true", () => {
    setupMatchMedia(true);

    render(<RiskSilkBackground riskBand="critical" />);

    const fallback = screen.getByTestId("risk-silk-reduced-motion-fallback");
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveStyle({
      backgroundColor: RISK_COLOR_MAP.critical.color,
    });
  });

  it("renders animated container when prefers-reduced-motion is false", () => {
    setupMatchMedia(false);

    render(<RiskSilkBackground riskBand="low" />);

    const container = screen.getByTestId("risk-silk-container");
    expect(container).toBeInTheDocument();
  });

  it("applies neutral state color correctly under reduced motion", () => {
    setupMatchMedia(true);

    render(<RiskSilkBackground riskBand="neutral" />);

    const fallback = screen.getByTestId("risk-silk-reduced-motion-fallback");
    expect(fallback).toHaveStyle({
      backgroundColor: RISK_COLOR_MAP.neutral.color,
    });
  });
});
