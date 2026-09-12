// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ScenarioDiffTable } from "../ScenarioDiffTable.js";
import type { ScenarioDiff } from "../../../domain/diff.js";

describe("ScenarioDiffTable", () => {
  beforeEach(() => {
    cleanup();
  });
  const sampleDiff: ScenarioDiff = {
    scenarioAId: "scen-a",
    scenarioBId: "scen-b",
    inputDiff: {
      budget: {
        from: 100_000,
        to: 150_000,
        delta: 50_000,
        percentChange: 50,
        direction: "increased",
      },
      headcount: {
        from: 8,
        to: 12,
        delta: 4,
        percentChange: 50,
        direction: "increased",
      },
      deadlineWeeks: {
        from: 20,
        to: 16,
        delta: -4,
        percentChange: -20,
        direction: "decreased",
      },
      scope: {
        from: 480,
        to: 540,
        delta: 60,
        percentChange: 12.5,
        direction: "increased",
      },
    },
    outputDiff: {
      estimatedTimeWeeks: {
        from: 20,
        to: 15,
        delta: -5,
        percentChange: -25,
        direction: "decreased",
      },
      effectiveHeadcount: {
        from: 8,
        to: 11.5,
        delta: 3.5,
        percentChange: 43.75,
        direction: "increased",
      },
      actualCost: {
        from: 100_000,
        to: 120_000,
        delta: 20_000,
        percentChange: 20,
        direction: "increased",
      },
      budgetUtilization: {
        from: 1.0,
        to: 0.8,
        delta: -0.2,
        percentChange: -20,
        direction: "decreased",
      },
      scheduleUtilization: {
        from: 1.0,
        to: 0.94,
        delta: -0.06,
        percentChange: -6,
        direction: "decreased",
      },
      riskScore: {
        from: 65,
        to: 35,
        delta: -30,
        percentChange: -46.15,
        direction: "decreased",
      },
      riskBreakdown: {
        scheduleRisk: { from: 30, to: 10, delta: -20, percentChange: -66.6, direction: "decreased" },
        budgetRisk: { from: 25, to: 15, delta: -10, percentChange: -40, direction: "decreased" },
        staffingRisk: { from: 10, to: 10, delta: 0, percentChange: 0, direction: "unchanged" },
      },
      feasible: { from: false, to: true, changed: true },
    },
    monteCarloDiff: null,
    attribution: [
      { field: "budget", isolatedRiskScore: 40, isolatedRiskContribution: -25 },
      { field: "deadlineWeeks", isolatedRiskScore: 50, isolatedRiskContribution: -15 },
    ],
  };

  it("renders every changed input field and output metric from ScenarioDiff fixture", () => {
    render(<ScenarioDiffTable diff={sampleDiff} />);

    // Inputs
    expect(screen.getByText("Budget Available")).toBeInTheDocument();
    expect(screen.getAllByText("$100,000")).toHaveLength(2); // In both Budget Available and Actual Cost
    expect(screen.getByText("$150,000")).toBeInTheDocument();

    expect(screen.getByText("Team Headcount")).toBeInTheDocument();
    expect(screen.getByText("8 people")).toBeInTheDocument();
    expect(screen.getByText("12 people")).toBeInTheDocument();

    expect(screen.getByText("Target Deadline")).toBeInTheDocument();
    expect(screen.getByText("20 weeks")).toBeInTheDocument();
    expect(screen.getByText("16 weeks")).toBeInTheDocument();

    expect(screen.getByText("Total Scope")).toBeInTheDocument();
    expect(screen.getByText("480 person-wks")).toBeInTheDocument();
    expect(screen.getByText("540 person-wks")).toBeInTheDocument();

    // Outputs
    expect(screen.getByText("Risk Score (0-100)")).toBeInTheDocument();
    expect(screen.getByText("65")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();

    expect(screen.getByText("Estimated Duration")).toBeInTheDocument();
    expect(screen.getByText("20 wks")).toBeInTheDocument();
    expect(screen.getByText("15 wks")).toBeInTheDocument();

    expect(screen.getByText("Actual Cost")).toBeInTheDocument();
    expect(screen.getByText("$120,000")).toBeInTheDocument();

    // Feasibility transition
    expect(screen.getByText("Transitioned")).toBeInTheDocument();
  });
});
