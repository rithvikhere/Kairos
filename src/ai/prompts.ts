import type { ScenarioInputs } from "../domain/types.js";
import type { ScenarioDiff } from "../domain/diff.js";

/**
 * JSON Schema for Structured Outputs (OpenAI / Anthropic tool use).
 */
export const SCENARIO_INTENT_DELTA_SCHEMA = {
  type: "object",
  properties: {
    budget: {
      type: ["object", "null"],
      description: "Modification to total budget",
      properties: {
        type: {
          type: "string",
          enum: ["absolute", "percent", "delta"],
          description: "absolute replaces value, percent scales baseline by (1 + value/100), delta adds value directly",
        },
        value: {
          type: "number",
          description: "Numeric delta value (e.g. -20 for 20% cut, 50000 for $50k increase)",
        },
      },
      required: ["type", "value"],
      additionalProperties: false,
    },
    headcount: {
      type: ["object", "null"],
      description: "Modification to team headcount",
      properties: {
        type: {
          type: "string",
          enum: ["absolute", "percent", "delta"],
        },
        value: {
          type: "number",
        },
      },
      required: ["type", "value"],
      additionalProperties: false,
    },
    deadlineWeeks: {
      type: ["object", "null"],
      description: "Modification to timeline/deadline in weeks",
      properties: {
        type: {
          type: "string",
          enum: ["absolute", "percent", "delta"],
        },
        value: {
          type: "number",
        },
      },
      required: ["type", "value"],
      additionalProperties: false,
    },
    scope: {
      type: ["object", "null"],
      description: "Modification to project scope in person-weeks",
      properties: {
        type: {
          type: "string",
          enum: ["absolute", "percent", "delta"],
        },
        value: {
          type: "number",
        },
      },
      required: ["type", "value"],
      additionalProperties: false,
    },
  },
  required: ["budget", "headcount", "deadlineWeeks", "scope"],
  additionalProperties: false,
};

export const INTENT_PARSING_SYSTEM_PROMPT = `You are a precision natural-language parser for project scenario parameters.
Extract the user's intended modifications to baseline scenario inputs.

SUPPORTED FIELDS:
- budget (total dollars)
- headcount (number of team members)
- deadlineWeeks (project duration / deadline in weeks)
- scope (total effort in person-weeks)

DELTA TYPES:
- "absolute": Use when an exact target number is given (e.g., "set budget to 500k" -> type: "absolute", value: 500000).
- "percent": Use when a relative percentage change is specified (e.g., "cut budget by 20%" -> type: "percent", value: -20; "increase headcount by 10%" -> type: "percent", value: 10).
- "delta": Use when an addition or subtraction of units is specified (e.g., "add 2 people" -> type: "delta", value: 2; "push deadline back 4 weeks" -> type: "delta", value: 4; "reduce timeline by 3 weeks" -> type: "delta", value: -3).

MULTI-FIELD EXTRACTION:
Multi-field extraction is the PRIMARY case. A sentence naming multiple changes (e.g., "cut budget 20%, add 2 people, push deadline back 4 weeks") MUST populate every mentioned field in one response.
Fields not mentioned in the user's intent should be null.
Do NOT invent fields or values not requested by the user.`;

export function buildIntentParsingUserPrompt(
  freeText: string,
  baselineInputs: ScenarioInputs
): string {
  return `Baseline scenario inputs:
- budget: ${baselineInputs.budget}
- headcount: ${baselineInputs.headcount}
- deadlineWeeks: ${baselineInputs.deadlineWeeks}
- scope: ${baselineInputs.scope ?? "default"}

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

  let prompt = `Scenario Diff Details:
Comparing Scenario ${diff.scenarioAId} -> Scenario ${diff.scenarioBId}

INPUT DELTAS:
- budget: from ${inputs.budget.from} to ${inputs.budget.to} (delta: ${inputs.budget.delta}, percentChange: ${inputs.budget.percentChange}%, direction: ${inputs.budget.direction})
- headcount: from ${inputs.headcount.from} to ${inputs.headcount.to} (delta: ${inputs.headcount.delta}, percentChange: ${inputs.headcount.percentChange}%, direction: ${inputs.headcount.direction})
- deadlineWeeks: from ${inputs.deadlineWeeks.from} to ${inputs.deadlineWeeks.to} (delta: ${inputs.deadlineWeeks.delta}, percentChange: ${inputs.deadlineWeeks.percentChange}%, direction: ${inputs.deadlineWeeks.direction})
- scope: from ${inputs.scope.from} to ${inputs.scope.to} (delta: ${inputs.scope.delta}, percentChange: ${inputs.scope.percentChange}%, direction: ${inputs.scope.direction})

OUTPUT DELTAS:
- estimatedTimeWeeks: from ${outputs.estimatedTimeWeeks.from} to ${outputs.estimatedTimeWeeks.to} (delta: ${outputs.estimatedTimeWeeks.delta})
- effectiveHeadcount: from ${outputs.effectiveHeadcount.from} to ${outputs.effectiveHeadcount.to} (delta: ${outputs.effectiveHeadcount.delta})
- actualCost: from ${outputs.actualCost.from} to ${outputs.actualCost.to} (delta: ${outputs.actualCost.delta})
- budgetUtilization: from ${outputs.budgetUtilization.from} to ${outputs.budgetUtilization.to} (delta: ${outputs.budgetUtilization.delta})
- scheduleUtilization: from ${outputs.scheduleUtilization.from} to ${outputs.scheduleUtilization.to} (delta: ${outputs.scheduleUtilization.delta})
- riskScore: from ${outputs.riskScore.from} to ${outputs.riskScore.to} (delta: ${outputs.riskScore.delta}, direction: ${outputs.riskScore.direction})
- riskBreakdown:
  * scheduleRisk: from ${outputs.riskBreakdown.scheduleRisk.from} to ${outputs.riskBreakdown.scheduleRisk.to}
  * budgetRisk: from ${outputs.riskBreakdown.budgetRisk.from} to ${outputs.riskBreakdown.budgetRisk.to}
  * staffingRisk: from ${outputs.riskBreakdown.staffingRisk.from} to ${outputs.riskBreakdown.staffingRisk.to}
- feasible: from ${outputs.feasible.from} to ${outputs.feasible.to} (changed: ${outputs.feasible.changed})
`;

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
