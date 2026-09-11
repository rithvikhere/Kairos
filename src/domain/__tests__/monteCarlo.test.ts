import { describe, expect, it } from "vitest";
import { DEFAULT_SCOPE_PERSON_WEEKS } from "../constants.js";
import { simulate } from "../simulation.js";
import type { Distribution, UncertainScenarioInputs } from "../monteCarlo.js";
import {
  calculatePercentile,
  createHistogram,
  mulberry32,
  normalizeDistribution,
  normalizeUncertainInputs,
  runMonteCarloSimulation,
  sampleDistribution,
  sampleNormal,
  sampleScenarioInputs,
  summarizeDistribution,
} from "../monteCarlo.js";

describe("mulberry32 PRNG", () => {
  it("produces floating-point numbers in [0, 1)", () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("produces identical sequences for the same seed", () => {
    const rngA = mulberry32(42);
    const rngB = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(rngA()).toBe(rngB());
    }
  });

  it("produces divergent sequences for different seeds", () => {
    const rngA = mulberry32(1);
    const rngB = mulberry32(2);
    let differences = 0;
    for (let i = 0; i < 100; i++) {
      if (rngA() !== rngB()) differences++;
    }
    expect(differences).toBeGreaterThan(95);
  });
});

describe("normalization", () => {
  it("wraps a plain number into a fixed distribution", () => {
    const dist = normalizeDistribution(500);
    expect(dist).toEqual({ kind: "fixed", value: 500 });
  });

  it("leaves an existing Distribution untouched", () => {
    const original: Distribution = { kind: "uniform", min: 10, max: 20 };
    expect(normalizeDistribution(original)).toBe(original);
  });

  it("fills in default scope when omitted in UncertainScenarioInputs", () => {
    const normalized = normalizeUncertainInputs({
      budget: 100_000,
      headcount: 8,
      deadlineWeeks: 20,
    });
    expect(normalized.scope).toEqual({
      kind: "fixed",
      value: DEFAULT_SCOPE_PERSON_WEEKS,
    });
  });

  it("preserves custom scope distribution", () => {
    const customScope: Distribution = { kind: "normal", mean: 300, stddev: 20 };
    const normalized = normalizeUncertainInputs({
      budget: 100_000,
      headcount: 8,
      deadlineWeeks: 20,
      scope: customScope,
    });
    expect(normalized.scope).toBe(customScope);
  });
});

describe("sampleDistribution", () => {
  const rng = mulberry32(999);

  it("samples fixed distributions with exact value", () => {
    expect(sampleDistribution({ kind: "fixed", value: 42.5 }, rng)).toBe(42.5);
  });

  it("samples uniform distributions strictly within [min, max]", () => {
    const dist: Distribution = { kind: "uniform", min: 100, max: 200 };
    for (let i = 0; i < 1000; i++) {
      const sample = sampleDistribution(dist, rng);
      expect(sample).toBeGreaterThanOrEqual(100);
      expect(sample).toBeLessThanOrEqual(200);
    }
  });

  it("samples normal distributions centered on the mean", () => {
    const mean = 500;
    const stddev = 30;
    const samples: number[] = [];
    const testRng = mulberry32(101);
    for (let i = 0; i < 5000; i++) {
      samples.push(sampleNormal(mean, stddev, testRng));
    }
    const sampleMean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(sampleMean).toBeCloseTo(mean, 0);
  });
});

describe("sampleScenarioInputs", () => {
  it("samples concrete ScenarioInputs from uncertain specifications", () => {
    const rng = mulberry32(777);
    const inputs: UncertainScenarioInputs = {
      budget: { kind: "uniform", min: 100_000, max: 200_000 },
      headcount: 10,
      deadlineWeeks: { kind: "normal", mean: 20, stddev: 1 },
    };
    const sampled = sampleScenarioInputs(inputs, rng);
    expect(sampled.budget).toBeGreaterThanOrEqual(100_000);
    expect(sampled.budget).toBeLessThanOrEqual(200_000);
    expect(sampled.headcount).toBe(10);
    expect(sampled.deadlineWeeks).toBeGreaterThan(0);
    expect(sampled.scope).toBe(DEFAULT_SCOPE_PERSON_WEEKS);
  });
});

describe("statistical summary helpers", () => {
  it("calculates percentiles using linear interpolation", () => {
    const sorted = [10, 20, 30, 40, 50];
    expect(calculatePercentile(sorted, 0)).toBe(10);
    expect(calculatePercentile(sorted, 0.5)).toBe(30);
    expect(calculatePercentile(sorted, 1.0)).toBe(50);
    expect(calculatePercentile(sorted, 0.25)).toBe(20);
    expect(calculatePercentile(sorted, 0.75)).toBe(40);
  });

  it("creates histogram where bin counts sum to total observations", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const histogram = createHistogram(values, 1, 10, 5);
    expect(histogram).toHaveLength(5);
    const totalCount = histogram.reduce((sum, b) => sum + b.count, 0);
    expect(totalCount).toBe(values.length);
  });

  it("handles invariant data (min === max) with a single bucket", () => {
    const values = [42, 42, 42, 42];
    const histogram = createHistogram(values, 42, 42, 10);
    expect(histogram).toEqual([{ bucketStart: 42, bucketEnd: 42, count: 4 }]);
  });

  it("handles empty arrays gracefully in summarizeDistribution", () => {
    const summary = summarizeDistribution([]);
    expect(summary.mean).toBe(0);
    expect(summary.stddev).toBe(0);
    expect(summary.histogram).toEqual([]);
  });
});

describe("runMonteCarloSimulation — Core Statistical Properties", () => {
  const baselineScenario = {
    budget: 1_200_000,
    headcount: 10,
    deadlineWeeks: 48,
    scope: 480,
  };

  it("all-fixed inputs produce means matching simulate() exactly with 0 stddev", () => {
    const deterministic = simulate(baselineScenario);

    const mcResult = runMonteCarloSimulation(
      {
        budget: { kind: "fixed", value: baselineScenario.budget },
        headcount: { kind: "fixed", value: baselineScenario.headcount },
        deadlineWeeks: { kind: "fixed", value: baselineScenario.deadlineWeeks },
        scope: { kind: "fixed", value: baselineScenario.scope },
      },
      { iterations: 500, seed: 42 }
    );

    expect(mcResult.iterationsRequested).toBe(500);
    expect(mcResult.iterationsActuallyUsed).toBe(500);
    expect(mcResult.iterationsUsed).toBe(500);
    expect(mcResult.skippedIterations).toBe(0);
    expect(mcResult.feasibleRate).toBe(deterministic.feasible ? 1.0 : 0.0);
    expect(mcResult.feasibilityRate).toBe(mcResult.feasibleRate);

    // Exact equality for means vs simulate()
    expect(mcResult.estimatedTimeWeeks.mean).toBe(deterministic.estimatedTimeWeeks);
    expect(mcResult.effectiveHeadcount.mean).toBe(deterministic.effectiveHeadcount);
    expect(mcResult.actualCost.mean).toBe(deterministic.actualCost);
    expect(mcResult.budgetUtilization.mean).toBe(deterministic.budgetUtilization);
    expect(mcResult.scheduleUtilization.mean).toBe(deterministic.scheduleUtilization);
    expect(mcResult.riskScore.mean).toBe(deterministic.riskScore);

    // Zero stddev for all fields
    expect(mcResult.estimatedTimeWeeks.stddev).toBe(0);
    expect(mcResult.effectiveHeadcount.stddev).toBe(0);
    expect(mcResult.actualCost.stddev).toBe(0);
    expect(mcResult.budgetUtilization.stddev).toBe(0);
    expect(mcResult.scheduleUtilization.stddev).toBe(0);
    expect(mcResult.riskScore.stddev).toBe(0);

    // Min, max, median, and percentiles all equal the mean
    expect(mcResult.actualCost.min).toBe(deterministic.actualCost);
    expect(mcResult.actualCost.max).toBe(deterministic.actualCost);
    expect(mcResult.actualCost.median).toBe(deterministic.actualCost);
    expect(mcResult.actualCost.percentiles.p50).toBe(deterministic.actualCost);
  });

  it("supports plain numbers as shorthand for fixed distributions with exact results", () => {
    const deterministic = simulate(baselineScenario);

    const mcResult = runMonteCarloSimulation(
      {
        budget: baselineScenario.budget,
        headcount: baselineScenario.headcount,
        deadlineWeeks: baselineScenario.deadlineWeeks,
        scope: baselineScenario.scope,
      },
      { iterations: 300, seed: 123 }
    );

    expect(mcResult.actualCost.mean).toBe(deterministic.actualCost);
    expect(mcResult.actualCost.stddev).toBe(0);
    expect(mcResult.riskScore.mean).toBe(deterministic.riskScore);
    expect(mcResult.riskScore.stddev).toBe(0);
  });

  it("same seed, same inputs, two separate calls produce byte-identical MonteCarloResult (deep equality)", () => {
    const uncertainInputs: UncertainScenarioInputs = {
      budget: { kind: "normal", mean: 1_200_000, stddev: 100_000 },
      headcount: { kind: "uniform", min: 8, max: 14 },
      deadlineWeeks: { kind: "normal", mean: 48, stddev: 4 },
      scope: { kind: "uniform", min: 400, max: 550 },
    };

    const run1 = runMonteCarloSimulation(uncertainInputs, { iterations: 1000, seed: 8888 });
    const run2 = runMonteCarloSimulation(uncertainInputs, { iterations: 1000, seed: 8888 });

    expect(run1).toEqual(run2);
  });

  it("doubling a normal distribution's stddev on an input strictly increases the resulting output field stddev", () => {
    const seed = 54321;
    const baseInputs: UncertainScenarioInputs = {
      budget: 1_200_000,
      headcount: 10,
      deadlineWeeks: 48,
      scope: { kind: "normal", mean: 480, stddev: 30 },
    };

    const doubledInputs: UncertainScenarioInputs = {
      budget: 1_200_000,
      headcount: 10,
      deadlineWeeks: 48,
      scope: { kind: "normal", mean: 480, stddev: 60 },
    };

    const baseResult = runMonteCarloSimulation(baseInputs, { iterations: 2000, seed });
    const doubledResult = runMonteCarloSimulation(doubledInputs, { iterations: 2000, seed });

    expect(doubledResult.actualCost.stddev).toBeGreaterThan(baseResult.actualCost.stddev);
    expect(doubledResult.estimatedTimeWeeks.stddev).toBeGreaterThan(
      baseResult.estimatedTimeWeeks.stddev
    );
  });

  it("increasing iterations narrows the standard error of the mean without shifting the convergence target", () => {
    const uncertainInputs: UncertainScenarioInputs = {
      budget: { kind: "uniform", min: 1_000_000, max: 1_400_000 },
      headcount: 10,
      deadlineWeeks: 48,
      scope: 480,
    };

    const seed = 777;
    const smallRun = runMonteCarloSimulation(uncertainInputs, { iterations: 100, seed });
    const largeRun = runMonteCarloSimulation(uncertainInputs, { iterations: 5000, seed });

    // Both should converge near the deterministic cost (10 * 48 * 2500 = 1,200,000)
    // Budget utilization = cost / budget. For uniform budget in [1.0M, 1.4M], mean utilization ~ 1.2M / 1.188M ~ 1.01
    expect(largeRun.budgetUtilization.mean).toBeCloseTo(smallRun.budgetUtilization.mean, 1);

    // Standard error of the mean = stddev / sqrt(N)
    const seSmall = smallRun.budgetUtilization.stddev / Math.sqrt(smallRun.iterationsActuallyUsed);
    const seLarge = largeRun.budgetUtilization.stddev / Math.sqrt(largeRun.iterationsActuallyUsed);

    expect(seLarge).toBeLessThan(seSmall);
  });

  it("correctly skips and counts iterations that sample invalid inputs", () => {
    // Budget can sample negative numbers with this uniform distribution
    const uncertainInputs: UncertainScenarioInputs = {
      budget: { kind: "uniform", min: -500_000, max: 1_000_000 },
      headcount: 10,
      deadlineWeeks: 48,
    };

    const result = runMonteCarloSimulation(uncertainInputs, { iterations: 500, seed: 99 });

    expect(result.iterationsRequested).toBe(500);
    expect(result.skippedIterations).toBeGreaterThan(0);
    expect(result.iterationsActuallyUsed).toBeLessThan(500);
    expect(result.iterationsActuallyUsed + result.skippedIterations).toBe(500);
  });

  describe("distribution kind parameterization (it.each)", () => {
    const distributionKinds: Array<[string, Distribution]> = [
      ["fixed", { kind: "fixed", value: 1_200_000 }],
      ["uniform", { kind: "uniform", min: 1_000_000, max: 1_400_000 }],
      ["normal", { kind: "normal", mean: 1_200_000, stddev: 50_000 }],
    ];

    it.each(distributionKinds)(
      "runs Monte Carlo successfully with a %s budget distribution",
      (_kind, budgetDist) => {
        const result = runMonteCarloSimulation(
          {
            budget: budgetDist,
            headcount: 10,
            deadlineWeeks: 48,
          },
          { iterations: 200, seed: 123 }
        );

        expect(result.iterationsActuallyUsed).toBe(200);
        expect(result.skippedIterations).toBe(0);
        expect(result.actualCost.mean).toBeGreaterThan(0);
        expect(result.riskScore.mean).toBeGreaterThanOrEqual(0);
        expect(result.riskScore.mean).toBeLessThanOrEqual(100);
      }
    );

    const invalidDistributions: Array<[string, UncertainScenarioInputs]> = [
      [
        "negative fixed budget",
        { budget: { kind: "fixed", value: -100_000 }, headcount: 10, deadlineWeeks: 48 },
      ],
      [
        "uniform budget crossing zero",
        {
          budget: { kind: "uniform", min: -200_000, max: 500_000 },
          headcount: 10,
          deadlineWeeks: 48,
        },
      ],
      [
        "normal headcount with negative tail",
        {
          budget: 1_000_000,
          headcount: { kind: "normal", mean: 1, stddev: 5 },
          deadlineWeeks: 48,
        },
      ],
      [
        "uniform deadline with negative range",
        {
          budget: 1_000_000,
          headcount: 10,
          deadlineWeeks: { kind: "uniform", min: -10, max: 5 },
        },
      ],
      [
        "normal scope centered below zero",
        {
          budget: 1_000_000,
          headcount: 10,
          deadlineWeeks: 48,
          scope: { kind: "normal", mean: -50, stddev: 10 },
        },
      ],
    ];

    it.each(invalidDistributions)(
      "skips invalid scenario iterations for %s",
      (_label, inputs) => {
        const result = runMonteCarloSimulation(inputs, { iterations: 200, seed: 42 });
        expect(result.skippedIterations).toBeGreaterThan(0);
        expect(result.iterationsActuallyUsed).toBeLessThan(200);
        expect(result.iterationsActuallyUsed + result.skippedIterations).toBe(200);
      }
    );
  });

  describe("feasibility rate behavior", () => {
    it("reports feasibility rate of 1.0 for safely resourced scenarios", () => {
      const result = runMonteCarloSimulation(
        {
          budget: { kind: "uniform", min: 3_000_000, max: 4_000_000 },
          headcount: 10,
          deadlineWeeks: { kind: "uniform", min: 70, max: 90 },
          scope: 480,
        },
        { iterations: 200, seed: 42 }
      );
      expect(result.feasibleRate).toBe(1.0);
    });

    it("reports feasibility rate of 0.0 for severely under-resourced scenarios", () => {
      const result = runMonteCarloSimulation(
        {
          budget: { kind: "uniform", min: 10_000, max: 20_000 },
          headcount: 1,
          deadlineWeeks: 2,
          scope: 480,
        },
        { iterations: 200, seed: 42 }
      );
      expect(result.feasibleRate).toBe(0.0);
    });
  });

  describe("on-time and within-budget probability behavior", () => {
    const safelyResourced: UncertainScenarioInputs = {
      budget: { kind: "uniform", min: 3_000_000, max: 4_000_000 },
      headcount: 10,
      deadlineWeeks: { kind: "uniform", min: 70, max: 90 },
      scope: 480,
    };

    const underResourced: UncertainScenarioInputs = {
      budget: { kind: "uniform", min: 10_000, max: 20_000 },
      headcount: 1,
      deadlineWeeks: 2,
      scope: 480,
    };

    it("confirms probabilityOnTime is 1.0 for a comfortably-resourced scenario", () => {
      const result = runMonteCarloSimulation(safelyResourced, { iterations: 200, seed: 42 });
      expect(result.probabilityOnTime).toBe(1.0);
    });

    it("confirms probabilityOnTime is 0.0 for a severely under-resourced scenario", () => {
      const result = runMonteCarloSimulation(underResourced, { iterations: 200, seed: 42 });
      expect(result.probabilityOnTime).toBe(0.0);
    });

    it("confirms probabilityWithinBudget behaves the same way", () => {
      const safeResult = runMonteCarloSimulation(safelyResourced, { iterations: 200, seed: 42 });
      expect(safeResult.probabilityWithinBudget).toBe(1.0);

      const underResult = runMonteCarloSimulation(underResourced, { iterations: 200, seed: 42 });
      expect(underResult.probabilityWithinBudget).toBe(0.0);
    });

    it("confirms probabilityOnTime and probabilityWithinBudget can diverge from each other and from feasibleRate when schedule is fine but budget is tight", () => {
      const tightBudgetScenario: UncertainScenarioInputs = {
        budget: 1_000_000,
        headcount: 10,
        deadlineWeeks: 100,
        scope: 480,
      };

      const result = runMonteCarloSimulation(tightBudgetScenario, { iterations: 200, seed: 42 });

      expect(result.probabilityOnTime).toBe(1.0);
      expect(result.probabilityWithinBudget).toBe(0.0);
      expect(result.feasibleRate).toBe(1.0);

      expect(result.probabilityOnTime).not.toBe(result.probabilityWithinBudget);
      expect(result.probabilityWithinBudget).not.toBe(result.feasibleRate);
    });
  });

  describe("performance check", () => {
    it("completes 5000 iterations in well under a second (< 1000ms)", () => {
      const start = Date.now();
      const result = runMonteCarloSimulation(
        {
          budget: { kind: "normal", mean: 1_200_000, stddev: 100_000 },
          headcount: { kind: "uniform", min: 6, max: 14 },
          deadlineWeeks: { kind: "normal", mean: 48, stddev: 5 },
          scope: { kind: "uniform", min: 400, max: 550 },
        },
        { iterations: 5000, seed: 42 }
      );
      const durationMs = Date.now() - start;

      expect(result.iterationsActuallyUsed).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(1000);
    });
  });

  describe("barrel export (index.ts)", () => {
    it("exports all Phase 1 and Phase 2 public symbols", async () => {
      const indexModule = await import("../index.js");
      expect(indexModule.runMonteCarloSimulation).toBeDefined();
      expect(indexModule.sampleScenarioInputs).toBeDefined();
      expect(indexModule.simulate).toBeDefined();
      expect(indexModule.DEFAULT_SCOPE_PERSON_WEEKS).toBeDefined();
    });
  });
});
