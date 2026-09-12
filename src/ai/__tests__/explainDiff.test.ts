import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  explainScenarioDiff,
  buildTemplateFallbackExplanation,
} from "../explainDiff.js";
import * as clientModule from "../client.js";
import { AiUnavailableError } from "../errors.js";
import type { ScenarioDiff } from "../../domain/diff.js";

describe("explainScenarioDiff", () => {
  const sampleDiff: ScenarioDiff = {
    scenarioAId: "scen-a",
    scenarioBId: "scen-b",
    inputDiff: {
      budget: { from: 100_000, to: 80_000, delta: -20_000, percentChange: -20, direction: "decreased" },
      headcount: { from: 8, to: 10, delta: 2, percentChange: 25, direction: "increased" },
      deadlineWeeks: { from: 16, to: 20, delta: 4, percentChange: 25, direction: "increased" },
      scope: { from: 480, to: 480, delta: 0, percentChange: 0, direction: "unchanged" },
    },
    outputDiff: {
      estimatedTimeWeeks: { from: 16, to: 15, delta: -1, percentChange: -6.25, direction: "decreased" },
      effectiveHeadcount: { from: 8, to: 9.7, delta: 1.7, percentChange: 21.25, direction: "increased" },
      actualCost: { from: 100_000, to: 95_000, delta: -5_000, percentChange: -5, direction: "decreased" },
      budgetUtilization: { from: 1, to: 1.1875, delta: 0.1875, percentChange: 18.75, direction: "increased" },
      scheduleUtilization: { from: 1, to: 0.75, delta: -0.25, percentChange: -25, direction: "decreased" },
      riskScore: { from: 45, to: 32, delta: -13, percentChange: -28.89, direction: "decreased" },
      riskBreakdown: {
        scheduleRisk: { from: 20, to: 10, delta: -10, percentChange: -50, direction: "decreased" },
        budgetRisk: { from: 15, to: 18, delta: 3, percentChange: 20, direction: "increased" },
        staffingRisk: { from: 10, to: 4, delta: -6, percentChange: -60, direction: "decreased" },
      },
      feasible: { from: true, to: true, changed: false },
    },
    monteCarloDiff: null,
    attribution: [
      { field: "budget", isolatedRiskScore: 58, isolatedRiskContribution: 13 },
      { field: "deadlineWeeks", isolatedRiskScore: 35, isolatedRiskContribution: -10 },
      { field: "headcount", isolatedRiskScore: 40, isolatedRiskContribution: -5 },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("AI success path", () => {
    it("returns source 'ai' and passes prompt referencing every changed field in attribution order", async () => {
      vi.spyOn(clientModule, "isAiConfigured").mockReturnValue(true);

      let capturedParams: clientModule.AiCallParams | null = null;
      vi.spyOn(clientModule, "_aiConnectorComplete").mockImplementation(async (params) => {
        capturedParams = params;
        return "Scenario risk decreased from 45 to 32. Budget cut drove +13 isolated risk, deadline drove -10, and headcount drove -5.";
      });

      const result = await explainScenarioDiff(sampleDiff);

      expect(result.source).toBe("ai");
      expect(result.explanation).toContain("Scenario risk decreased from 45 to 32");

      // Verify prompt construction referenced every changed field, not just the top one
      expect(capturedParams).not.toBeNull();
      const userPrompt = capturedParams!.userPrompt;
      expect(userPrompt).toContain("budget");
      expect(userPrompt).toContain("deadlineWeeks");
      expect(userPrompt).toContain("headcount");

      // Verify system prompt contains verbatim disclaimer
      const systemPrompt = capturedParams!.systemPrompt;
      expect(systemPrompt).toContain(
        "These per-field contributions do NOT sum to the total risk change — do not claim they do, and do not imply the risk change can be fully decomposed into independent causes"
      );
    });
  });

  describe("fallback path", () => {
    it("falls back to template when AI connector throws an error", async () => {
      vi.spyOn(clientModule, "isAiConfigured").mockReturnValue(true);
      vi.spyOn(clientModule, "_aiConnectorComplete").mockRejectedValue(
        new AiUnavailableError("All AI providers unavailable")
      );

      const result = await explainScenarioDiff(sampleDiff);

      expect(result.source).toBe("template-fallback");
      expect(result.explanation).toContain("Risk moved from 45 to 32 (decreased)");
      expect(result.explanation).toContain("Feasibility did not change");
      // Every changed field appears in the templated string
      expect(result.explanation).toContain("budget: 100000 → 80000 (13 points of risk impact)");
      expect(result.explanation).toContain("deadlineWeeks: 16 → 20 (-10 points of risk impact)");
      expect(result.explanation).toContain("headcount: 8 → 10 (-5 points of risk impact)");
    });

    it("falls back to template when isAiConfigured returns false", async () => {
      vi.spyOn(clientModule, "isAiConfigured").mockReturnValue(false);
      const completeSpy = vi.spyOn(clientModule, "_aiConnectorComplete");

      const result = await explainScenarioDiff(sampleDiff);

      expect(result.source).toBe("template-fallback");
      expect(completeSpy).not.toHaveBeenCalled();
      expect(result.explanation).toContain("Risk moved from 45 to 32");
    });

    it("produces byte-identical deterministic output when called twice with the same diff", async () => {
      vi.spyOn(clientModule, "isAiConfigured").mockReturnValue(false);

      const run1 = await explainScenarioDiff(sampleDiff);
      const run2 = await explainScenarioDiff(sampleDiff);

      expect(run1.explanation).toBe(run2.explanation);
      expect(Buffer.from(run1.explanation)).toEqual(Buffer.from(run2.explanation));
    });

    it("buildTemplateFallbackExplanation pure function generates expected structure directly", () => {
      const text = buildTemplateFallbackExplanation(sampleDiff);
      const lines = text.split("\n");

      expect(lines[0]).toBe(
        "Risk moved from 45 to 32 (decreased). Feasibility did not change. Contributing changes, largest impact first:"
      );
      expect(lines[1]).toBe("- budget: 100000 → 80000 (13 points of risk impact)");
      expect(lines[2]).toBe("- deadlineWeeks: 16 → 20 (-10 points of risk impact)");
      expect(lines[3]).toBe("- headcount: 8 → 10 (-5 points of risk impact)");
    });
  });
});
