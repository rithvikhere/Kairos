import { z } from "zod";
import type { ScenarioInputs } from "../domain/types.js";
import type { ScenarioIntentDelta } from "./types.js";
import { _aiConnectorComplete } from "./client.js";
import {
  INTENT_PARSING_SYSTEM_PROMPT,
  SCENARIO_INTENT_DELTA_SCHEMA,
  buildIntentParsingUserPrompt,
} from "./prompts.js";

const DeltaSpecSchema = z.object({
  type: z.enum(["absolute", "percent", "delta"]),
  value: z.number(),
});

const RawIntentDeltaSchema = z
  .object({
    budget: DeltaSpecSchema.nullable().optional(),
    headcount: DeltaSpecSchema.nullable().optional(),
    deadlineWeeks: DeltaSpecSchema.nullable().optional(),
    scope: DeltaSpecSchema.nullable().optional(),
  })
  .strict();

/**
 * Parses natural language into a structured ScenarioIntentDelta.
 *
 * Uses OpenAI-style Structured Outputs / JSON schema mode to constrain the response.
 * Throws AiUnavailableError if no AI provider is available.
 * Throws a clear Error if the model output cannot be parsed or validated.
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
  if (result.data.budget) delta.budget = result.data.budget;
  if (result.data.headcount) delta.headcount = result.data.headcount;
  if (result.data.deadlineWeeks) delta.deadlineWeeks = result.data.deadlineWeeks;
  if (result.data.scope) delta.scope = result.data.scope;

  return delta;
}
