import type { ConstraintKey } from "./types.js";
import { EXTENDED_OUTPUT_REQUIREMENTS } from "./extendedRiskFormulas/index.js";

/**
 * Declares the required active constraints for each computable output metric.
 *
 * An output is computed ONLY when every constraint key in its requirement array
 * is present in inputs and has enabled: true.
 * If any prerequisite constraint is missing or disabled, the output is omitted
 * from SimulationResult.computed and placed into SimulationResult.notComputed
 * with an explanatory reason string.
 */
export const CORE_OUTPUT_REQUIREMENTS: Record<string, ConstraintKey[]> = {
  estimatedTimeWeeks: ["headcount", "scope"],
  effectiveHeadcount: ["headcount"],
  actualCost: ["headcount", "scope"],
  budgetUtilization: ["headcount", "scope", "budget"],
  scheduleUtilization: ["headcount", "scope", "deadlineWeeks"],
  scheduleRisk: ["headcount", "scope", "deadlineWeeks"],
  budgetRisk: ["headcount", "scope", "budget"],
  staffingRisk: ["headcount"],
};

export const OUTPUT_REQUIREMENTS: Record<string, ConstraintKey[]> = {
  ...CORE_OUTPUT_REQUIREMENTS,
  ...EXTENDED_OUTPUT_REQUIREMENTS,
  // Additional canonical aliases matching prompt naming conventions:
  complianceRisk: ["regulatoryComplexity"],
  approvalRisk: ["stakeholderCount"],
};
