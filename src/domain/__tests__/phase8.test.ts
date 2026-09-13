import { describe, it, expect } from "vitest";
import { simulate, InvalidScenarioError, RISK_DIMENSION_WEIGHTS } from "../simulation.js";
import { runMonteCarloSimulation } from "../monteCarlo.js";
import { ScenarioInputsSchema, UncertainScenarioInputsSchema } from "../../lib/api/schemas.js";
import type { ScenarioInputs } from "../types.js";

describe("Phase 8 Domain - Uniform 15-Constraint Requirements", () => {
  it("throws InvalidScenarioError when zero constraints are enabled", () => {
    expect(() => simulate({ constraints: {} })).toThrow(InvalidScenarioError);
    expect(() =>
      simulate({
        constraints: {
          budget: { enabled: false, value: 100_000 },
          headcount: { enabled: false, value: 5 },
        },
      })
    ).toThrow(InvalidScenarioError);
  });

  it("computes only declared outputs when exactly one constraint is enabled", () => {
    const res = simulate({
      constraints: {
        headcount: { enabled: true, value: 8 },
      },
    });

    // Declared outputs for headcount alone: effectiveHeadcount and staffingRisk
    expect(res.computed.effectiveHeadcount).toBe(8);
    expect(res.computed.staffingRisk).toBe(0);

    // Outputs requiring scope or other constraints must NOT be in computed
    expect(res.computed.estimatedTimeWeeks).toBeUndefined();
    expect(res.computed.actualCost).toBeUndefined();
    expect(res.computed.budgetUtilization).toBeUndefined();
    expect(res.computed.scheduleRisk).toBeUndefined();

    // Must be reported in notComputed with reason strings
    expect(res.notComputed.some((nc) => nc.startsWith("estimatedTimeWeeks: requires: scope"))).toBe(true);
    expect(res.notComputed.some((nc) => nc.startsWith("actualCost: requires: scope"))).toBe(true);
  });

  it("disabling deadlineWeeks specifically removes scheduleRisk and scheduleUtilization from computed", () => {
    const withDeadline: ScenarioInputs = {
      constraints: {
        headcount: { enabled: true, value: 8 },
        scope: { enabled: true, value: 480 },
        budget: { enabled: true, value: 200_000 },
        deadlineWeeks: { enabled: true, value: 20 },
      },
    };

    const resWith = simulate(withDeadline);
    expect(resWith.computed.scheduleRisk).toBeDefined();
    expect(resWith.computed.scheduleUtilization).toBeDefined();

    const withoutDeadline: ScenarioInputs = {
      constraints: {
        ...withDeadline.constraints,
        deadlineWeeks: { enabled: false, value: 20 },
      },
    };

    const resWithout = simulate(withoutDeadline);
    expect(resWithout.computed.scheduleRisk).toBeUndefined();
    expect(resWithout.computed.scheduleUtilization).toBeUndefined();
    expect(resWithout.notComputed.some((nc) => nc.includes("scheduleRisk"))).toBe(true);
  });

  it("proves risk-blend renormalization differs from naively zeroing an inactive dimension", () => {
    // Scenario with regulatoryComplexity (0-10) and externalDependencyCount
    // regulatoryComplexity = 10 -> regulatoryComplexityRisk = 100 (base weight = 0.1)
    // externalDependencyCount = 5 -> dependencyRisk = 100 * (1 - e^-1) ~= 63.212 (base weight = 0.1)
    const inputs: ScenarioInputs = {
      constraints: {
        regulatoryComplexity: { enabled: true, value: 10 },
        externalDependencyCount: { enabled: true, value: 5 },
      },
    };

    const result = simulate(inputs);
    const regRisk = result.computed.regulatoryComplexityRisk!;
    const depRisk = result.computed.dependencyRisk!;

    // Active dimensions: regulatoryComplexityRisk (w=0.1), dependencyRisk (w=0.1)
    // Total active weight = 0.2. Renormalized weights: 0.1/0.2 = 0.5, 0.1/0.2 = 0.5
    const expectedRenormalized = 0.5 * regRisk + 0.5 * depRisk;
    expect(result.riskScore).toBeCloseTo(expectedRenormalized, 5);

    // Naively zeroing all inactive dimensions without renormalization:
    // sum(w_i * score_i) = 0.1 * regRisk + 0.1 * depRisk
    const naiveZeroed = 0.1 * regRisk + 0.1 * depRisk;
    expect(result.riskScore).not.toBeCloseTo(naiveZeroed, 2);
    expect(result.riskScore).toBeGreaterThan(naiveZeroed);
  });

  it("records convergence checkpoints where final runningMean exactly equals overall computed mean", () => {
    const inputs = {
      constraints: {
        headcount: { enabled: true, value: 8 },
        budget: { enabled: true, value: 200_000 },
        deadlineWeeks: { enabled: true, value: 20 },
        scope: { enabled: true, value: 480 },
      },
    };

    const mc = runMonteCarloSimulation(inputs, {
      iterations: 600,
      seed: 42,
      recordCheckpoints: { every: 150 },
    });

    expect(mc.convergence).toBeDefined();
    expect(mc.convergence!.length).toBeGreaterThanOrEqual(4);

    const finalCheckpoint = mc.convergence![mc.convergence!.length - 1]!;
    expect(finalCheckpoint.iteration).toBe(mc.iterationsActuallyUsed);
    expect(finalCheckpoint.runningMean).toBe(mc.actualCost.mean);
  });

  it("retains representative trial samples for scatter plot visualization", () => {
    const inputs = {
      constraints: {
        headcount: { enabled: true, value: 8 },
        budget: { enabled: true, value: 200_000 },
        deadlineWeeks: { enabled: true, value: 20 },
        scope: { enabled: true, value: 480 },
      },
    };

    const mc = runMonteCarloSimulation(inputs, {
      iterations: 500,
      seed: 123,
      sampleTrials: { count: 100 },
    });

    expect(mc.trialSample).toBeDefined();
    expect(mc.trialSample!.length).toBe(100);

    const firstTrial = mc.trialSample![0]!;
    expect(typeof firstTrial.actualCost).toBe("number");
    expect(firstTrial.actualCost).toBeGreaterThan(0);
    expect(typeof firstTrial.estimatedTimeWeeks).toBe("number");
    expect(firstTrial.estimatedTimeWeeks).toBeGreaterThan(0);
    expect(typeof firstTrial.feasible).toBe("boolean");
  });

  it("confirms 5,000 Monte Carlo iterations completes under 1 second with checkpoints and sampling enabled", () => {
    const inputs = {
      constraints: {
        headcount: { enabled: true, value: 8 },
        budget: { enabled: true, value: 200_000 },
        deadlineWeeks: { enabled: true, value: 20 },
        scope: { enabled: true, value: 480 },
        regulatoryComplexity: { enabled: true, value: 5 },
        externalDependencyCount: { enabled: true, value: 3 },
      },
    };

    const t0 = performance.now();
    const mc = runMonteCarloSimulation(inputs, {
      iterations: 5000,
      seed: 42,
      recordCheckpoints: { every: 500 },
      sampleTrials: { count: 500 },
    });
    const elapsedMs = performance.now() - t0;

    expect(mc.iterationsActuallyUsed).toBe(5000);
    expect(elapsedMs).toBeLessThan(1000);
  });

  it("enforces at least one enabled constraint at the Zod schema API boundary", () => {
    // 0 enabled constraints -> invalid
    const emptyResult = ScenarioInputsSchema.safeParse({
      constraints: {},
    });
    expect(emptyResult.success).toBe(false);

    const allDisabledResult = ScenarioInputsSchema.safeParse({
      constraints: {
        headcount: { enabled: false, value: 10 },
        budget: { enabled: false, value: 100_000 },
      },
    });
    expect(allDisabledResult.success).toBe(false);

    // 1 enabled constraint -> valid
    const validResult = ScenarioInputsSchema.safeParse({
      constraints: {
        headcount: { enabled: true, value: 10 },
      },
    });
    expect(validResult.success).toBe(true);
  });
});
