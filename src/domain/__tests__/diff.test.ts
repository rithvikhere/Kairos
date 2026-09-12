import { beforeEach, describe, expect, it } from "vitest";
import {
  diffScenarios,
  diffScenariosById,
  fieldwiseDelta,
  resolveRepresentativeNumber,
} from "../diff.js";
import type { FieldDelta, ScenarioDiff } from "../diff.js";
import { simulate } from "../simulation.js";
import { runMonteCarloSimulation } from "../monteCarlo.js";
import type { MonteCarloResult } from "../monteCarlo.js";
import type { ScenarioRecord } from "../../data/schema.js";
import {
  _resetInMemoryDb,
  createProject,
  getScenario,
  saveScenario,
} from "../../data/db.js";

/**
 * Helper to build a valid ScenarioRecord with sensible defaults.
 */
function makeScenarioRecord(overrides?: Partial<ScenarioRecord>): ScenarioRecord {
  const inputs = overrides?.inputs ?? {
    budget: 2_000_000,
    headcount: 8,
    deadlineWeeks: 70,
    scope: 480,
  };

  const deterministic_output =
    overrides?.deterministic_output ??
    simulate({
      budget: resolveRepresentativeNumber(inputs.budget),
      headcount: resolveRepresentativeNumber(inputs.headcount),
      deadlineWeeks: resolveRepresentativeNumber(inputs.deadlineWeeks),
      scope: resolveRepresentativeNumber(inputs.scope),
    });

  return {
    id: overrides?.id ?? "scen-test-1",
    project_id: overrides?.project_id ?? "proj-test-1",
    parent_scenario_id: overrides?.parent_scenario_id ?? null,
    name: overrides?.name ?? "Base Scenario",
    description: overrides?.description ?? null,
    tags: overrides?.tags ?? [],
    is_favorite: overrides?.is_favorite ?? false,
    is_archived: overrides?.is_archived ?? false,
    inputs,
    deterministic_output,
    monte_carlo_output: overrides?.monte_carlo_output ?? null,
    created_at: overrides?.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: overrides?.updated_at ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("Phase 4 — Diff Engine", () => {
  describe("fieldwiseDelta and resolveRepresentativeNumber helpers", () => {
    it("computes standard delta, percentChange, and direction correctly", () => {
      const increased = fieldwiseDelta(100, 150);
      expect(increased).toEqual({
        from: 100,
        to: 150,
        delta: 50,
        percentChange: 50,
        direction: "increased",
      });

      const decreased = fieldwiseDelta(200, 150);
      expect(decreased).toEqual({
        from: 200,
        to: 150,
        delta: -50,
        percentChange: -25,
        direction: "decreased",
      });

      const unchanged = fieldwiseDelta(50, 50);
      expect(unchanged).toEqual({
        from: 50,
        to: 50,
        delta: 0,
        percentChange: 0,
        direction: "unchanged",
      });
    });

    it("handles percentChange edge case: from = 0 yields null without Infinity or NaN", () => {
      const fromZeroIncreased = fieldwiseDelta(0, 10);
      expect(fromZeroIncreased.delta).toBe(10);
      expect(fromZeroIncreased.percentChange).toBeNull();
      expect(fromZeroIncreased.direction).toBe("increased");

      const fromZeroUnchanged = fieldwiseDelta(0, 0);
      expect(fromZeroUnchanged.delta).toBe(0);
      expect(fromZeroUnchanged.percentChange).toBeNull();
      expect(fromZeroUnchanged.direction).toBe("unchanged");

      const fromZeroDecreased = fieldwiseDelta(0, -5);
      expect(fromZeroDecreased.delta).toBe(-5);
      expect(fromZeroDecreased.percentChange).toBeNull();
      expect(fromZeroDecreased.direction).toBe("decreased");
    });

    it("resolves all distribution kinds (fixed, normal, uniform) and plain numbers", () => {
      expect(resolveRepresentativeNumber(150_000)).toBe(150_000);
      expect(resolveRepresentativeNumber({ kind: "fixed", value: 150_000 })).toBe(150_000);
      expect(resolveRepresentativeNumber({ kind: "normal", mean: 12, stddev: 2 })).toBe(12);
      expect(resolveRepresentativeNumber({ kind: "uniform", min: 10, max: 30 })).toBe(20);
      expect(resolveRepresentativeNumber(undefined)).toBe(480);
    });

    it("confirms a plain number and a fixed distribution produce identical resolved values", () => {
      const plain = resolveRepresentativeNumber(50_000);
      const fixed = resolveRepresentativeNumber({ kind: "fixed", value: 50_000 });
      expect(plain).toBe(fixed);
    });
  });

  describe("diffScenarios pure function", () => {
    it("zero-change diff: diffing a scenario against itself produces all unchanged and empty attribution", () => {
      const mcOutput = runMonteCarloSimulation(
        { budget: 2_000_000, headcount: 8, deadlineWeeks: 70 },
        { iterations: 50, seed: 123 }
      );
      const scenario = makeScenarioRecord({ monte_carlo_output: mcOutput });

      const diff = diffScenarios(scenario, scenario);

      expect(diff.scenarioAId).toBe(scenario.id);
      expect(diff.scenarioBId).toBe(scenario.id);

      // Input diff
      expect(diff.inputDiff.budget.direction).toBe("unchanged");
      expect(diff.inputDiff.headcount.direction).toBe("unchanged");
      expect(diff.inputDiff.deadlineWeeks.direction).toBe("unchanged");
      expect(diff.inputDiff.scope.direction).toBe("unchanged");

      // Output diff
      expect(diff.outputDiff.estimatedTimeWeeks.direction).toBe("unchanged");
      expect(diff.outputDiff.effectiveHeadcount.direction).toBe("unchanged");
      expect(diff.outputDiff.actualCost.direction).toBe("unchanged");
      expect(diff.outputDiff.budgetUtilization.direction).toBe("unchanged");
      expect(diff.outputDiff.scheduleUtilization.direction).toBe("unchanged");
      expect(diff.outputDiff.riskScore.direction).toBe("unchanged");
      expect(diff.outputDiff.riskBreakdown.scheduleRisk.direction).toBe("unchanged");
      expect(diff.outputDiff.riskBreakdown.budgetRisk.direction).toBe("unchanged");
      expect(diff.outputDiff.riskBreakdown.staffingRisk.direction).toBe("unchanged");
      expect(diff.outputDiff.feasible.changed).toBe(false);

      // Monte Carlo diff
      expect(diff.monteCarloDiff).not.toBeNull();
      expect(diff.monteCarloDiff!.probabilityOnTime.direction).toBe("unchanged");
      expect(diff.monteCarloDiff!.probabilityWithinBudget.direction).toBe("unchanged");
      expect(diff.monteCarloDiff!.feasibleRate.direction).toBe("unchanged");

      // Attribution
      expect(diff.attribution).toEqual([]);
    });

    it("single-field change: only headcount differs → attribution has 1 row and isolatedRiskContribution equals riskScore.delta", () => {
      const scenarioA = makeScenarioRecord({
        id: "scen-A",
        inputs: { budget: 2_000_000, headcount: 8, deadlineWeeks: 70, scope: 480 },
      });
      const scenarioB = makeScenarioRecord({
        id: "scen-B",
        inputs: { budget: 2_000_000, headcount: 12, deadlineWeeks: 70, scope: 480 },
      });

      const diff = diffScenarios(scenarioA, scenarioB);

      expect(diff.inputDiff.headcount.direction).toBe("increased");
      expect(diff.inputDiff.budget.direction).toBe("unchanged");
      expect(diff.inputDiff.deadlineWeeks.direction).toBe("unchanged");
      expect(diff.inputDiff.scope.direction).toBe("unchanged");

      expect(diff.attribution).toHaveLength(1);
      const attr = diff.attribution[0]!;
      expect(attr.field).toBe("headcount");
      expect(attr.isolatedRiskScore).toBe(scenarioB.deterministic_output.riskScore);
      expect(attr.isolatedRiskContribution).toBe(diff.outputDiff.riskScore.delta);
    });

    it("multi-field change: attribution sorted by |isolatedRiskContribution| desc and demonstrates non-additivity", () => {
      const scenarioA = makeScenarioRecord({
        id: "scen-A",
        inputs: { budget: 2_000_000, headcount: 8, deadlineWeeks: 70, scope: 480 },
      });
      const scenarioB = makeScenarioRecord({
        id: "scen-B",
        inputs: { budget: 1_000_000, headcount: 14, deadlineWeeks: 40, scope: 480 },
      });

      const diff = diffScenarios(scenarioA, scenarioB);

      // Multiple fields changed
      expect(diff.attribution.length).toBe(3);

      // Verify descending order of absolute contribution
      for (let i = 0; i < diff.attribution.length - 1; i++) {
        const curr = Math.abs(diff.attribution[i]!.isolatedRiskContribution);
        const next = Math.abs(diff.attribution[i + 1]!.isolatedRiskContribution);
        expect(curr).toBeGreaterThanOrEqual(next);
      }

      // Explicitly assert the documented non-additivity: sum of individual isolated contributions does NOT equal total delta
      const sumContributions = diff.attribution.reduce(
        (sum, a) => sum + a.isolatedRiskContribution,
        0
      );
      expect(sumContributions).not.toBe(diff.outputDiff.riskScore.delta);
    });

    it("feasibility flip: detects transitions in both directions and sets feasible.changed = true", () => {
      const feasibleScenario = makeScenarioRecord({
        id: "scen-feasible",
        inputs: { budget: 3_000_000, headcount: 10, deadlineWeeks: 80, scope: 480 },
      });
      const infeasibleScenario = makeScenarioRecord({
        id: "scen-infeasible",
        inputs: { budget: 10_000, headcount: 1, deadlineWeeks: 2, scope: 480 },
      });

      expect(feasibleScenario.deterministic_output.feasible).toBe(true);
      expect(infeasibleScenario.deterministic_output.feasible).toBe(false);

      // Flip: true -> false
      const toInfeasible = diffScenarios(feasibleScenario, infeasibleScenario);
      expect(toInfeasible.outputDiff.feasible).toEqual({
        from: true,
        to: false,
        changed: true,
      });

      // Flip: false -> true
      const toFeasible = diffScenarios(infeasibleScenario, feasibleScenario);
      expect(toFeasible.outputDiff.feasible).toEqual({
        from: false,
        to: true,
        changed: true,
      });

      // No flip: true -> true
      const noFlip = diffScenarios(feasibleScenario, feasibleScenario);
      expect(noFlip.outputDiff.feasible.changed).toBe(false);
    });

    it("distribution resolution in diffScenarios: compares mixed distribution kinds via representative numbers", () => {
      const scenarioA = makeScenarioRecord({
        id: "dist-A",
        inputs: {
          budget: 100_000,
          headcount: { kind: "fixed", value: 8 },
          deadlineWeeks: { kind: "normal", mean: 20, stddev: 2 },
          scope: { kind: "uniform", min: 400, max: 600 },
        },
      });

      const scenarioB = makeScenarioRecord({
        id: "dist-B",
        inputs: {
          budget: { kind: "fixed", value: 100_000 },
          headcount: 8,
          deadlineWeeks: 20,
          scope: 500,
        },
      });

      const diff = diffScenarios(scenarioA, scenarioB);

      expect(diff.inputDiff.budget.delta).toBe(0);
      expect(diff.inputDiff.budget.direction).toBe("unchanged");

      expect(diff.inputDiff.headcount.delta).toBe(0);
      expect(diff.inputDiff.headcount.direction).toBe("unchanged");

      expect(diff.inputDiff.deadlineWeeks.delta).toBe(0);
      expect(diff.inputDiff.deadlineWeeks.direction).toBe("unchanged");

      expect(diff.inputDiff.scope.delta).toBe(0);
      expect(diff.inputDiff.scope.direction).toBe("unchanged");

      expect(diff.attribution).toEqual([]);
    });

    it("missing Monte Carlo data: monteCarloDiff is strictly null if either scenario lacks it", () => {
      const mcOutput = runMonteCarloSimulation(
        { budget: 2_000_000, headcount: 8, deadlineWeeks: 70 },
        { iterations: 50, seed: 42 }
      );

      const withMc = makeScenarioRecord({ id: "with-mc", monte_carlo_output: mcOutput });
      const withoutMc = makeScenarioRecord({ id: "without-mc", monte_carlo_output: null });

      // A has MC, B does not
      const diff1 = diffScenarios(withMc, withoutMc);
      expect(diff1.monteCarloDiff).toBeNull();

      // A does not, B has MC
      const diff2 = diffScenarios(withoutMc, withMc);
      expect(diff2.monteCarloDiff).toBeNull();

      // Neither has MC
      const diff3 = diffScenarios(withoutMc, withoutMc);
      expect(diff3.monteCarloDiff).toBeNull();
    });

    it("both have Monte Carlo data: computes valid deltas on all three probabilistic fields", () => {
      const mcA: MonteCarloResult = {
        iterationsRequested: 100,
        iterationsActuallyUsed: 100,
        iterationsUsed: 100,
        skippedIterations: 0,
        feasibleRate: 0.8,
        feasibilityRate: 0.8,
        probabilityOnTime: 0.7,
        probabilityWithinBudget: 0.9,
        estimatedTimeWeeks: {} as any,
        effectiveHeadcount: {} as any,
        actualCost: {} as any,
        budgetUtilization: {} as any,
        scheduleUtilization: {} as any,
        riskScore: {} as any,
      };

      const mcB: MonteCarloResult = {
        iterationsRequested: 100,
        iterationsActuallyUsed: 100,
        iterationsUsed: 100,
        skippedIterations: 0,
        feasibleRate: 0.5,
        feasibilityRate: 0.5,
        probabilityOnTime: 0.4,
        probabilityWithinBudget: 0.6,
        estimatedTimeWeeks: {} as any,
        effectiveHeadcount: {} as any,
        actualCost: {} as any,
        budgetUtilization: {} as any,
        scheduleUtilization: {} as any,
        riskScore: {} as any,
      };

      const scenarioA = makeScenarioRecord({ id: "mc-A", monte_carlo_output: mcA });
      const scenarioB = makeScenarioRecord({ id: "mc-B", monte_carlo_output: mcB });

      const diff = diffScenarios(scenarioA, scenarioB);

      expect(diff.monteCarloDiff).not.toBeNull();
      const mcDiff = diff.monteCarloDiff!;

      expect(mcDiff.feasibleRate).toEqual({
        from: 0.8,
        to: 0.5,
        delta: expect.closeTo(-0.3, 5),
        percentChange: expect.closeTo(-37.5, 5),
        direction: "decreased",
      });

      expect(mcDiff.probabilityOnTime).toEqual({
        from: 0.7,
        to: 0.4,
        delta: expect.closeTo(-0.3, 5),
        percentChange: expect.closeTo(-42.857, 2),
        direction: "decreased",
      });

      expect(mcDiff.probabilityWithinBudget).toEqual({
        from: 0.9,
        to: 0.6,
        delta: expect.closeTo(-0.3, 5),
        percentChange: expect.closeTo(-33.333, 2),
        direction: "decreased",
      });
    });
  });

  describe("Integration & diffScenariosById", () => {
    beforeEach(() => {
      _resetInMemoryDb();
    });

    it("persists two scenarios via Phase 3 saveScenario, fetches them, and diffs them end-to-end", async () => {
      const project = await createProject({ name: "Diff Test Project" });

      const scenarioA = await saveScenario({
        projectId: project.id,
        name: "Baseline Plan",
        inputs: { budget: 2_000_000, headcount: 8, deadlineWeeks: 70, scope: 480 },
      });

      const scenarioB = await saveScenario({
        projectId: project.id,
        parentScenarioId: scenarioA.id,
        name: "Aggressive Crunch Plan",
        inputs: { budget: 2_500_000, headcount: 12, deadlineWeeks: 50, scope: 480 },
      });

      const fetchedA = await getScenario(scenarioA.id);
      const fetchedB = await getScenario(scenarioB.id);
      expect(fetchedA).not.toBeNull();
      expect(fetchedB).not.toBeNull();

      const diff = diffScenarios(fetchedA!, fetchedB!);

      expect(diff.scenarioAId).toBe(scenarioA.id);
      expect(diff.scenarioBId).toBe(scenarioB.id);

      expect(diff.inputDiff.budget.direction).toBe("increased");
      expect(diff.inputDiff.headcount.direction).toBe("increased");
      expect(diff.inputDiff.deadlineWeeks.direction).toBe("decreased");
      expect(diff.inputDiff.scope.direction).toBe("unchanged");

      expect(diff.attribution.length).toBe(3);
      expect(diff.attribution.map((a) => a.field)).toEqual(
        expect.arrayContaining(["budget", "headcount", "deadlineWeeks"])
      );
    });

    it("diffScenariosById returns identical result to diffScenarios for equivalent records", async () => {
      const project = await createProject({ name: "Project Pair" });

      const s1 = await saveScenario({
        projectId: project.id,
        name: "Scenario 1",
        inputs: { budget: 2_000_000, headcount: 6, deadlineWeeks: 70 },
      });
      const s2 = await saveScenario({
        projectId: project.id,
        name: "Scenario 2",
        inputs: { budget: 2_200_000, headcount: 9, deadlineWeeks: 60 },
      });

      const directDiff = diffScenarios(s1, s2);
      const byIdDiff = await diffScenariosById(s1.id, s2.id);

      expect(byIdDiff).toEqual(directDiff);
    });

    it("diffScenariosById throws clearly when either id doesn't resolve", async () => {
      const project = await createProject({ name: "Project Single" });
      const valid = await saveScenario({
        projectId: project.id,
        name: "Valid Scenario",
        inputs: { budget: 1_000_000, headcount: 5, deadlineWeeks: 50 },
      });

      await expect(diffScenariosById("missing-id-1", valid.id)).rejects.toThrow(
        "Scenario 'missing-id-1' not found."
      );

      await expect(diffScenariosById(valid.id, "missing-id-2")).rejects.toThrow(
        "Scenario 'missing-id-2' not found."
      );
    });
  });
});
