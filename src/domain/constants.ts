/**
 * All "magic numbers" used by the simulation core live here, each with a
 * one-line justification. If a stakeholder asks "why did the risk score
 * change from 40 to 65", the answer should always be traceable to a formula
 * in simulation.ts built from constants defined in this file — never a
 * black box.
 *
 * These are calibration defaults for a generic project. A real deployment
 * would likely make these configurable per organization; for Phase 1 they
 * are fixed so the math is easy to reason about and test.
 */

/** Effort required to complete "the project" when no scope is specified. */
export const DEFAULT_SCOPE_PERSON_WEEKS = 480;

/** Fully-loaded cost (salary + overhead) per person per week, in dollars. */
export const COST_PER_PERSON_WEEK = 2500;

/**
 * Team size at which coordination overhead is negligible. Below this size,
 * everyone can stay in sync with lightweight communication.
 */
export const BASE_TEAM_SIZE = 8;

/**
 * Fractional productivity loss per person added beyond BASE_TEAM_SIZE,
 * modeling Brooks's Law: communication paths grow faster than headcount,
 * so each additional person contributes a little less.
 */
export const COORDINATION_OVERHEAD_PER_PERSON = 0.015;

/** Floor on team efficiency — even a very large team still produces work. */
export const MIN_TEAM_EFFICIENCY = 0.05;

/** Below this headcount, losing one person is a single point of failure. */
export const MIN_SAFE_HEADCOUNT = 3;

/** Above this headcount, coordination overhead starts to dominate. */
export const MAX_EFFICIENT_HEADCOUNT = 15;

/**
 * Weights combining the three risk components into one score.
 * Must sum to 1.
 */
export const RISK_WEIGHTS = {
  schedule: 0.4,
  budget: 0.4,
  staffing: 0.2,
} as const;

/** riskScore below this value is considered "feasible". */
export const FEASIBILITY_RISK_THRESHOLD = 50;
