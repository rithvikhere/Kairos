import type { ScenarioInputs } from "../domain/types.js";
import { DEFAULT_SCOPE_PERSON_WEEKS } from "../domain/constants.js";
import type { DeltaSpec, ScenarioIntentDelta } from "./types.js";

function applyFieldDelta(baseValue: number, spec: DeltaSpec): number {
  switch (spec.type) {
    case "absolute":
      return spec.value;
    case "percent":
      return baseValue * (1 + spec.value / 100);
    case "delta":
      return baseValue + spec.value;
  }
}

/**
 * Pure function that applies a structured delta specification onto baseline scenario inputs.
 *
 * Does NOT validate business rules (e.g. non-positive values) — downstream simulation
 * will handle validation via InvalidScenarioError.
 */
export function applyIntentDelta(
  baseline: ScenarioInputs,
  delta: ScenarioIntentDelta
): ScenarioInputs {
  const result: ScenarioInputs = { ...baseline };

  if (delta.budget !== undefined) {
    result.budget = applyFieldDelta(baseline.budget, delta.budget);
  }

  if (delta.headcount !== undefined) {
    result.headcount = applyFieldDelta(baseline.headcount, delta.headcount);
  }

  if (delta.deadlineWeeks !== undefined) {
    result.deadlineWeeks = applyFieldDelta(baseline.deadlineWeeks, delta.deadlineWeeks);
  }

  if (delta.scope !== undefined) {
    const baseScope = baseline.scope ?? DEFAULT_SCOPE_PERSON_WEEKS;
    result.scope = applyFieldDelta(baseScope, delta.scope);
  }

  return result;
}
