import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ProofOfWorkSection } from "../ProofOfWorkSection.js";
import { StatDialogCard } from "../StatDialogCard.js";
import LandingPage from "../../../app/page.js";

const mockStatsFixture = {
  testsPassing: 300,
  testFileCount: 27,
  riskFormulaCount: {
    extended: 11,
    core: 3,
    total: 14,
  },
  apiRouteCount: 14,
  componentCount: 41,
  constraintCount: 15,
  phasesShipped: 8,
  generatedAt: "2026-09-18T00:00:00.000Z",
};

let mockReducedMotion = false;
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    useReducedMotion: () => mockReducedMotion,
  };
});

// Mock the generated json fixture
vi.mock("../../../data/projectStats.generated.json", () => ({
  default: {
    testsPassing: 300,
    testFileCount: 27,
    riskFormulaCount: {
      extended: 11,
      core: 3,
      total: 14,
    },
    apiRouteCount: 14,
    componentCount: 41,
    constraintCount: 15,
    phasesShipped: 8,
    generatedAt: "2026-09-18T00:00:00.000Z",
  },
}));

beforeAll(() => {
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
  mockReducedMotion = false;
});

describe("ProofOfWorkSection", () => {
  it("renders all 5 stat values and labels correctly from mocked projectStats fixture", () => {
    // Render with reduced motion so values appear immediately in DOM
    mockReducedMotion = true;

    render(<ProofOfWorkSection stats={mockStatsFixture} />);

    // 1. Tests passing
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("tests passing")).toBeInTheDocument();

    // 2. Risk formulas (total and breakdown) & 3. API routes
    expect(screen.getAllByText("14")).toHaveLength(2);
    expect(screen.getByText("risk formulas")).toBeInTheDocument();
    expect(screen.getByText("(3 core + 11 extended)")).toBeInTheDocument();
    expect(screen.getByText("API routes")).toBeInTheDocument();

    // 4. UI components
    expect(screen.getByText("41")).toBeInTheDocument();
    expect(screen.getByText("UI components")).toBeInTheDocument();

    // 5. Constraints modeled across phases
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(
      screen.getByText("constraints modeled across 8 phases")
    ).toBeInTheDocument();

    // All 5 cards rendered
    const cards = screen.getAllByTestId("stat-dialog-card");
    expect(cards).toHaveLength(5);
  });

  it("confirms the section appears as the second child in page.tsx's render order", () => {
    const { container } = render(<LandingPage />);

    const sections = container.querySelectorAll("section");
    expect(sections.length).toBeGreaterThanOrEqual(5);

    // Section 1: Hero
    expect(sections[0].textContent).toContain("Every decision");

    // Section 2: Proof of Work
    expect(sections[1].getAttribute("id")).toBe("proof-of-work");
    expect(sections[1].textContent).toContain("Proof of Work");
    expect(sections[1].textContent).toContain("tests passing");

    // Section 3: Data Visualizations
    expect(sections[2].textContent).toContain("Multi-Axis Risk Scoring");

    // Section 4: Feature Showcase
    expect(sections[3].getAttribute("id")).toBe("feature-showcase");

    // Section 5: Final CTA
    expect(sections[4].textContent).toContain("Start tracing your own");
  });

  it("confirms reduced-motion mode skips the count-up (render immediately at final value, no intermediate animated frames)", () => {
    // Reduced motion enabled
    mockReducedMotion = true;

    const { getByTestId } = render(
      <StatDialogCard value={777} label="Active tests" delay={0.2} />
    );

    const statValue = getByTestId("stat-value");
    // Immediately has the final value with no count-up delay or intermediate 0 frame
    expect(statValue.textContent).toBe("777");
  });

  it("confirms standard motion mounts the animated count-up primitive starting from 0", () => {
    // Reduced motion disabled
    mockReducedMotion = false;

    const { getByTestId } = render(
      <StatDialogCard value={777} label="Active tests" delay={0.5} />
    );

    const statValue = getByTestId("stat-value");
    // Under standard motion, CountUp initial textContent is 0
    expect(statValue.textContent).toBe("0");
  });
});
