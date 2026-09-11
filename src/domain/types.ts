/**
 * Core domain types for the deterministic simulation engine.
 *
 * These types are intentionally free of any UI, database, or AI concerns —
 * Phase 1 is pure TypeScript math. Everything here should be serializable
 * to/from JSON without loss, since later phases (DB storage, diffing, API
 * responses) all round-trip through these shapes.
 */

/**
 * The levers a user can pull when defining a scenario.
 *
 * `scope` is optional because most scenarios compare different resourcing
 * choices against a *fixed* body of work. If omitted, it defaults to
 * DEFAULT_SCOPE_PERSON_WEEKS (see constants.ts) so callers don't have to
 * think about it until they actually want to model "the project got bigger
 * or smaller."
 */
export interface ScenarioInputs {
  /** Total budget available, in dollars. Must be > 0. */
  budget: number;
  /** Number of people on the team. Must be > 0. */
  headcount: number;
  /** Time allowed to deliver, in weeks. Must be > 0. */
  deadlineWeeks: number;
  /**
   * Total effort required to complete the work, in person-weeks.
   * Defaults to DEFAULT_SCOPE_PERSON_WEEKS if omitted.
   */
  scope?: number;
}

/** A ScenarioInputs with every optional field resolved to a concrete value. */
export type ResolvedScenarioInputs = Required<ScenarioInputs>;

/** Breakdown of the 0–100 risk score into its three contributing factors. */
export interface RiskBreakdown {
  /** Risk from the schedule being tight or blown, 0–100. */
  scheduleRisk: number;
  /** Risk from the budget being tight or blown, 0–100. */
  budgetRisk: number;
  /** Risk from the team being too small (key-person risk) or too large
   *  (coordination overhead), 0–100. */
  staffingRisk: number;
}

/**
 * The full, deterministic output of simulating one scenario.
 *
 * Every number here is traceable to a specific formula in simulation.ts —
 * nothing is invented or AI-generated. This is the "credibility layer":
 * later phases (Monte Carlo, AI explanation) build on top of this but never
 * replace it.
 */
export interface SimulationResult {
  /** Estimated calendar time to complete the scope, in weeks. */
  estimatedTimeWeeks: number;
  /** Headcount adjusted for coordination overhead (see teamEfficiency). */
  effectiveHeadcount: number;
  /** True cost required to deliver the scope with this headcount/time. */
  actualCost: number;
  /** actualCost / budget. 1.0 = exactly on budget, >1 = over budget. */
  budgetUtilization: number;
  /** estimatedTimeWeeks / deadlineWeeks. 1.0 = exactly on time, >1 = late. */
  scheduleUtilization: number;
  /** Composite risk score, 0 (safe) to 100 (very risky). */
  riskScore: number;
  /** The three components that were combined into riskScore. */
  riskBreakdown: RiskBreakdown;
  /** True if riskScore is below FEASIBILITY_RISK_THRESHOLD. */
  feasible: boolean;
}
