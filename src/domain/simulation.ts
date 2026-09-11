/**
 * Deterministic simulation core.
 *
 * Every exported function here is pure: same inputs always produce the same
 * outputs, no I/O, no randomness, no AI. This is Phase 1 of the platform —
 * it has to be rock solid before Monte Carlo variance (Phase 2), the AI
 * explanation layer (Phase 6), or anything else builds on top of it.
 *
 * Model in one sentence: given a fixed amount of work (`scope`, in
 * person-weeks), figure out how long it actually takes and what it actually
 * costs to deliver with a given `headcount`, then score how risky that is
 * against the `budget` and `deadlineWeeks` the user asked for.
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
  RISK_WEIGHTS,
} from "./constants.js";
import type {
  ResolvedScenarioInputs,
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
 * Validates raw inputs and fills in defaults. Every other function in this
 * module assumes it has already been called — keeping validation in one
 * place means every downstream formula can assume well-formed numbers.
 */
export function resolveInputs(inputs: ScenarioInputs): ResolvedScenarioInputs {
  const { budget, headcount, deadlineWeeks } = inputs;
  const scope = inputs.scope ?? DEFAULT_SCOPE_PERSON_WEEKS;

  const checks: Array<[boolean, string]> = [
    [Number.isFinite(budget) && budget > 0, "budget must be a positive number"],
    [Number.isFinite(headcount) && headcount > 0, "headcount must be a positive number"],
    [
      Number.isFinite(deadlineWeeks) && deadlineWeeks > 0,
      "deadlineWeeks must be a positive number",
    ],
    [Number.isFinite(scope) && scope > 0, "scope must be a positive number"],
  ];

  for (const [valid, message] of checks) {
    if (!valid) throw new InvalidScenarioError(message);
  }

  return { budget, headcount, deadlineWeeks, scope };
}

/**
 * Productivity multiplier for a team of this size, modeling Brooks's Law.
 *
 * - At or below BASE_TEAM_SIZE, efficiency is 1.0 (no overhead).
 * - Above BASE_TEAM_SIZE, each additional person adds communication
 *   overhead, so the team's *average* per-person efficiency declines
 *   linearly.
 * - Efficiency never drops below MIN_TEAM_EFFICIENCY — a very large team is
 *   inefficient, not literally zero-output.
 *
 * Returns a value in [MIN_TEAM_EFFICIENCY, 1].
 */
export function teamEfficiency(headcount: number): number {
  const overSize = Math.max(0, headcount - BASE_TEAM_SIZE);
  const raw = 1 - overSize * COORDINATION_OVERHEAD_PER_PERSON;
  return Math.min(1, Math.max(MIN_TEAM_EFFICIENCY, raw));
}

/**
 * Headcount adjusted for coordination overhead. Because teamEfficiency
 * declines with size, effectiveHeadcount is NOT monotonically increasing in
 * headcount: past a certain team size, adding more people can actually
 * reduce total effective throughput (the classic "Mythical Man-Month"
 * effect). That crossover point is a direct, intentional consequence of the
 * constants above, and is covered by a unit test.
 */
export function effectiveHeadcount(headcount: number): number {
  return headcount * teamEfficiency(headcount);
}

/**
 * How many weeks it actually takes to deliver `scope` person-weeks of work
 * with this headcount, after accounting for coordination overhead.
 */
export function estimatedTimeWeeks(headcount: number, scope: number): number {
  return scope / effectiveHeadcount(headcount);
}

/**
 * The true cost of delivering the scope with this headcount, independent of
 * whatever budget the user proposed. This is headcount × time actually
 * spent × loaded cost per person-week — i.e. what it really costs to run
 * this team for as long as the work takes.
 */
export function actualCost(headcount: number, timeWeeks: number): number {
  return headcount * timeWeeks * COST_PER_PERSON_WEEK;
}

/**
 * Maps a "utilization" ratio (actual / allowed) to a 0–100 risk
 * contribution using a piecewise curve:
 *
 *   u <= 0.7        : 0  to 20   (comfortable margin)
 *   0.7 < u <= 1.0   : 20 to 50   (tightening, but still on plan)
 *   u > 1.0          : 50 to 100  (over budget / over deadline, risk climbs
 *                                  steeply and caps at 100 for u >= 1.5)
 *
 * This is shared by both schedule and budget risk so that "10% over
 * deadline" and "10% over budget" are scored on the same scale.
 */
export function riskFromUtilization(utilization: number): number {
  const u = Math.max(0, utilization);

  if (u <= 0.7) {
    return (u / 0.7) * 20;
  }
  if (u <= 1.0) {
    return 20 + ((u - 0.7) / 0.3) * 30;
  }
  // u > 1.0: climbs from 50 to 100 as u goes from 1.0 to 1.5, then caps.
  const over = Math.min(u, 1.5) - 1.0;
  return 50 + (over / 0.5) * 50;
}

/**
 * Risk from team size sitting outside the "safe and efficient" band
 * [MIN_SAFE_HEADCOUNT, MAX_EFFICIENT_HEADCOUNT]:
 *
 * - Too few people: key-person / bus-factor risk, worse as headcount → 0.
 * - Too many people: coordination risk (separate from, and in addition to,
 *   the throughput loss already captured in effectiveHeadcount).
 * - Inside the band: 0 risk.
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

/** Combines the three risk components into one weighted 0–100 score. */
export function combineRisk(breakdown: RiskBreakdown): number {
  const score =
    breakdown.scheduleRisk * RISK_WEIGHTS.schedule +
    breakdown.budgetRisk * RISK_WEIGHTS.budget +
    breakdown.staffingRisk * RISK_WEIGHTS.staffing;
  return Math.min(100, Math.max(0, score));
}

/**
 * Runs the full deterministic simulation for one scenario.
 *
 * This is the single entry point later phases (Monte Carlo, API routes,
 * diff engine) should call — everything else in this file is a building
 * block for this function.
 */
export function simulate(inputs: ScenarioInputs): SimulationResult {
  const resolved = resolveInputs(inputs);
  const { budget, headcount, deadlineWeeks, scope } = resolved;

  const timeWeeks = estimatedTimeWeeks(headcount, scope);
  const cost = actualCost(headcount, timeWeeks);

  const budgetUtilization = cost / budget;
  const scheduleUtilization = timeWeeks / deadlineWeeks;

  const riskBreakdown: RiskBreakdown = {
    scheduleRisk: riskFromUtilization(scheduleUtilization),
    budgetRisk: riskFromUtilization(budgetUtilization),
    staffingRisk: staffingRisk(headcount),
  };

  const riskScore = combineRisk(riskBreakdown);

  return {
    estimatedTimeWeeks: timeWeeks,
    effectiveHeadcount: effectiveHeadcount(headcount),
    actualCost: cost,
    budgetUtilization,
    scheduleUtilization,
    riskScore,
    riskBreakdown,
    feasible: riskScore < FEASIBILITY_RISK_THRESHOLD,
  };
}
