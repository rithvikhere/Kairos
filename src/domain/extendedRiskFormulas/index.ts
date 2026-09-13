/**
 * Wires the 11 placeholder risk formulas (formulas.ts) into the
 * ConstraintKey-keyed lookup that Phase 8's simulate() rewrite and
 * outputRequirements.ts need. Import EXTENDED_RISK_FORMULAS and
 * EXTENDED_OUTPUT_REQUIREMENTS from here — do not import formulas.ts's
 * individual functions directly from simulation.ts, keep this file as the
 * single point of wiring so the mapping from constraint -> formula ->
 * output-name stays in one place.
 */

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
} from "./formulas.js";

export * from "./formulas.js";

/**
 * The 11 new constraint keys, matching Phase 8's ConstraintKey union minus
 * the original 4 core resourcing fields (headcount/budget/deadlineWeeks/
 * scope), which keep their existing Phase 1 formulas untouched.
 */
export type ExtendedConstraintKey =
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
 * The output name each formula produces, to slot directly into
 * SimulationResult.computed / OUTPUT_REQUIREMENTS. Naming follows the
 * "<Dimension>Risk" convention already used by the original three
 * (scheduleRisk, budgetRisk, staffingRisk) rather than the source spec's
 * inconsistent "<Dimension>RiskScore" naming — see the Phase 8 master
 * prompt's field-name correction note.
 */
export const EXTENDED_OUTPUT_NAMES: Record<ExtendedConstraintKey, string> = {
  teamSeniorityMix: "teamSeniorityMixRisk",
  attritionRisk: "attritionRisk",
  externalDependencyCount: "dependencyRisk",
  technicalDebtLevel: "technicalDebtRisk",
  scopeVolatility: "scopeVolatilityRisk",
  distributedTeamOverhead: "distributedTeamOverheadRisk",
  vendorLeadTimeWeeks: "vendorLeadTimeRisk",
  regulatoryComplexity: "regulatoryComplexityRisk",
  qualityRigor: "qualityRigorRisk",
  stakeholderCount: "stakeholderCountRisk",
  teamFamiliarity: "teamFamiliarityRisk",
};

/**
 * Each constraint's OUTPUT_REQUIREMENTS entry: every one of these 11 only
 * needs its OWN constraint enabled (unlike e.g. scheduleRisk, which needs
 * three core fields at once) — that's a real, defensible difference, not
 * an oversight: these are single-factor risk dimensions by construction,
 * while the original three are genuinely cross-cutting.
 */
export const EXTENDED_OUTPUT_REQUIREMENTS: Record<string, ExtendedConstraintKey[]> = {
  teamSeniorityMixRisk: ["teamSeniorityMix"],
  attritionRisk: ["attritionRisk"],
  dependencyRisk: ["externalDependencyCount"],
  technicalDebtRisk: ["technicalDebtLevel"],
  scopeVolatilityRisk: ["scopeVolatility"],
  distributedTeamOverheadRisk: ["distributedTeamOverhead"],
  vendorLeadTimeRisk: ["vendorLeadTimeWeeks"],
  regulatoryComplexityRisk: ["regulatoryComplexity"],
  qualityRigorRisk: ["qualityRigor"],
  stakeholderCountRisk: ["stakeholderCount"],
  teamFamiliarityRisk: ["teamFamiliarity"],
};

/**
 * The actual constraint-value -> 0-100 risk-score function per key. Each
 * function's expected value domain is documented in formulas.ts's JSDoc —
 * READ THOSE before passing in a raw ConstraintSetting.value, since the
 * domains differ per constraint (some are 0.0-1.0 fractions, some are
 * 0-10 subjective ratings, some are raw counts/weeks).
 */
export const EXTENDED_RISK_FORMULAS: Record<ExtendedConstraintKey, (value: number) => number> = {
  teamSeniorityMix: teamSeniorityMixRisk,
  attritionRisk: attritionRisk,
  externalDependencyCount: dependencyRisk,
  technicalDebtLevel: technicalDebtRisk,
  scopeVolatility: scopeVolatilityRisk,
  distributedTeamOverhead: distributedTeamOverheadRisk,
  vendorLeadTimeWeeks: vendorLeadTimeRisk,
  regulatoryComplexity: regulatoryComplexityRisk,
  qualityRigor: qualityRigorRisk,
  stakeholderCount: stakeholderCountRisk,
  teamFamiliarity: teamFamiliarityRisk,
};
