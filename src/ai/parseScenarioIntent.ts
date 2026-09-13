import { z } from "zod";
import type { ConstraintKey, ScenarioInputs } from "../domain/types.js";
import type { ScenarioIntentDelta } from "./types.js";
import { _aiConnectorComplete } from "./client.js";
import {
  ALL_15_CONSTRAINT_KEYS,
  INTENT_PARSING_SYSTEM_PROMPT,
  SCENARIO_INTENT_DELTA_SCHEMA,
  buildIntentParsingUserPrompt,
} from "./prompts.js";

const DeltaSpecSchema = z.object({
  type: z.enum(["absolute", "percent", "delta"]),
  value: z.number(),
});

const shape: Record<string, z.ZodTypeAny> = {};
for (const key of ALL_15_CONSTRAINT_KEYS) {
  shape[key] = DeltaSpecSchema.nullable().optional();
}
const RawIntentDeltaSchema = z.object(shape).strict();

/**
 * Parses natural language into a structured ScenarioIntentDelta across 15 constraints.
 */
export async function parseScenarioIntent(
  freeText: string,
  baselineInputs: ScenarioInputs
): Promise<ScenarioIntentDelta> {
  const rawResponse = await _aiConnectorComplete({
    task: "intentParsing",
    systemPrompt: INTENT_PARSING_SYSTEM_PROMPT,
    userPrompt: buildIntentParsingUserPrompt(freeText, baselineInputs),
    jsonSchema: SCENARIO_INTENT_DELTA_SCHEMA,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch (err) {
    throw new Error(
      `Failed to parse model response as JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const result = RawIntentDeltaSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `AI response does not match expected ScenarioIntentDelta shape: ${result.error.message}`
    );
  }

  const delta: ScenarioIntentDelta = {};
  for (const [k, v] of Object.entries(result.data)) {
    if (v && ALL_15_CONSTRAINT_KEYS.includes(k as ConstraintKey)) {
      delta[k as ConstraintKey] = v;
    }
  }

  return delta;
}
