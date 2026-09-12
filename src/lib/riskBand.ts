/**
 * Pure client-side risk band derivation utility.
 *
 * Notice: This abstraction is entirely client-side; the backend SimulationResult
 * only provides a continuous riskScore [0-100] and boolean feasible indicator.
 *
 * THRESHOLD ALIGNMENT:
 * These thresholds are deliberately chosen to align with the domain core's
 * FEASIBILITY_RISK_THRESHOLD = 50 (from src/domain/constants.ts) rather than
 * arbitrary geometric quartiles:
 * - riskScore < 25              -> "low"
 * - 25 <= riskScore < 50        -> "moderate" (still feasible, per threshold)
 * - 50 <= riskScore < 75        -> "high"     (infeasible zone begins here)
 * - riskScore >= 75, OR !feasible -> "critical"
 *
 * Note: While !feasible is technically redundant with riskScore >= 50 given
 * FEASIBILITY_RISK_THRESHOLD = 50, we explicitly check feasible anyway so this
 * logic remains sound if FEASIBILITY_RISK_THRESHOLD is ever recalibrated.
 */

export type RiskBand = "low" | "moderate" | "high" | "critical";

export function getRiskBand(riskScore: number, feasible: boolean): RiskBand {
  if (riskScore >= 75) {
    return "critical";
  }

  if (riskScore >= 50) {
    return "high";
  }

  if (!feasible) {
    return "critical";
  }

  if (riskScore >= 25) {
    return "moderate";
  }

  return "low";
}
