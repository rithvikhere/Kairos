import type { ConstraintKey, ScenarioInputs } from "../domain/types.js";
import type { ScenarioDiff } from "../domain/diff.js";

const DELTA_PROPERTY_SCHEMA = {
  type: ["object", "null"],
  properties: {
    type: {
      type: "string",
      enum: ["absolute", "percent", "delta"],
      description:
        "absolute replaces value, percent scales baseline by (1 + value/100), delta adds value directly",
    },
    value: {
      type: "number",
      description: "Numeric delta value (e.g. -20 for 20% cut, 50000 for $50k increase)",
    },
  },
  required: ["type", "value"],
  additionalProperties: false,
};

export const ALL_15_CONSTRAINT_KEYS: ConstraintKey[] = [
  "headcount",
  "budget",
  "deadlineWeeks",
  "scope",
  "teamSeniorityMix",
  "attritionRisk",
  "externalDependencyCount",
  "technicalDebtLevel",
  "scopeVolatility",
  "distributedTeamOverhead",
  "vendorLeadTimeWeeks",
  "regulatoryComplexity",
  "qualityRigor",
  "stakeholderCount",
  "teamFamiliarity",
];

/**
 * JSON Schema for Structured Outputs (OpenAI / Anthropic tool use) across all 15 constraints.
 */
export const SCENARIO_INTENT_DELTA_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(
    ALL_15_CONSTRAINT_KEYS.map((k) => [k, DELTA_PROPERTY_SCHEMA])
  ),
  additionalProperties: false,
};

export const INTENT_PARSING_SYSTEM_PROMPT = `You are a precision natural-language parser for project scenario parameters.
Extract the user's intended modifications to baseline scenario inputs.

SUPPORTED CONSTRAINTS (15 uniform levers):
- headcount: number of team members
- budget: total project budget in dollars
- deadlineWeeks: delivery timeline in weeks
- scope: total effort in person-weeks
- teamSeniorityMix: senior ratio (0.0 to 1.0)
- attritionRisk: expected project turnover rate (0.0 to 1.0)
- externalDependencyCount: count of external dependencies
- technicalDebtLevel: technical debt severity rating (0 to 10)
- scopeVolatility: requirements change percentage (0 to 100%)
- distributedTeamOverhead: distinct physical/geographic team sites (>= 1)
- vendorLeadTimeWeeks: vendor delivery lead time in weeks
- regulatoryComplexity: regulatory compliance bar (0 to 10)
- qualityRigor: testing bar (0 to 10)
- stakeholderCount: number of distinct approval stakeholder groups
- teamFamiliarity: team domain/technology familiarity ratio (0.0 to 1.0)

DELTA TYPES:
- "absolute": Use when an exact target number is given (e.g., "set budget to 500k" -> type: "absolute", value: 500000).
- "percent": Use when a relative percentage change is specified (e.g., "cut budget by 20%" -> type: "percent", value: -20; "increase headcount by 10%" -> type: "percent", value: 10).
- "delta": Use when an addition or subtraction of units is specified (e.g., "add 2 people" -> type: "delta", value: 2; "push deadline back 4 weeks" -> type: "delta", value: 4).

MULTI-FIELD EXTRACTION:
Multi-field extraction is the PRIMARY case. Populated every mentioned field in one response.
Fields not mentioned in the user's intent should be null.
Do NOT invent fields or values not requested by the user.`;

export function buildIntentParsingUserPrompt(
  freeText: string,
  baselineInputs: ScenarioInputs
): string {
  const constraints = baselineInputs.constraints || {};
  const activeEntries = Object.entries(constraints)
    .filter(([_, s]) => s?.enabled)
    .map(([k, s]) => `- ${k}: ${s!.value}`)
    .join("\n");

  return `Baseline scenario inputs:
${activeEntries || "(No constraints currently active)"}

User request:
"${freeText}"

Extract all intended modifications into the structured delta.`;
}

export const DIFF_EXPLANATION_SYSTEM_PROMPT = `You are an expert scenario diff analyst. You summarize computed diff results between two project scenarios into a clear, concise, plain-English explanation.

MANDATORY RULES:
1. Ground your explanation ENTIRELY in the numbers and metrics provided in the prompt. Do not invent, assume, or extrapolate any numbers or external project context.
2. Cite the exact numeric values given for from/to, deltas, and risk impacts. Never round, approximate, or invent numbers.
3. You MUST reference EVERY row in the attribution list at least once, in the exact order listed (largest |isolatedRiskContribution| first). Never trim to "just the important ones".
4. You MUST state this sentence verbatim:
"These per-field contributions do NOT sum to the total risk change — do not claim they do, and do not imply the risk change can be fully decomposed into independent causes"`;

export function buildDiffExplanationUserPrompt(diff: ScenarioDiff): string {
  const inputs = diff.inputDiff;
  const outputs = diff.outputDiff;

  const inputLines = Object.entries(inputs)
    .filter((entry): entry is [string, NonNullable<typeof entry[1]>] => Boolean(entry[1]))
    .map(
      ([key, delta]) =>
        `- ${key}: from ${delta.from} to ${delta.to} (delta: ${delta.delta}, percentChange: ${delta.percentChange}%, direction: ${delta.direction})`
    )
    .join("\n");

  const outputLines = Object.entries(outputs)
    .filter(
      (entry): entry is [string, NonNullable<typeof entry[1]>] =>
        entry[0] !== "feasible" && entry[0] !== "riskBreakdown" && Boolean(entry[1])
    )
    .map(
      ([key, delta]) =>
        `- ${key}: from ${(delta as any).from} to ${(delta as any).to} (delta: ${(delta as any).delta})`
    )
    .join("\n");

  let prompt = `Scenario Diff Details:
Comparing Scenario ${diff.scenarioAId} -> Scenario ${diff.scenarioBId}

INPUT DELTAS:
${inputLines || "(No shared inputs changed)"}

OUTPUT DELTAS:
${outputLines}
`;

  if (outputs.feasible) {
    prompt += `- feasible: from ${outputs.feasible.from} to ${outputs.feasible.to} (changed: ${outputs.feasible.changed})\n`;
  }

  if (diff.onlyInA && diff.onlyInA.length > 0) {
    prompt += `\nONLY IN SCENARIO A: ${diff.onlyInA.join(", ")}\n`;
  }
  if (diff.onlyInB && diff.onlyInB.length > 0) {
    prompt += `\nONLY IN SCENARIO B: ${diff.onlyInB.join(", ")}\n`;
  }

  if (diff.monteCarloDiff) {
    const mc = diff.monteCarloDiff;
    prompt += `
MONTE CARLO DELTAS:
- probabilityOnTime: from ${mc.probabilityOnTime.from} to ${mc.probabilityOnTime.to}
- probabilityWithinBudget: from ${mc.probabilityWithinBudget.from} to ${mc.probabilityWithinBudget.to}
- feasibleRate: from ${mc.feasibleRate.from} to ${mc.feasibleRate.to}
`;
  }

  prompt += `
ATTRIBUTION (in descending order of isolated risk contribution magnitude):
`;

  if (diff.attribution.length === 0) {
    prompt += "(No input levers were changed)\n";
  } else {
    for (const attr of diff.attribution) {
      prompt += `- field: ${attr.field}, isolatedRiskScore: ${attr.isolatedRiskScore}, isolatedRiskContribution: ${attr.isolatedRiskContribution}\n`;
    }
  }

  prompt += `
Summarize these results in a concise plain-English explanation following all rules.`;

  return prompt;
}
