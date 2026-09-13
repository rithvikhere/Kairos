import { DEFAULT_SCOPE_PERSON_WEEKS } from "../domain/constants.js";
import { normalizeScenarioInputs } from "../domain/simulation.js";
import type { ConstraintKey, ConstraintSetting, ScenarioInputs } from "../domain/types.js";
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
 * Pure function that applies a structured delta specification onto baseline scenario constraints.
 *
 * Supports both uniform constraint inputs and legacy flat scenario inputs.
 */
export function applyIntentDelta(
  baseline: ScenarioInputs | any,
  delta: ScenarioIntentDelta
): any {
  if (!baseline) {
    return { constraints: {} };
  }

  // Handle legacy flat ScenarioInputs (e.g. Phase 6 test fixtures)
  if (!baseline.constraints && (baseline.budget !== undefined || baseline.headcount !== undefined)) {
    const res: any = { ...baseline };
    for (const [key, spec] of Object.entries(delta)) {
      if (!spec) continue;
      const baseVal =
        baseline[key] ?? (key === "scope" ? DEFAULT_SCOPE_PERSON_WEEKS : 0);
      res[key] = applyFieldDelta(baseVal, spec as DeltaSpec);
    }
    return res;
  }

  // Uniform 15-constraint inputs
  const newConstraints: Partial<Record<ConstraintKey, ConstraintSetting>> = {};

  if (baseline && baseline.constraints) {
    for (const [k, setting] of Object.entries(baseline.constraints)) {
      if (setting) {
        newConstraints[k as ConstraintKey] = { ...(setting as any) };
      }
    }
  }

  for (const [key, spec] of Object.entries(delta) as Array<[ConstraintKey, DeltaSpec]>) {
    if (!spec) continue;

    const existing = newConstraints[key];
    const baseVal = existing
      ? existing.value
      : key === "scope"
      ? DEFAULT_SCOPE_PERSON_WEEKS
      : 0;
    const updatedVal = applyFieldDelta(baseVal, spec);

    newConstraints[key] = {
      enabled: true,
      value: updatedVal,
    };
  }

  const result: any = { constraints: newConstraints };
  if (newConstraints.budget?.enabled) result.budget = newConstraints.budget.value;
  if (newConstraints.headcount?.enabled) result.headcount = newConstraints.headcount.value;
  if (newConstraints.deadlineWeeks?.enabled) result.deadlineWeeks = newConstraints.deadlineWeeks.value;
  if (newConstraints.scope?.enabled) result.scope = newConstraints.scope.value;

  return result;
}
