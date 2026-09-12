import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DiffExplanationPanel } from "../DiffExplanationPanel.js";

describe("DiffExplanationPanel", () => {
  beforeEach(() => {
    cleanup();
  });
  it("visibly and distinctly renders AI-generated explanation with AI source badge", () => {
    render(
      <DiffExplanationPanel
        explanation={{
          explanation: "Project risk decreased from 50 to 30 following timeline expansion.",
          source: "ai",
        }}
      />
    );

    const aiBadge = screen.getByTestId("source-badge-ai");
    expect(aiBadge).toBeInTheDocument();
    expect(aiBadge).toHaveTextContent("AI-generated");

    expect(screen.queryByTestId("source-badge-template")).not.toBeInTheDocument();
    expect(screen.getByTestId("diff-explanation-content")).toBeInTheDocument();
  });

  it("visibly and distinctly renders template fallback with Computed directly badge", () => {
    render(
      <DiffExplanationPanel
        explanation={{
          explanation:
            "Risk moved from 50 to 30 (decreased). Feasibility did not change. Contributing changes, largest impact first:\n- deadlineWeeks: 20 → 26 (-20 points of risk impact)",
          source: "template-fallback",
        }}
      />
    );

    const templateBadge = screen.getByTestId("source-badge-template");
    expect(templateBadge).toBeInTheDocument();
    expect(templateBadge).toHaveTextContent("Computed directly");

    expect(screen.queryByTestId("source-badge-ai")).not.toBeInTheDocument();
    expect(screen.getByTestId("diff-explanation-content")).toBeInTheDocument();
  });
});
