/**
 * Scenario diffing and attribution engine for Phase 8.
 *
 * Compares two saved scenarios (ScenarioRecord) with dynamic 15-constraint dictionaries:
 * 1. Input deltas across active constraints shared by both scenarios.
 * 2. Output deltas across computed metrics shared by both scenarios.
 * 3. Surface constraints/outputs present in only one scenario as `onlyInA` / `onlyInB`.
 * 4. Single-lever risk attribution: iterates across active constraints changed in both scenarios,
 *    re-evaluating simulate() with one changed lever at a time to measure isolated risk impact.
 */

import { DEFAULT_SCOPE_PERSON_WEEKS } from "./constants.js";
import { simulate } from "./simulation.js";
import { normalizeDistribution, normalizeUncertainInputs } from "./monteCarlo.js";
import type { Distribution, UncertainScenarioInputs } from "./monteCarlo.js";
import type { ConstraintKey, ScenarioInputs } from "./types.js";
import type { ScenarioRecord } from "../data/schema.js";

/**
 * Metric delta between two values.
 */
export interface FieldDelta<T = number> {
  from: T;
  to: T;
  delta: T extends number ? number : never;
  percentChange: number | null; // null when `from` is 0
  direction: "increased" | "decreased" | "unchanged";
}

/**
 * Deltas across active scenario inputs evaluated in both scenarios.
 */
export type InputDiff = Partial<Record<string, FieldDelta<number>>>;

/**
 * Deltas across computed outputs evaluated in both scenarios, plus feasibility flag.
 */
export interface OutputDiff {
  [key: string]: any;
  feasible?: { from: boolean; to: boolean; changed: boolean };
}

/**
 * Deltas across probabilistic Monte Carlo sampling outputs.
 */
export interface MonteCarloDiff {
  probabilityOnTime: FieldDelta;
  probabilityWithinBudget: FieldDelta;
  feasibleRate: FieldDelta;
}

/**
 * Attribution of risk change to an isolated input modification.
 */
export interface InputAttribution {
  field: string;
  isolatedRiskScore: number;
  isolatedRiskContribution: number; // isolatedRiskScore - scenarioA's actual riskScore
}

/**
 * Comprehensive diff result between two scenarios.
 */
export interface ScenarioDiff {
  scenarioAId: string;
  scenarioBId: string;
  inputDiff: InputDiff;
  outputDiff: OutputDiff;
  monteCarloDiff: MonteCarloDiff | null;
  /**
   * One row per CHANGED active constraint, sorted by |isolatedRiskContribution| descending.
   */
  attribution: InputAttribution[];
  /** Constraints or outputs evaluated only in scenario A. */
  onlyInA: string[];
  /** Constraints or outputs evaluated only in scenario B. */
  onlyInB: string[];
}

/**
 * Resolves a concrete representative scalar number from a number or Distribution specification.
 */
export function resolveRepresentativeNumber(
  input: number | Distribution | undefined,
  fallback: number = DEFAULT_SCOPE_PERSON_WEEKS
): number {
  if (input === undefined) {
    return fallback;
  }
  const dist = normalizeDistribution(input);
  switch (dist.kind) {
    case "fixed":
      return dist.value;
    case "normal":
      return dist.mean;
    case "uniform":
      return (dist.min + dist.max) / 2;
  }
}

/**
 * Shared helper producing a FieldDelta from a numeric from/to pair.
 */
export function fieldwiseDelta(from: number, to: number): FieldDelta {
  let delta = to - from;
  if (Object.is(delta, -0)) {
    delta = 0;
  }

  let percentChange: number | null = null;
  if (from !== 0) {
    percentChange = ((to - from) / from) * 100;
    if (Object.is(percentChange, -0)) {
      percentChange = 0;
    }
  }

  let direction: "increased" | "decreased" | "unchanged";
  if (to > from) {
    direction = "increased";
  } else if (to < from) {
    direction = "decreased";
  } else {
    direction = "unchanged";
  }

  return {
    from,
    to,
    delta: delta as any,
    percentChange,
    direction,
  };
}

/**
 * Pure function to diff two ScenarioRecord entities.
 */
export function diffScenarios(
  scenarioA: ScenarioRecord | { inputs: UncertainScenarioInputs | ScenarioInputs; [key: string]: any },
  scenarioB: ScenarioRecord | { inputs: UncertainScenarioInputs | ScenarioInputs; [key: string]: any }
): ScenarioDiff {
  const normA = normalizeUncertainInputs(scenarioA.inputs);
  const normB = normalizeUncertainInputs(scenarioB.inputs);

  const inputsA = normA?.constraints || {};
  const inputsB = normB?.constraints || {};

  const activeA = (Object.keys(inputsA) as ConstraintKey[]).filter(
    (k) => inputsA[k]?.enabled === true
  );
  const activeB = (Object.keys(inputsB) as ConstraintKey[]).filter(
    (k) => inputsB[k]?.enabled === true
  );

  const activeSetA = new Set(activeA);
  const activeSetB = new Set(activeB);

  const commonConstraints = activeA.filter((k) => activeSetB.has(k));
  const constraintsOnlyInA = activeA.filter((k) => !activeSetB.has(k));
  const constraintsOnlyInB = activeB.filter((k) => !activeSetA.has(k));

  // 1. inputDiff across common active constraints
  const inputDiff: InputDiff = {};
  for (const key of commonConstraints) {
    const valA = resolveRepresentativeNumber(inputsA[key]!.value);
    const valB = resolveRepresentativeNumber(inputsB[key]!.value);
    inputDiff[key] = fieldwiseDelta(valA, valB);
  }

  // 2. outputDiff across common computed outputs
  const outA = scenarioA.deterministic_output;
  const outB = scenarioB.deterministic_output;

  const compA = outA.computed || (outA as any);
  const compB = outB.computed || (outB as any);

  const compKeysA = Object.keys(compA).filter((k) => typeof compA[k] === "number");
  const compKeysB = Object.keys(compB).filter((k) => typeof compB[k] === "number");

  const compSetA = new Set(compKeysA);
  const compSetB = new Set(compKeysB);

  const commonOutputs = compKeysA.filter((k) => compSetB.has(k));
  const outputsOnlyInA = compKeysA.filter((k) => !compSetB.has(k));
  const outputsOnlyInB = compKeysB.filter((k) => !compSetA.has(k));

  const outputDiff: OutputDiff = {};
  for (const key of commonOutputs) {
    outputDiff[key] = fieldwiseDelta(compA[key]!, compB[key]!);
  }

  // Always diff overall riskScore and feasibility
  outputDiff.riskScore = fieldwiseDelta(outA.riskScore, outB.riskScore);
  outputDiff.feasible = {
    from: outA.feasible,
    to: outB.feasible,
    changed: outA.feasible !== outB.feasible,
  };

  // Backwards compatibility for legacy test assertions checking outputDiff.riskBreakdown
  const schedA = compA.scheduleRisk ?? outA.riskBreakdown?.scheduleRisk;
  const schedB = compB.scheduleRisk ?? outB.riskBreakdown?.scheduleRisk;
  const budA = compA.budgetRisk ?? outA.riskBreakdown?.budgetRisk;
  const budB = compB.budgetRisk ?? outB.riskBreakdown?.budgetRisk;
  const stfA = compA.staffingRisk ?? outA.riskBreakdown?.staffingRisk;
  const stfB = compB.staffingRisk ?? outB.riskBreakdown?.staffingRisk;

  if (
    schedA !== undefined &&
    schedB !== undefined &&
    budA !== undefined &&
    budB !== undefined &&
    stfA !== undefined &&
    stfB !== undefined
  ) {
    outputDiff.riskBreakdown = {
      scheduleRisk: fieldwiseDelta(schedA, schedB),
      budgetRisk: fieldwiseDelta(budA, budB),
      staffingRisk: fieldwiseDelta(stfA, stfB),
    };
  }

  // 3. monteCarloDiff
  let monteCarloDiff: MonteCarloDiff | null = null;
  if (scenarioA.monte_carlo_output !== null && scenarioB.monte_carlo_output !== null) {
    const mcA = scenarioA.monte_carlo_output;
    const mcB = scenarioB.monte_carlo_output;
    monteCarloDiff = {
      probabilityOnTime: fieldwiseDelta(mcA.probabilityOnTime, mcB.probabilityOnTime),
      probabilityWithinBudget: fieldwiseDelta(
        mcA.probabilityWithinBudget,
        mcB.probabilityWithinBudget
      ),
      feasibleRate: fieldwiseDelta(mcA.feasibleRate, mcB.feasibleRate),
    };
  }

  // 4. onlyInA and onlyInB
  const onlyInA = [
    ...constraintsOnlyInA.map((c) => `constraint:${c}`),
    ...outputsOnlyInA.map((o) => `output:${o}`),
  ];
  const onlyInB = [
    ...constraintsOnlyInB.map((c) => `constraint:${c}`),
    ...outputsOnlyInB.map((o) => `output:${o}`),
  ];

  // 5. Attribution: changed active constraints in both scenarios
  const changedConstraints = commonConstraints.filter(
    (field) => inputDiff[field]?.direction !== "unchanged"
  );

  const attribution: InputAttribution[] = changedConstraints.map((field) => {
    // Construct probe: scenario A base inputs, with single constraint replaced from scenario B
    const probeConstraints: Partial<Record<ConstraintKey, { enabled: boolean; value: number }>> = {};

    for (const k of Object.keys(inputsA) as ConstraintKey[]) {
      if (inputsA[k]) {
        probeConstraints[k] = {
          enabled: inputsA[k]!.enabled,
          value: resolveRepresentativeNumber(inputsA[k]!.value),
        };
      }
    }

    probeConstraints[field] = {
      enabled: true,
      value: resolveRepresentativeNumber(inputsB[field]!.value),
    };

    const probeInputs: ScenarioInputs = { constraints: probeConstraints };
    const probeOutcome = simulate(probeInputs);
    const isolatedRiskScore = probeOutcome.riskScore;
    const isolatedRiskContribution = isolatedRiskScore - outA.riskScore;

    return {
      field,
      isolatedRiskScore,
      isolatedRiskContribution,
    };
  });

  // Sort attribution by |isolatedRiskContribution| descending
  attribution.sort(
    (a, b) => Math.abs(b.isolatedRiskContribution) - Math.abs(a.isolatedRiskContribution)
  );

  return {
    scenarioAId: scenarioA.id,
    scenarioBId: scenarioB.id,
    inputDiff,
    outputDiff,
    monteCarloDiff,
    attribution,
    onlyInA,
    onlyInB,
  };
}

/**
 * Asynchronously loads two scenarios by ID from the database and runs diffScenarios.
 */
export async function diffScenariosById(
  scenarioAId: string,
  scenarioBId: string
): Promise<ScenarioDiff> {
  const { getScenario } = await import(/* webpackIgnore: true */ "../data/db.js");
  const scenarioA = await getScenario(scenarioAId);
  if (!scenarioA) {
    throw new Error(`Scenario '${scenarioAId}' not found.`);
  }

  const scenarioB = await getScenario(scenarioBId);
  if (!scenarioB) {
    throw new Error(`Scenario '${scenarioBId}' not found.`);
  }

  return diffScenarios(scenarioA, scenarioB);
}
