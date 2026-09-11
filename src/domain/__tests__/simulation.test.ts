import { describe, expect, it } from "vitest";
import type { ScenarioInputs } from "../types.js";
import {
  BASE_TEAM_SIZE,
  COST_PER_PERSON_WEEK,
  FEASIBILITY_RISK_THRESHOLD,
  MAX_EFFICIENT_HEADCOUNT,
  MIN_SAFE_HEADCOUNT,
} from "../constants.js";
import {
  InvalidScenarioError,
  actualCost,
  combineRisk,
  effectiveHeadcount,
  estimatedTimeWeeks,
  resolveInputs,
  riskFromUtilization,
  simulate,
  staffingRisk,
  teamEfficiency,
} from "../simulation.js";

describe("resolveInputs", () => {
  it("fills in the default scope when none is provided", () => {
    const resolved = resolveInputs({ budget: 100_000, headcount: 10, deadlineWeeks: 20 });
    expect(resolved.scope).toBeGreaterThan(0);
  });

  it("preserves an explicit scope", () => {
    const resolved = resolveInputs({
      budget: 100_000,
      headcount: 10,
      deadlineWeeks: 20,
      scope: 300,
    });
    expect(resolved.scope).toBe(300);
  });

  const invalidCases: Array<[string, ScenarioInputs]> = [
    ["budget", { budget: 0, headcount: 10, deadlineWeeks: 20 }],
    ["budget", { budget: -5, headcount: 10, deadlineWeeks: 20 }],
    ["headcount", { budget: 100_000, headcount: 0, deadlineWeeks: 20 }],
    ["headcount", { budget: 100_000, headcount: -1, deadlineWeeks: 20 }],
    ["deadlineWeeks", { budget: 100_000, headcount: 10, deadlineWeeks: 0 }],
    ["scope", { budget: 100_000, headcount: 10, deadlineWeeks: 20, scope: -10 }],
    ["headcount", { budget: 100_000, headcount: NaN, deadlineWeeks: 20 }],
  ];

  it.each(invalidCases)("rejects a non-positive %s", (_field, inputs) => {
    expect(() => resolveInputs(inputs)).toThrow(InvalidScenarioError);
  });
});

describe("teamEfficiency", () => {
  it("is 1.0 (no overhead) at or below the base team size", () => {
    expect(teamEfficiency(1)).toBe(1);
    expect(teamEfficiency(BASE_TEAM_SIZE)).toBe(1);
  });

  it("declines as headcount grows past the base team size", () => {
    const smaller = teamEfficiency(BASE_TEAM_SIZE + 5);
    const larger = teamEfficiency(BASE_TEAM_SIZE + 20);
    expect(smaller).toBeLessThan(1);
    expect(larger).toBeLessThan(smaller);
  });

  it("never drops below the configured floor", () => {
    expect(teamEfficiency(10_000)).toBeGreaterThanOrEqual(0.05);
  });
});

describe("effectiveHeadcount", () => {
  it("equals raw headcount when there is no coordination overhead", () => {
    expect(effectiveHeadcount(5)).toBe(5);
  });

  it("is less than raw headcount once overhead kicks in", () => {
    const headcount = BASE_TEAM_SIZE + 10;
    expect(effectiveHeadcount(headcount)).toBeLessThan(headcount);
  });

  it("exhibits the Mythical Man-Month effect: a big enough team can be less effective than a smaller one", () => {
    // 40 people, well past the base team size, is comfortably inside the
    // "more people helps" zone.
    const midSize = effectiveHeadcount(40);
    // 150 people is so far past it that coordination overhead outweighs the
    // extra hands — effective output should be *lower*, not higher.
    const hugeTeam = effectiveHeadcount(150);
    expect(hugeTeam).toBeLessThan(midSize);
  });
});

describe("estimatedTimeWeeks", () => {
  it("halves (roughly) when headcount doubles, below the overhead threshold", () => {
    const scope = 100;
    const timeAt4 = estimatedTimeWeeks(4, scope);
    const timeAt8 = estimatedTimeWeeks(8, scope);
    expect(timeAt8).toBeCloseTo(timeAt4 / 2, 5);
  });

  it("increases when scope increases, holding headcount fixed", () => {
    const small = estimatedTimeWeeks(10, 100);
    const large = estimatedTimeWeeks(10, 500);
    expect(large).toBeGreaterThan(small);
  });
});

describe("actualCost", () => {
  it("equals headcount * time * cost-per-person-week", () => {
    expect(actualCost(10, 5)).toBe(10 * 5 * COST_PER_PERSON_WEEK);
  });

  it("scales linearly with headcount for a fixed time", () => {
    expect(actualCost(20, 5)).toBeCloseTo(2 * actualCost(10, 5), 5);
  });
});

describe("riskFromUtilization", () => {
  it("is 0 at zero utilization", () => {
    expect(riskFromUtilization(0)).toBe(0);
  });

  it("is exactly 50 right at the boundary (utilization == 1)", () => {
    expect(riskFromUtilization(1.0)).toBeCloseTo(50, 5);
  });

  it("caps at 100 for deeply over-budget/over-schedule scenarios", () => {
    expect(riskFromUtilization(3)).toBe(100);
  });

  it("is monotonically non-decreasing as utilization rises", () => {
    const samples = [0, 0.3, 0.5, 0.7, 0.85, 1.0, 1.2, 1.5, 2.0];
    for (let i = 1; i < samples.length; i++) {
      expect(riskFromUtilization(samples[i]!)).toBeGreaterThanOrEqual(
        riskFromUtilization(samples[i - 1]!)
      );
    }
  });
});

describe("staffingRisk", () => {
  it("is 0 inside the safe/efficient band", () => {
    expect(staffingRisk(MIN_SAFE_HEADCOUNT)).toBe(0);
    expect(staffingRisk(MAX_EFFICIENT_HEADCOUNT)).toBe(0);
    expect(staffingRisk((MIN_SAFE_HEADCOUNT + MAX_EFFICIENT_HEADCOUNT) / 2)).toBe(0);
  });

  it("rises as headcount drops toward 1 (key-person risk)", () => {
    const risk2 = staffingRisk(2);
    const risk1 = staffingRisk(1);
    expect(risk1).toBeGreaterThan(risk2);
    expect(risk2).toBeGreaterThan(0);
  });

  it("rises as headcount grows past the efficient band", () => {
    const risk20 = staffingRisk(20);
    const risk40 = staffingRisk(40);
    expect(risk20).toBeGreaterThan(0);
    expect(risk40).toBeGreaterThan(risk20);
  });
});

describe("combineRisk", () => {
  it("is a weighted average, clamped to [0, 100]", () => {
    const score = combineRisk({ scheduleRisk: 100, budgetRisk: 100, staffingRisk: 100 });
    expect(score).toBe(100);
  });

  it("is 0 when every component is 0", () => {
    expect(combineRisk({ scheduleRisk: 0, budgetRisk: 0, staffingRisk: 0 })).toBe(0);
  });
});

describe("simulate (integration)", () => {
  const baseline = { budget: 1_200_000, headcount: 10, deadlineWeeks: 48, scope: 480 };

  it("produces internally consistent utilization numbers", () => {
    const result = simulate(baseline);
    expect(result.budgetUtilization).toBeCloseTo(result.actualCost / baseline.budget, 8);
    expect(result.scheduleUtilization).toBeCloseTo(
      result.estimatedTimeWeeks / baseline.deadlineWeeks,
      8
    );
  });

  it("keeps riskScore within [0, 100]", () => {
    const result = simulate(baseline);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("marks a comfortably-resourced scenario as feasible", () => {
    // Generous budget and deadline relative to the work.
    const result = simulate({
      budget: 3_000_000,
      headcount: 10,
      deadlineWeeks: 80,
      scope: 480,
    });
    expect(result.feasible).toBe(true);
    expect(result.riskScore).toBeLessThan(FEASIBILITY_RISK_THRESHOLD);
  });

  it("marks a severely under-resourced scenario as infeasible", () => {
    // Tiny budget, tiny deadline, huge scope, one person.
    const result = simulate({
      budget: 10_000,
      headcount: 1,
      deadlineWeeks: 2,
      scope: 480,
    });
    expect(result.feasible).toBe(false);
    expect(result.riskScore).toBeGreaterThanOrEqual(FEASIBILITY_RISK_THRESHOLD);
  });

  it("more budget alone (holding scope/headcount/deadline fixed) only reduces budget risk, never changes cost or time", () => {
    const low = simulate({ ...baseline, budget: 800_000 });
    const high = simulate({ ...baseline, budget: 5_000_000 });

    expect(high.actualCost).toBe(low.actualCost);
    expect(high.estimatedTimeWeeks).toBe(low.estimatedTimeWeeks);
    expect(high.riskBreakdown.budgetRisk).toBeLessThan(low.riskBreakdown.budgetRisk);
    expect(high.riskScore).toBeLessThan(low.riskScore);
  });

  it("a longer deadline alone only reduces schedule risk, never changes cost or time", () => {
    const tight = simulate({ ...baseline, deadlineWeeks: 20 });
    const relaxed = simulate({ ...baseline, deadlineWeeks: 100 });

    expect(relaxed.actualCost).toBe(tight.actualCost);
    expect(relaxed.estimatedTimeWeeks).toBe(tight.estimatedTimeWeeks);
    expect(relaxed.riskBreakdown.scheduleRisk).toBeLessThan(tight.riskBreakdown.scheduleRisk);
  });

  it("throws InvalidScenarioError instead of returning garbage for bad inputs", () => {
    expect(() => simulate({ budget: -1, headcount: 5, deadlineWeeks: 10 })).toThrow(
      InvalidScenarioError
    );
  });
});
