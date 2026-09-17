import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { HeroSection } from "../HeroSection.js";
import { FeatureShowcaseSection } from "../FeatureShowcaseSection.js";
import { DataVisualizationsSection } from "../DataVisualizationsSection.js";
import { FinalCtaSection } from "../FinalCtaSection.js";
import { FeaturePopupModal } from "../FeaturePopupModal.js";

beforeAll(() => {
  // Mock IntersectionObserver for Framer Motion viewport triggers in jsdom
  class MockIntersectionObserver {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  }
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  // Mock ResizeObserver for Recharts responsive containers in jsdom
  class MockResizeObserver {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: MockResizeObserver,
  });
});

afterEach(() => {
  cleanup();
});

describe("Landing Page Components", () => {
  it("HeroSection renders headline, subtitle, and Go to Kairos link", () => {
    render(<HeroSection />);

    expect(screen.getByText(/Every decision/i)).toBeInTheDocument();
    expect(screen.getByText(/has a shape\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/Kairos simulates project trade-offs in real time/i)
    ).toBeInTheDocument();

    const enterBtn = screen.getByTestId("hero-enter-btn");
    expect(enterBtn).toHaveAttribute("href", "/projects");
  });

  it("FeatureShowcaseSection renders hotspot markers and opens popup on click", () => {
    render(<FeatureShowcaseSection />);

    // 5 Hotspots should be present by testid
    const sliderHotspot = screen.getByTestId("hotspot-slider");
    const riskBadgeHotspot = screen.getByTestId("hotspot-risk-badge");
    const compareHotspot = screen.getByTestId("hotspot-compare");
    const monteCarloHotspot = screen.getByTestId("hotspot-monte-carlo");
    const aiPanelHotspot = screen.getByTestId("hotspot-ai-panel");

    expect(sliderHotspot).toBeInTheDocument();
    expect(riskBadgeHotspot).toBeInTheDocument();
    expect(compareHotspot).toBeInTheDocument();
    expect(monteCarloHotspot).toBeInTheDocument();
    expect(aiPanelHotspot).toBeInTheDocument();

    // Click slider hotspot to open modal
    fireEvent.click(sliderHotspot);
    expect(screen.getByText("Deterministic Core")).toBeInTheDocument();
    expect(
      screen.getByText(/Adjust core project levers/i)
    ).toBeInTheDocument();
  });

  it("FeaturePopupModal dismisses on close button click and escape key", () => {
    let closed = false;
    const { rerender } = render(
      <FeaturePopupModal
        activeHotspot="monte-carlo"
        onClose={() => {
          closed = true;
        }}
      />
    );

    expect(
      screen.getByText("Monte Carlo Uncertainty Analysis")
    ).toBeInTheDocument();
    expect(screen.getByText("Stochastic Modeling")).toBeInTheDocument();

    // Click close button
    const closeBtn = screen.getByLabelText("Close modal");
    fireEvent.click(closeBtn);
    expect(closed).toBe(true);

    // Test Escape key
    closed = false;
    rerender(
      <FeaturePopupModal
        activeHotspot="monte-carlo"
        onClose={() => {
          closed = true;
        }}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closed).toBe(true);
  });

  it("DataVisualizationsSection renders risk scoring, portfolio mix, Monte Carlo spread, and trade-off frontier", () => {
    render(<DataVisualizationsSection />);

    expect(screen.getByText("Multi-Axis Risk Scoring")).toBeInTheDocument();
    expect(screen.getByText("Scenario Portfolio Mix")).toBeInTheDocument();
    expect(screen.getByText("Monte Carlo Spread")).toBeInTheDocument();
    expect(screen.getByText("Delivery Trade-off Frontier")).toBeInTheDocument();
    expect(screen.getByText("Structure and color that")).toBeInTheDocument();

    // Card 1: Horizontal risk bars
    expect(screen.getByText("Staffing Risk")).toBeInTheDocument();
    expect(screen.getByText("Schedule Risk")).toBeInTheDocument();
    expect(screen.getByText("Budget Risk")).toBeInTheDocument();
    expect(screen.getByText("76%")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
    expect(screen.getByText("22%")).toBeInTheDocument();

    // Card 2: Donut chart & legend
    expect(screen.getByLabelText("Scenario portfolio mix donut chart")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("Feasible Scenarios")).toBeInTheDocument();
    expect(screen.getByText("High Risk Scenarios")).toBeInTheDocument();
    expect(screen.getByText("Critical Scenarios")).toBeInTheDocument();

    // Card 3: Monte Carlo spread curve & on-time probability badge
    expect(screen.getByLabelText("Monte Carlo bell curve distribution")).toBeInTheDocument();
    expect(screen.getByText("Probability On-Time")).toBeInTheDocument();
    expect(screen.getByText("Target 17.5w")).toBeInTheDocument();

    // Card 4: Trade-off frontier curve & optimum feasibility dot
    expect(screen.getByLabelText("Simulation frontier curve diagram")).toBeInTheDocument();
    expect(screen.getByText("Optimum Feasibility (78%)")).toBeInTheDocument();
  });

  it("FinalCtaSection renders closing headline and Go to Kairos hard navigation button without top border divider", () => {
    const { container } = render(<FinalCtaSection />);

    expect(screen.getByText(/Start tracing your own/i)).toBeInTheDocument();
    expect(screen.getByText(/decisions\./i)).toBeInTheDocument();

    const finalBtn = screen.getByTestId("final-cta-btn");
    expect(finalBtn).toHaveAttribute("href", "/projects");

    // Container should NOT have border-t cutting off the section
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section?.className).not.toContain("border-t");
    expect(section?.className).not.toContain("border-b");
  });

  it("Landing sections do not contain scroll-snap classes", () => {
    const { container: heroContainer } = render(<HeroSection />);
    const { container: dataContainer } = render(<DataVisualizationsSection />);
    const { container: featureContainer } = render(<FeatureShowcaseSection />);
    const { container: ctaContainer } = render(<FinalCtaSection />);

    for (const c of [heroContainer, dataContainer, featureContainer, ctaContainer]) {
      const el = c.querySelector("section");
      expect(el?.className).not.toContain("snap-start");
      expect(el?.className).not.toContain("snap-y");
      expect(el?.className).not.toContain("snap-mandatory");
      expect(el?.className).not.toContain("border-b");
    }
  });
});
