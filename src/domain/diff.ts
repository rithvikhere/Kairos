/**
 * Scenario diffing and attribution engine.
 *
 * This module compares two saved scenarios (ScenarioRecord) at three levels:
 * 1. Input deltas (what levers changed, resolving distributions to representative central numbers)
 * 2. Output deltas (deterministic cost, schedule, utilizations, risk breakdown, feasibility;
 *    plus Monte Carlo on-time, within-budget, and feasibility rates when available)
 * 3. Attribution analysis (isolating which changed input drove the observed risk score delta)
 *
 * ============================================================================
 * KNOWN LIMITATION — NON-ADDITIVE RISK ATTRIBUTION:
 * Because simulate()'s risk model is non-additive (due to non-linear team efficiency
 * under Brooks's Law, utilization clamping, and piecewise risk weights), the sum
 * of individual isolatedRiskContribution values will NOT generally equal
 * outputDiff.riskScore.delta when more than one input has changed.
 * There is a real interaction effect between variables (e.g., changing headcount
 * shifts effective throughput non-linearly, interacting with deadline and budget).
 * Contributions are kept as pure, un-normalized single-variable probe results
 * and must NEVER be rescaled or normalized to artificially force them to sum to
 * the total delta, as that would misrepresent the underlying mathematical model.
 * ============================================================================
 */

import { DEFAULT_SCOPE_PERSON_WEEKS } from "./constants.js";
import { simulate } from "./simulation.js";
import { normalizeDistribution } from "./monteCarlo.js";
import type { Distribution, UncertainScenarioInputs } from "./monteCarlo.js";
import type { ScenarioInputs } from "./types.js";
import type { ScenarioRecord } from "../data/schema.js";
import { getScenario } from "../data/db.js";

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
 * Deltas across all scenario inputs, resolved to representative scalar numbers.
 */
export interface InputDiff {
  budget: FieldDelta;
  headcount: FieldDelta;
  deadlineWeeks: FieldDelta;
  scope: FieldDelta;
}

/**
 * Deltas across all deterministic simulation outputs and feasibility status.
 */
export interface OutputDiff {
  estimatedTimeWeeks: FieldDelta;
  effectiveHeadcount: FieldDelta;
  actualCost: FieldDelta;
  budgetUtilization: FieldDelta;
  scheduleUtilization: FieldDelta;
  riskScore: FieldDelta;
  riskBreakdown: {
    scheduleRisk: FieldDelta;
    budgetRisk: FieldDelta;
    staffingRisk: FieldDelta;
  };
  feasible: { from: boolean; to: boolean; changed: boolean };
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
  field: keyof InputDiff;
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
   * One row per CHANGED input, sorted by |isolatedRiskContribution| descending.
   *
   * KNOWN LIMITATION: Because simulate()'s risk model is non-additive (non-linear
   * team efficiency diminishing returns and piecewise risk curves), the sum of
   * isolatedRiskContribution values will NOT generally equal outputDiff.riskScore.delta
   * when more than one input changed. These values are intentionally not rescaled.
   */
  attribution: InputAttribution[];
}

/**
 * Resolves a concrete representative scalar number from a number or Distribution specification.
 *
 * Plain numbers resolve to themselves.
 * Distributions resolve to their representative central tendencies:
 * - "fixed": `value`
 * - "normal": `mean`
 * - "uniform": `(min + max) / 2`
 * If undefined (e.g. omitted optional scope), defaults to DEFAULT_SCOPE_PERSON_WEEKS.
 *
 * Reuses normalizeDistribution() from monteCarlo.ts.
 */
export function resolveRepresentativeNumber(
  input: number | Distribution | undefined
): number {
  if (input === undefined) {
    return DEFAULT_SCOPE_PERSON_WEEKS;
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
 *
 * Computes delta, percentChange (null if from === 0), and direction.
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
 * Pure function to diff two already-loaded ScenarioRecord entities.
 *
 * Compares inputs (resolved to representative numbers), deterministic outputs,
 * Monte Carlo outputs (if both scenarios have them), and computes isolated single-variable
 * risk attributions for each changed input parameter.
 */
export function diffScenarios(
  scenarioA: ScenarioRecord,
  scenarioB: ScenarioRecord
): ScenarioDiff {
  // a. inputDiff on resolved representative numbers
  const resolvedA = {
    budget: resolveRepresentativeNumber(scenarioA.inputs.budget),
    headcount: resolveRepresentativeNumber(scenarioA.inputs.headcount),
    deadlineWeeks: resolveRepresentativeNumber(scenarioA.inputs.deadlineWeeks),
    scope: resolveRepresentativeNumber(scenarioA.inputs.scope),
  };

  const resolvedB = {
    budget: resolveRepresentativeNumber(scenarioB.inputs.budget),
    headcount: resolveRepresentativeNumber(scenarioB.inputs.headcount),
    deadlineWeeks: resolveRepresentativeNumber(scenarioB.inputs.deadlineWeeks),
    scope: resolveRepresentativeNumber(scenarioB.inputs.scope),
  };

  const inputDiff: InputDiff = {
    budget: fieldwiseDelta(resolvedA.budget, resolvedB.budget),
    headcount: fieldwiseDelta(resolvedA.headcount, resolvedB.headcount),
    deadlineWeeks: fieldwiseDelta(resolvedA.deadlineWeeks, resolvedB.deadlineWeeks),
    scope: fieldwiseDelta(resolvedA.scope, resolvedB.scope),
  };

  // b. outputDiff across deterministic outputs
  const outA = scenarioA.deterministic_output;
  const outB = scenarioB.deterministic_output;

  const outputDiff: OutputDiff = {
    estimatedTimeWeeks: fieldwiseDelta(outA.estimatedTimeWeeks, outB.estimatedTimeWeeks),
    effectiveHeadcount: fieldwiseDelta(outA.effectiveHeadcount, outB.effectiveHeadcount),
    actualCost: fieldwiseDelta(outA.actualCost, outB.actualCost),
    budgetUtilization: fieldwiseDelta(outA.budgetUtilization, outB.budgetUtilization),
    scheduleUtilization: fieldwiseDelta(outA.scheduleUtilization, outB.scheduleUtilization),
    riskScore: fieldwiseDelta(outA.riskScore, outB.riskScore),
    riskBreakdown: {
      scheduleRisk: fieldwiseDelta(outA.riskBreakdown.scheduleRisk, outB.riskBreakdown.scheduleRisk),
      budgetRisk: fieldwiseDelta(outA.riskBreakdown.budgetRisk, outB.riskBreakdown.budgetRisk),
      staffingRisk: fieldwiseDelta(outA.riskBreakdown.staffingRisk, outB.riskBreakdown.staffingRisk),
    },
    feasible: {
      from: outA.feasible,
      to: outB.feasible,
      changed: outA.feasible !== outB.feasible,
    },
  };

  // c. monteCarloDiff = null if either scenario's monte_carlo_output is null
  let monteCarloDiff: MonteCarloDiff | null = null;
  if (scenarioA.monte_carlo_output !== null && scenarioB.monte_carlo_output !== null) {
    const mcA = scenarioA.monte_carlo_output;
    const mcB = scenarioB.monte_carlo_output;
    monteCarloDiff = {
      probabilityOnTime: fieldwiseDelta(mcA.probabilityOnTime, mcB.probabilityOnTime),
      probabilityWithinBudget: fieldwiseDelta(mcA.probabilityWithinBudget, mcB.probabilityWithinBudget),
      feasibleRate: fieldwiseDelta(mcA.feasibleRate, mcB.feasibleRate),
    };
  }

  // d. changedFields: every key in inputDiff where direction !== "unchanged"
  const inputKeys: Array<keyof InputDiff> = ["budget", "headcount", "deadlineWeeks", "scope"];
  const changedFields = inputKeys.filter((field) => inputDiff[field].direction !== "unchanged");

  // e. Attribution: probe UncertainScenarioInputs replacing only one field at a time
  const attribution: InputAttribution[] = changedFields.map((field) => {
    const probeUncertain: UncertainScenarioInputs = {
      ...scenarioA.inputs,
      [field]: scenarioB.inputs[field],
    };

    const probeInputs: ScenarioInputs = {
      budget: resolveRepresentativeNumber(probeUncertain.budget),
      headcount: resolveRepresentativeNumber(probeUncertain.headcount),
      deadlineWeeks: resolveRepresentativeNumber(probeUncertain.deadlineWeeks),
      scope: resolveRepresentativeNumber(probeUncertain.scope),
    };

    const probeOutcome = simulate(probeInputs);
    const isolatedRiskScore = probeOutcome.riskScore;
    const isolatedRiskContribution = isolatedRiskScore - outA.riskScore;

    return {
      field,
      isolatedRiskScore,
      isolatedRiskContribution,
    };
  });

  // f. Sort attribution by |isolatedRiskContribution| descending
  attribution.sort(
    (a, b) => Math.abs(b.isolatedRiskContribution) - Math.abs(a.isolatedRiskContribution)
  );

  // g. Return the full ScenarioDiff
  return {
    scenarioAId: scenarioA.id,
    scenarioBId: scenarioB.id,
    inputDiff,
    outputDiff,
    monteCarloDiff,
    attribution,
  };
}

/**
 * Asynchronously loads two scenarios by ID from the database and runs diffScenarios.
 *
 * Throws a clear error if either ID resolves to null.
 * This is the ONLY function in this module that imports from ../data/db.js.
 */
export async function diffScenariosById(
  scenarioAId: string,
  scenarioBId: string
): Promise<ScenarioDiff> {
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
