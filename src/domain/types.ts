/**
 * Core domain types for Phase 8's uniform 15-constraint simulation model.
 *
 * This replaces the previous fixed 4-field ScenarioInputs (budget, headcount,
 * deadlineWeeks, scope) with a uniform 15-key, all-optional constraint dictionary.
 */

/**
 * The 15 uniform constraint keys supported by Kairos.
 *
 * Core Resourcing:
 * - headcount: team headcount (people)
 * - budget: total project budget ($)
 * - deadlineWeeks: target delivery timeline (weeks)
 * - scope: estimated total work (person-weeks)
 *
 * Team Factors:
 * - teamSeniorityMix: fraction of team that is senior (0.0–1.0)
 * - attritionRisk: expected attrition rate over project (0.0–1.0)
 * - teamFamiliarity: fraction of team familiar with tech/domain (0.0–1.0)
 *
 * External Factors:
 * - externalDependencyCount: number of external system/vendor dependencies
 * - vendorLeadTimeWeeks: procurement lead time in weeks
 * - regulatoryComplexity: subjective compliance bar (0–10)
 *
 * Process Factors:
 * - technicalDebtLevel: code/system debt severity (0–10)
 * - scopeVolatility: expected requirements volatility percentage (0–100%)
 * - distributedTeamOverhead: number of distinct physical/geographic sites (>= 1)
 * - qualityRigor: required testing and validation bar (0–10)
 * - stakeholderCount: count of distinct sign-off stakeholder groups
 */
export type ConstraintKey =
  | "headcount"
  | "budget"
  | "deadlineWeeks"
  | "scope"
  | "teamSeniorityMix"
  | "attritionRisk"
  | "externalDependencyCount"
  | "technicalDebtLevel"
  | "scopeVolatility"
  | "distributedTeamOverhead"
  | "vendorLeadTimeWeeks"
  | "regulatoryComplexity"
  | "qualityRigor"
  | "stakeholderCount"
  | "teamFamiliarity";

/**
 * Individual constraint configuration.
 */
export interface ConstraintSetting {
  /** Whether this constraint is active for simulation evaluation. */
  enabled: boolean;
  /** Concrete scalar numeric value for the constraint. */
  value: number;
}

/**
 * Uniform inputs for deterministic simulation: an all-optional dictionary of constraints.
 */
export interface ScenarioInputs {
  constraints: Partial<Record<ConstraintKey, ConstraintSetting>>;
}

/**
 * Optional breakdown of the original 3 risk factors for backwards-compatible display.
 */
export interface RiskBreakdown {
  scheduleRisk?: number;
  budgetRisk?: number;
  staffingRisk?: number;
  [key: string]: number | undefined;
}

/**
 * The full deterministic simulation result.
 *
 * Every output declares its own prerequisite constraints. If any prerequisite is
 * missing or disabled, the output is recorded in `notComputed` with a reason string.
 * All computed outputs (including cost, schedule, utilizations, and all active risk
 * dimensions) live in `computed`.
 *
 * `riskScore` is a renormalized blend across only the computed risk dimensions.
 * `feasible` is preserved (`riskScore < FEASIBILITY_RISK_THRESHOLD`).
 */
export interface SimulationResult {
  /** Map of output names to computed numeric values. */
  computed: Partial<Record<string, number>>;
  /** List of output names that were omitted due to missing constraints, with reasons. */
  notComputed: string[];
  /** The set of constraints that were active (enabled: true) for this simulation. */
  activeConstraints: ConstraintKey[];
  /** Composite risk score (0-100) renormalized across only computed risk dimensions. */
  riskScore: number;
  /** True if riskScore < FEASIBILITY_RISK_THRESHOLD (50). */
  feasible: boolean;
  /** Backwards-compatible view of the core risk dimensions if computed. */
  riskBreakdown?: Partial<RiskBreakdown>;
  /** Backwards-compatible optional accessors for core outputs if computed. */
  estimatedTimeWeeks?: number;
  effectiveHeadcount?: number;
  actualCost?: number;
  budgetUtilization?: number;
  scheduleUtilization?: number;
}
