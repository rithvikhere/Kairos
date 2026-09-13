import { z } from "zod";
import { parseScenarioIntent } from "../../../../ai/parseScenarioIntent.js";
import { applyIntentDelta } from "../../../../ai/applyIntentDelta.js";
import { handleRouteError } from "../../../../lib/api/errors.js";
import { ok, fail } from "../../../../lib/api/respond.js";
import { ScenarioInputsSchema } from "../../../../lib/api/schemas.js";
import { AiUnavailableError } from "../../../../ai/errors.js";

const ParseIntentBodySchema = z.object({
  freeText: z.string().min(1, "freeText is required"),
  baselineInputs: ScenarioInputsSchema,
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const hadConstraints =
      json?.baselineInputs &&
      typeof json.baselineInputs === "object" &&
      "constraints" in json.baselineInputs;
    const body = ParseIntentBodySchema.parse(json);

    try {
      const delta = await parseScenarioIntent(body.freeText, body.baselineInputs);
      let resolvedInputs = applyIntentDelta(body.baselineInputs, delta);
      if (!hadConstraints && resolvedInputs && "constraints" in resolvedInputs) {
        const { constraints: _c, ...rest } = resolvedInputs;
        resolvedInputs = rest;
      }
      return ok({ delta, resolvedInputs });
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        return fail(
          503,
          "AI_UNAVAILABLE",
          "AI intent parsing is currently unavailable. Please use the structured slider/form input instead."
        );
      }
      throw err;
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
