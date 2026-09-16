import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { MonteCarloConvergenceChart } from "../MonteCarloConvergenceChart.js";

afterEach(() => {
  cleanup();
});

describe("MonteCarloConvergenceChart", () => {
  const dummyConvergence = [
    { iteration: 50, runningMean: 350000 },
    { iteration: 100, runningMean: 352000 },
    { iteration: 150, runningMean: 351500 },
    { iteration: 200, runningMean: 352136 },
  ];

  it("renders heading and final converged mean", () => {
    render(<MonteCarloConvergenceChart convergence={dummyConvergence} />);

    expect(screen.getByText("Monte Carlo Convergence Tracker")).toBeInTheDocument();
    expect(screen.getByText("Final Converged Mean")).toBeInTheDocument();
    expect(screen.getByText("$352,136")).toBeInTheDocument();
  });

  it("displays interactive tooltip on point hover", () => {
    const { container } = render(
      <MonteCarloConvergenceChart convergence={dummyConvergence} />
    );

    // Initial state: no checkpoint header
    expect(screen.queryByText(/Checkpoint: 100 Trials/i)).not.toBeInTheDocument();

    // Find interactive dot groups (they have class 'cursor-pointer')
    const dotGroups = container.querySelectorAll("g.cursor-pointer");
    expect(dotGroups.length).toBe(4);

    // Hover over the second point (iteration 100, runningMean 352000)
    fireEvent.mouseEnter(dotGroups[1]!);

    // Checkpoint KPI header and tooltip update
    expect(screen.getByText(/Checkpoint: 100 Trials/i)).toBeInTheDocument();
    expect(screen.getAllByText("$352,000").length).toBe(2);

    // Floating tooltip badge rendered
    expect(screen.getByText("100 trials")).toBeInTheDocument();

    // Mouse leave svg removes hovered tooltip
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    fireEvent.mouseLeave(svg!);

    expect(screen.queryByText(/Checkpoint: 100 Trials/i)).not.toBeInTheDocument();
    expect(screen.getByText("Final Converged Mean")).toBeInTheDocument();
  });
});
