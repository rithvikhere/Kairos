import { describe, it, expect } from "vitest";
import {
  teamSeniorityMixRisk,
  attritionRisk,
  dependencyRisk,
  technicalDebtRisk,
  scopeVolatilityRisk,
  distributedTeamOverheadRisk,
  vendorLeadTimeRisk,
  regulatoryComplexityRisk,
  qualityRigorRisk,
  stakeholderCountRisk,
  teamFamiliarityRisk,
} from "../formulas.js";

/**
 * These are SANITY tests, not validation tests — per the Phase 8 master
 * prompt's requirement, every placeholder formula gets at least a
 * monotonicity check and a boundary/clamp check. None of these tests
 * assert that the formulas are CORRECT (there's no ground truth to check
 * against yet) — only that they behave sensibly (bounded 0-100,
 * monotonic in the expected direction, no NaN/Infinity on edge inputs).
 */

describe("teamSeniorityMixRisk", () => {
  it("is 0 at full seniority, 100 at zero seniority", () => {
    expect(teamSeniorityMixRisk(1)).toBe(0);
    expect(teamSeniorityMixRisk(0)).toBe(100);
  });
  it("decreases monotonically as seniority fraction increases", () => {
    expect(teamSeniorityMixRisk(0.8)).toBeLessThan(teamSeniorityMixRisk(0.2));
  });
  it("clamps out-of-range input", () => {
    expect(teamSeniorityMixRisk(1.5)).toBe(0);
    expect(teamSeniorityMixRisk(-0.5)).toBe(100);
  });
});

describe("attritionRisk", () => {
  it("is 0 at zero attrition", () => {
    expect(attritionRisk(0)).toBe(0);
  });
  it("increases monotonically with attrition rate", () => {
    expect(attritionRisk(0.1)).toBeLessThan(attritionRisk(0.5));
  });
  it("caps at 100 even for a very high rate", () => {
    expect(attritionRisk(1)).toBe(100);
  });
});

describe("dependencyRisk", () => {
  it("is 0 with zero dependencies", () => {
    expect(dependencyRisk(0)).toBe(0);
  });
  it("increases monotonically with dependency count", () => {
    expect(dependencyRisk(1)).toBeLessThan(dependencyRisk(5));
    expect(dependencyRisk(5)).toBeLessThan(dependencyRisk(20));
  });
  it("shows diminishing marginal risk per additional dependency", () => {
    const delta1to2 = dependencyRisk(2) - dependencyRisk(1);
    const delta10to11 = dependencyRisk(11) - dependencyRisk(10);
    expect(delta10to11).toBeLessThan(delta1to2);
  });
  it("approaches but never reaches 100", () => {
    // Using 50 rather than an extreme value like 1000: at this formula's
    // decay constant (5), 1000 underflows the exponential term to exactly
    // 0 in floating point, which would make this assertion meaningless.
    expect(dependencyRisk(50)).toBeLessThan(100);
    expect(dependencyRisk(50)).toBeGreaterThan(99);
  });
});

describe("technicalDebtRisk", () => {
  it("scales linearly from 0 to 100 across the 0-10 domain", () => {
    expect(technicalDebtRisk(0)).toBe(0);
    expect(technicalDebtRisk(5)).toBe(50);
    expect(technicalDebtRisk(10)).toBe(100);
  });
  it("clamps values above the documented domain", () => {
    expect(technicalDebtRisk(15)).toBe(100);
  });
});

describe("scopeVolatilityRisk", () => {
  it("matches the documented NASA-anchored breakpoints", () => {
    expect(scopeVolatilityRisk(0)).toBe(0);
    expect(scopeVolatilityRisk(10)).toBe(25);
    expect(scopeVolatilityRisk(20)).toBe(55);
    expect(scopeVolatilityRisk(40)).toBe(85);
    expect(scopeVolatilityRisk(100)).toBe(100);
  });
  it("interpolates smoothly between anchors, not in a step function", () => {
    const at15 = scopeVolatilityRisk(15);
    expect(at15).toBeGreaterThan(25);
    expect(at15).toBeLessThan(55);
  });
  it("is monotonically non-decreasing across the full domain", () => {
    let prev = -1;
    for (let v = 0; v <= 100; v += 5) {
      const risk = scopeVolatilityRisk(v);
      expect(risk).toBeGreaterThanOrEqual(prev);
      prev = risk;
    }
  });
});

describe("distributedTeamOverheadRisk", () => {
  it("is 0 for a single co-located site", () => {
    expect(distributedTeamOverheadRisk(1)).toBe(0);
  });
  it("increases monotonically with site count", () => {
    expect(distributedTeamOverheadRisk(2)).toBeLessThan(distributedTeamOverheadRisk(5));
  });
  it("treats anything below 1 site as 1 site (floor)", () => {
    expect(distributedTeamOverheadRisk(0)).toBe(0);
  });
});

describe("vendorLeadTimeRisk", () => {
  it("is 0 at zero lead time", () => {
    expect(vendorLeadTimeRisk(0)).toBe(0);
  });
  it("increases monotonically with lead time", () => {
    expect(vendorLeadTimeRisk(2)).toBeLessThan(vendorLeadTimeRisk(12));
  });
  it("approaches but never reaches 100", () => {
    // 60 rather than 500 for the same floating-point-underflow reason noted
    // on dependencyRisk's equivalent test above.
    expect(vendorLeadTimeRisk(60)).toBeLessThan(100);
  });
});

describe("regulatoryComplexityRisk", () => {
  it("scales linearly across the 0-10 domain", () => {
    expect(regulatoryComplexityRisk(0)).toBe(0);
    expect(regulatoryComplexityRisk(10)).toBe(100);
  });
});

describe("qualityRigorRisk", () => {
  it("is dampened by the documented 0.8 factor at max rigor", () => {
    expect(qualityRigorRisk(10)).toBe(80);
  });
  it("is 0 at zero required rigor", () => {
    expect(qualityRigorRisk(0)).toBe(0);
  });
  it("increases monotonically with rigor level", () => {
    expect(qualityRigorRisk(3)).toBeLessThan(qualityRigorRisk(8));
  });
});

describe("stakeholderCountRisk", () => {
  it("is 0 with zero stakeholders", () => {
    expect(stakeholderCountRisk(0)).toBe(0);
  });
  it("increases monotonically with stakeholder count", () => {
    expect(stakeholderCountRisk(2)).toBeLessThan(stakeholderCountRisk(15));
  });
  it("approaches but never reaches 100", () => {
    // 80 rather than 1000, for the same floating-point-underflow reason
    // noted on dependencyRisk's equivalent test above.
    expect(stakeholderCountRisk(80)).toBeLessThan(100);
  });
});

describe("teamFamiliarityRisk", () => {
  it("is 0 at full familiarity, 100 at zero familiarity", () => {
    expect(teamFamiliarityRisk(1)).toBe(0);
    expect(teamFamiliarityRisk(0)).toBe(100);
  });
  it("decreases monotonically as familiarity increases", () => {
    expect(teamFamiliarityRisk(0.9)).toBeLessThan(teamFamiliarityRisk(0.1));
  });
});

describe("all formulas — shared invariants", () => {
  const cases: Array<[string, (v: number) => number, number[]]> = [
    ["teamSeniorityMixRisk", teamSeniorityMixRisk, [0, 0.25, 0.5, 0.75, 1]],
    ["attritionRisk", attritionRisk, [0, 0.25, 0.5, 0.75, 1]],
    ["dependencyRisk", dependencyRisk, [0, 1, 5, 20, 50]],
    ["technicalDebtRisk", technicalDebtRisk, [0, 2, 5, 8, 10]],
    ["scopeVolatilityRisk", scopeVolatilityRisk, [0, 10, 20, 40, 100]],
    ["distributedTeamOverheadRisk", distributedTeamOverheadRisk, [1, 2, 5, 10]],
    ["vendorLeadTimeRisk", vendorLeadTimeRisk, [0, 2, 6, 12, 52]],
    ["regulatoryComplexityRisk", regulatoryComplexityRisk, [0, 3, 5, 8, 10]],
    ["qualityRigorRisk", qualityRigorRisk, [0, 3, 5, 8, 10]],
    ["stakeholderCountRisk", stakeholderCountRisk, [0, 2, 8, 20, 80]],
    ["teamFamiliarityRisk", teamFamiliarityRisk, [0, 0.25, 0.5, 0.75, 1]],
  ];

  it.each(cases)("%s never returns NaN, Infinity, or an out-of-range value", (_name, fn, values) => {
    for (const v of values) {
      const result = fn(v);
      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    }
  });
});
