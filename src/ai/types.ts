import type { ConstraintKey, ScenarioInputs } from "../domain/types.js";

/**
 * Specification for how to modify a single input field or constraint.
 */
export interface DeltaSpec {
  type: "absolute" | "percent" | "delta";
  value: number;
}

/**
 * Structured delta extracted from natural-language scenario intent,
 * now supporting any of the 15 uniform constraints.
 */
export type ScenarioIntentDelta = Partial<Record<ConstraintKey, DeltaSpec>>;

/**
 * Result of parsing natural-language scenario intent against baseline inputs.
 */
export interface ParsedIntentResult {
  delta: ScenarioIntentDelta;
  resolvedInputs: ScenarioInputs;
  rawModelResponse: string; // kept for audit, never shown as a "result"
}

/**
 * Result of bounded diff explanation.
 */
export interface DiffExplanation {
  explanation: string;
  source: "ai" | "template-fallback";
}
