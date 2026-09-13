/**
 * Deterministic simulation core for Phase 8.
 *
 * Implements the uniform 15-constraint model where every constraint is optional.
 * Each computable output declares its prerequisite constraints via OUTPUT_REQUIREMENTS.
 * An output is computed if and only if all of its prerequisite constraints are active.
 *
 * The composite `riskScore` is a weighted renormalization across ONLY the risk dimensions
 * that were actually computed.
 */

import {
  BASE_TEAM_SIZE,
  COORDINATION_OVERHEAD_PER_PERSON,
  COST_PER_PERSON_WEEK,
  DEFAULT_SCOPE_PERSON_WEEKS,
  FEASIBILITY_RISK_THRESHOLD,
  MAX_EFFICIENT_HEADCOUNT,
  MIN_SAFE_HEADCOUNT,
  MIN_TEAM_EFFICIENCY,
} from "./constants.js";
import { OUTPUT_REQUIREMENTS } from "./outputRequirements.js";
import {
  EXTENDED_RISK_FORMULAS,
  EXTENDED_OUTPUT_NAMES,
  ExtendedConstraintKey,
} from "./extendedRiskFormulas/index.js";
import type {
  ConstraintKey,
  ConstraintSetting,
  RiskBreakdown,
  ScenarioInputs,
  SimulationResult,
} from "./types.js";

/** Thrown when ScenarioInputs fail validation. */
export class InvalidScenarioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidScenarioError";
  }
}

/**
 * Base weights for all 14 canonical risk dimensions.
 * Original core dimensions retain their Phase 1 relative weights (0.4, 0.4, 0.2).
 * Extended risk dimensions each contribute with a base weight of 0.1.
 */
export const RISK_DIMENSION_WEIGHTS: Record<string, number> = {
  scheduleRisk: 0.4,
  budgetRisk: 0.4,
  staffingRisk: 0.2,
  teamSeniorityMixRisk: 0.1,
  attritionRisk: 0.1,
  dependencyRisk: 0.1,
  technicalDebtRisk: 0.1,
  scopeVolatilityRisk: 0.1,
  distributedTeamOverheadRisk: 0.1,
  vendorLeadTimeRisk: 0.1,
  regulatoryComplexityRisk: 0.1,
  qualityRigorRisk: 0.1,
  stakeholderCountRisk: 0.1,
  teamFamiliarityRisk: 0.1,
};

/**
 * Normalizes either new constraint-dictionary inputs or legacy 4-field inputs.
 */
export function normalizeScenarioInputs(inputs: any): ScenarioInputs {
  if (inputs && inputs.constraints && typeof inputs.constraints === "object") {
    return inputs;
  }
  const constraints: Partial<Record<ConstraintKey, ConstraintSetting>> = {};
  if (inputs) {
    if (typeof inputs.headcount === "number") {
      constraints.headcount = { enabled: true, value: inputs.headcount };
    }
    if (typeof inputs.budget === "number") {
      constraints.budget = { enabled: true, value: inputs.budget };
    }
    if (typeof inputs.deadlineWeeks === "number") {
      constraints.deadlineWeeks = { enabled: true, value: inputs.deadlineWeeks };
    }
    if (typeof inputs.scope === "number") {
      constraints.scope = { enabled: true, value: inputs.scope };
    } else if (inputs.headcount !== undefined || inputs.budget !== undefined) {
      constraints.scope = { enabled: true, value: DEFAULT_SCOPE_PERSON_WEEKS };
    }
  }
  return { constraints };
}

/**
 * Validates inputs and resolves them for deterministic execution.
 */
export function resolveInputs(inputs: any): any {
  if (!inputs) {
    throw new InvalidScenarioError("Scenario inputs cannot be null or undefined");
  }

  const budget = inputs.budget ?? inputs.constraints?.budget?.value;
  const headcount = inputs.headcount ?? inputs.constraints?.headcount?.value;
  const deadlineWeeks = inputs.deadlineWeeks ?? inputs.constraints?.deadlineWeeks?.value;
  const scope =
    inputs.scope ??
    inputs.constraints?.scope?.value ??
    (inputs.headcount || inputs.constraints?.headcount ? DEFAULT_SCOPE_PERSON_WEEKS : undefined);

  if (budget !== undefined && (!Number.isFinite(budget) || budget <= 0)) {
    throw new InvalidScenarioError("budget must be a positive number");
  }
  if (headcount !== undefined && (!Number.isFinite(headcount) || headcount <= 0)) {
    throw new InvalidScenarioError("headcount must be a positive number");
  }
  if (deadlineWeeks !== undefined && (!Number.isFinite(deadlineWeeks) || deadlineWeeks <= 0)) {
    throw new InvalidScenarioError("deadlineWeeks must be a positive number");
  }
  if (scope !== undefined && (!Number.isFinite(scope) || scope <= 0)) {
    throw new InvalidScenarioError("scope must be a positive number");
  }

  return { budget, headcount, deadlineWeeks, scope };
}

/**
 * Productivity multiplier for a team of this size, modeling Brooks's Law.
 */
export function teamEfficiency(headcount: number): number {
  const overSize = Math.max(0, headcount - BASE_TEAM_SIZE);
  const raw = 1 - overSize * COORDINATION_OVERHEAD_PER_PERSON;
  return Math.min(1, Math.max(MIN_TEAM_EFFICIENCY, raw));
}

/**
 * Headcount adjusted for coordination overhead.
 */
export function effectiveHeadcount(headcount: number): number {
  return headcount * teamEfficiency(headcount);
}

/**
 * How many weeks it takes to deliver `scope` person-weeks of work with `headcount`.
 */
export function estimatedTimeWeeks(headcount: number, scope: number): number {
  return scope / effectiveHeadcount(headcount);
}

/**
 * The true cost of delivering scope with this headcount.
 */
export function actualCost(headcount: number, timeWeeks: number): number {
  return headcount * timeWeeks * COST_PER_PERSON_WEEK;
}

/**
 * Maps a utilization ratio (actual / allowed) to a 0–100 risk score using a piecewise curve.
 */
export function riskFromUtilization(utilization: number): number {
  const u = Math.max(0, utilization);

  if (u <= 0.7) {
    return (u / 0.7) * 20;
  }
  if (u <= 1.0) {
    return 20 + ((u - 0.7) / 0.3) * 30;
  }
  const over = Math.min(u, 1.5) - 1.0;
  return 50 + (over / 0.5) * 50;
}

/**
 * Risk from team size sitting outside the safe and efficient band [MIN_SAFE_HEADCOUNT, MAX_EFFICIENT_HEADCOUNT].
 */
export function staffingRisk(headcount: number): number {
  if (headcount < MIN_SAFE_HEADCOUNT) {
    return Math.min(100, ((MIN_SAFE_HEADCOUNT - headcount) / MIN_SAFE_HEADCOUNT) * 100);
  }
  if (headcount > MAX_EFFICIENT_HEADCOUNT) {
    return Math.min(
      100,
      ((headcount - MAX_EFFICIENT_HEADCOUNT) / MAX_EFFICIENT_HEADCOUNT) * 100
    );
  }
  return 0;
}

/**
 * Combines risk components into one weighted 0-100 score, renormalizing across only
 * active/computed dimensions.
 */
export function combineRisk(breakdown: Partial<Record<string, number>>): number {
  const activeKeys = Object.keys(breakdown).filter(
    (k) => typeof breakdown[k] === "number" && RISK_DIMENSION_WEIGHTS[k] !== undefined
  );

  if (activeKeys.length === 0) {
    return 0;
  }

  const totalWeight = activeKeys.reduce(
    (sum, k) => sum + RISK_DIMENSION_WEIGHTS[k]!,
    0
  );

  const weightedSum = activeKeys.reduce((sum, k) => {
    const weight = RISK_DIMENSION_WEIGHTS[k]!;
    const score = breakdown[k]!;
    return sum + (weight / totalWeight) * score;
  }, 0);

  return Math.min(100, Math.max(0, weightedSum));
}

/**
 * Runs the deterministic simulation for a uniform constraint-based scenario.
 */
export function simulate(rawInputs: ScenarioInputs | any): SimulationResult {
  if (!rawInputs) {
    throw new InvalidScenarioError("Scenario inputs cannot be null or undefined");
  }

  const inputs = normalizeScenarioInputs(rawInputs);

  if (!inputs || !inputs.constraints || typeof inputs.constraints !== "object") {
    throw new InvalidScenarioError("Scenario inputs must have a constraints object");
  }

  // Extract active constraints (enabled: true)
  const allConstraintKeys = Object.keys(inputs.constraints) as ConstraintKey[];
  const activeConstraints = allConstraintKeys.filter(
    (k) => inputs.constraints[k]?.enabled === true
  );

  if (activeConstraints.length === 0) {
    throw new InvalidScenarioError("At least one constraint must be enabled");
  }

  // Validate values of active constraints
  for (const key of activeConstraints) {
    const setting = inputs.constraints[key];
    if (!setting || typeof setting.value !== "number" || !Number.isFinite(setting.value)) {
      throw new InvalidScenarioError(`Constraint '${key}' must have a finite numeric value`);
    }
    // Specific positive value checks for resourcing constraints
    if (["budget", "headcount", "deadlineWeeks", "scope"].includes(key) && setting.value <= 0) {
      throw new InvalidScenarioError(`${key} must be a positive number`);
    }
  }

  const computed: Partial<Record<string, number>> = {};
  const notComputed: string[] = [];

  const activeSet = new Set<string>(activeConstraints);

  // Helper to check prerequisite fulfillment
  function checkPrerequisites(outputKey: string): boolean {
    const required = OUTPUT_REQUIREMENTS[outputKey] || [];
    const missing = required.filter((r) => !activeSet.has(r));
    if (missing.length > 0) {
      notComputed.push(`${outputKey}: requires: ${missing.join(", ")}`);
      return false;
    }
    return true;
  }

  // 1. Core outputs
  const headcountVal = inputs.constraints.headcount?.value ?? 0;
  const scopeVal = inputs.constraints.scope?.value ?? 0;
  const budgetVal = inputs.constraints.budget?.value ?? 0;
  const deadlineVal = inputs.constraints.deadlineWeeks?.value ?? 0;

  if (checkPrerequisites("effectiveHeadcount")) {
    computed.effectiveHeadcount = effectiveHeadcount(headcountVal);
  }

  if (checkPrerequisites("estimatedTimeWeeks")) {
    computed.estimatedTimeWeeks = estimatedTimeWeeks(headcountVal, scopeVal);
  }

  if (checkPrerequisites("actualCost")) {
    const timeWeeks = computed.estimatedTimeWeeks ?? estimatedTimeWeeks(headcountVal, scopeVal);
    computed.actualCost = actualCost(headcountVal, timeWeeks);
  }

  if (checkPrerequisites("budgetUtilization")) {
    const cost = computed.actualCost ?? actualCost(headcountVal, estimatedTimeWeeks(headcountVal, scopeVal));
    computed.budgetUtilization = cost / budgetVal;
  }

  if (checkPrerequisites("scheduleUtilization")) {
    const timeWeeks = computed.estimatedTimeWeeks ?? estimatedTimeWeeks(headcountVal, scopeVal);
    computed.scheduleUtilization = timeWeeks / deadlineVal;
  }

  if (checkPrerequisites("staffingRisk")) {
    computed.staffingRisk = staffingRisk(headcountVal);
  }

  if (checkPrerequisites("scheduleRisk")) {
    const timeWeeks = computed.estimatedTimeWeeks ?? estimatedTimeWeeks(headcountVal, scopeVal);
    const util = computed.scheduleUtilization ?? timeWeeks / deadlineVal;
    computed.scheduleRisk = riskFromUtilization(util);
  }

  if (checkPrerequisites("budgetRisk")) {
    const cost = computed.actualCost ?? actualCost(headcountVal, estimatedTimeWeeks(headcountVal, scopeVal));
    const util = computed.budgetUtilization ?? cost / budgetVal;
    computed.budgetRisk = riskFromUtilization(util);
  }

  // 2. Extended risk outputs
  for (const extKey of Object.keys(EXTENDED_RISK_FORMULAS) as ExtendedConstraintKey[]) {
    const outputName = EXTENDED_OUTPUT_NAMES[extKey];
    if (checkPrerequisites(outputName)) {
      const setting = inputs.constraints[extKey]!;
      const formula = EXTENDED_RISK_FORMULAS[extKey];
      const riskVal = formula(setting.value);
      computed[outputName] = riskVal;

      // Canonical aliases
      if (extKey === "regulatoryComplexity") computed.complianceRisk = riskVal;
      if (extKey === "stakeholderCount") computed.approvalRisk = riskVal;
      if (extKey === "externalDependencyCount") computed.dependencyRisk = riskVal;
    }
  }

  // 3. Renormalize composite riskScore across only computed risk dimensions
  const computedRisks: Partial<Record<string, number>> = {};
  for (const riskKey of Object.keys(RISK_DIMENSION_WEIGHTS)) {
    if (typeof computed[riskKey] === "number") {
      computedRisks[riskKey] = computed[riskKey];
    }
  }

  const riskScore = combineRisk(computedRisks);
  const feasible = riskScore < FEASIBILITY_RISK_THRESHOLD;

  // 4. Backwards-compatible riskBreakdown
  const riskBreakdown: Partial<RiskBreakdown> = {};
  if (typeof computed.scheduleRisk === "number") riskBreakdown.scheduleRisk = computed.scheduleRisk;
  if (typeof computed.budgetRisk === "number") riskBreakdown.budgetRisk = computed.budgetRisk;
  if (typeof computed.staffingRisk === "number") riskBreakdown.staffingRisk = computed.staffingRisk;

  return {
    computed,
    notComputed,
    activeConstraints,
    riskScore,
    feasible,
    riskBreakdown,
    // Convenient getters for backward compatibility
    ...(typeof computed.estimatedTimeWeeks === "number" ? { estimatedTimeWeeks: computed.estimatedTimeWeeks } : {}),
    ...(typeof computed.effectiveHeadcount === "number" ? { effectiveHeadcount: computed.effectiveHeadcount } : {}),
    ...(typeof computed.actualCost === "number" ? { actualCost: computed.actualCost } : {}),
    ...(typeof computed.budgetUtilization === "number" ? { budgetUtilization: computed.budgetUtilization } : {}),
    ...(typeof computed.scheduleUtilization === "number" ? { scheduleUtilization: computed.scheduleUtilization } : {}),
  } as SimulationResult;
}
