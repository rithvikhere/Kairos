import { describe, it, expect } from "vitest";
import { applyIntentDelta } from "../applyIntentDelta.js";
import type { ScenarioInputs } from "../../domain/types.js";
import { DEFAULT_SCOPE_PERSON_WEEKS } from "../../domain/constants.js";

describe("applyIntentDelta", () => {
  const baseline: ScenarioInputs = {
    budget: 100_000,
    headcount: 10,
    deadlineWeeks: 20,
    scope: 400,
  };

  it("leaves all fields unchanged when delta is empty", () => {
    const result = applyIntentDelta(baseline, {});
    expect(result).toEqual(baseline);
  });

  describe("absolute modifications", () => {
    it("sets budget to absolute value directly", () => {
      const result = applyIntentDelta(baseline, {
        budget: { type: "absolute", value: 150_000 },
      });
      expect(result.budget).toBe(150_000);
      expect(result.headcount).toBe(10);
      expect(result.deadlineWeeks).toBe(20);
      expect(result.scope).toBe(400);
    });

    it("sets headcount to absolute value directly", () => {
      const result = applyIntentDelta(baseline, {
        headcount: { type: "absolute", value: 12 },
      });
      expect(result.headcount).toBe(12);
      expect(result.budget).toBe(100_000);
    });

    it("sets deadlineWeeks to absolute value directly", () => {
      const result = applyIntentDelta(baseline, {
        deadlineWeeks: { type: "absolute", value: 25 },
      });
      expect(result.deadlineWeeks).toBe(25);
    });

    it("sets scope to absolute value directly", () => {
      const result = applyIntentDelta(baseline, {
        scope: { type: "absolute", value: 600 },
      });
      expect(result.scope).toBe(600);
    });
  });

  describe("percent modifications", () => {
    it("adjusts budget upward by positive percentage", () => {
      // 100_000 * (1 + 25 / 100) = 125_000
      const result = applyIntentDelta(baseline, {
        budget: { type: "percent", value: 25 },
      });
      expect(result.budget).toBe(125_000);
    });

    it("adjusts budget downward by negative percentage", () => {
      // 100_000 * (1 - 20 / 100) = 80_000
      const result = applyIntentDelta(baseline, {
        budget: { type: "percent", value: -20 },
      });
      expect(result.budget).toBe(80_000);
    });

    it("adjusts headcount by percentage", () => {
      // 10 * (1 + 50 / 100) = 15
      const result = applyIntentDelta(baseline, {
        headcount: { type: "percent", value: 50 },
      });
      expect(result.headcount).toBe(15);
    });

    it("adjusts deadlineWeeks by percentage", () => {
      // 20 * (1 + 10 / 100) = 22
      const result = applyIntentDelta(baseline, {
        deadlineWeeks: { type: "percent", value: 10 },
      });
      expect(result.deadlineWeeks).toBe(22);
    });
  });

  describe("delta (unit addition/subtraction) modifications", () => {
    it("adds units directly to headcount", () => {
      const result = applyIntentDelta(baseline, {
        headcount: { type: "delta", value: 3 },
      });
      expect(result.headcount).toBe(13);
    });

    it("subtracts units directly from deadlineWeeks", () => {
      const result = applyIntentDelta(baseline, {
        deadlineWeeks: { type: "delta", value: -4 },
      });
      expect(result.deadlineWeeks).toBe(16);
    });

    it("adds dollars directly to budget", () => {
      const result = applyIntentDelta(baseline, {
        budget: { type: "delta", value: 50_000 },
      });
      expect(result.budget).toBe(150_000);
    });
  });

  describe("multi-field combinations", () => {
    it("applies mixed delta types across all four fields simultaneously", () => {
      const result = applyIntentDelta(baseline, {
        budget: { type: "percent", value: -20 }, // 100k -> 80k
        headcount: { type: "delta", value: 2 },   // 10 -> 12
        deadlineWeeks: { type: "delta", value: 4 }, // 20 -> 24
        scope: { type: "absolute", value: 500 },  // 400 -> 500
      });

      expect(result).toEqual({
        budget: 80_000,
        headcount: 12,
        deadlineWeeks: 24,
        scope: 500,
      });
    });

    it("preserves unmentioned fields when only a subset is modified", () => {
      const result = applyIntentDelta(baseline, {
        headcount: { type: "delta", value: 2 },
      });

      expect(result.headcount).toBe(12);
      expect(result.budget).toBe(baseline.budget);
      expect(result.deadlineWeeks).toBe(baseline.deadlineWeeks);
      expect(result.scope).toBe(baseline.scope);
    });
  });

  describe("boundary and non-validation behavior", () => {
    it("passes through non-positive values produced by delta arithmetic without throwing", () => {
      // simulate() will catch this downstream, but applyIntentDelta is purely arithmetic
      const result = applyIntentDelta(baseline, {
        budget: { type: "percent", value: -120 }, // 100k * (1 - 1.2) = -20k
        headcount: { type: "delta", value: -15 },  // 10 - 15 = -5
      });

      expect(result.budget).toBeCloseTo(-20_000);
      expect(result.headcount).toBe(-5);
    });

    it("resolves undefined baseline scope using DEFAULT_SCOPE_PERSON_WEEKS when modified via percent or delta", () => {
      const baselineWithoutScope: ScenarioInputs = {
        budget: 100_000,
        headcount: 10,
        deadlineWeeks: 20,
      };

      const resultPercent = applyIntentDelta(baselineWithoutScope, {
        scope: { type: "percent", value: 10 },
      });
      expect(resultPercent.scope).toBe(DEFAULT_SCOPE_PERSON_WEEKS * 1.1);

      const resultDelta = applyIntentDelta(baselineWithoutScope, {
        scope: { type: "delta", value: 20 },
      });
      expect(resultDelta.scope).toBe(DEFAULT_SCOPE_PERSON_WEEKS + 20);
    });

    it("leaves scope undefined when baseline has no scope and delta does not mention scope", () => {
      const baselineWithoutScope: ScenarioInputs = {
        budget: 100_000,
        headcount: 10,
        deadlineWeeks: 20,
      };

      const result = applyIntentDelta(baselineWithoutScope, {
        budget: { type: "absolute", value: 80_000 },
      });
      expect(result.scope).toBeUndefined();
    });
  });
});
