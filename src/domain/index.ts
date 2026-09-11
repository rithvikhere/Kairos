/**
 * Public domain API for the Decision Simulation & Scenario Intelligence Platform.
 *
 * Re-exports both the deterministic core (Phase 1) and the probabilistic Monte Carlo
 * sampling layer (Phase 2).
 */

// Phase 1 — Constants & Calibration
export {
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

// Phase 1 — Domain Types
export type {
  ResolvedScenarioInputs,
  RiskBreakdown,
  ScenarioInputs,
  SimulationResult,
} from "./types.js";

// Phase 1 — Deterministic Simulation Engine
export {
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
} from "./simulation.js";

// Phase 2 — Monte Carlo Layer
export {
  mulberry32,
  normalizeDistribution,
  normalizeUncertainInputs,
  runMonteCarloSimulation,
  sampleDistribution,
  sampleNormal,
  sampleScenarioInputs,
  summarizeDistribution,
} from "./monteCarlo.js";

export type {
  Distribution,
  DistributionSummary,
  MetricDistributionSummary,
  MonteCarloOptions,
  MonteCarloResult,
  NormalizedUncertainScenarioInputs,
  UncertainScenarioInputs,
} from "./monteCarlo.js";
