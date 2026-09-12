import { z } from "zod";
import { diffScenariosById } from "../../../../domain/diff.js";
import { explainScenarioDiff } from "../../../../ai/explainDiff.js";
import { handleRouteError } from "../../../../lib/api/errors.js";
import { fail, ok } from "../../../../lib/api/respond.js";

const ExplainDiffBodySchema = z.object({
  scenarioAId: z.string().min(1, "scenarioAId is required"),
  scenarioBId: z.string().min(1, "scenarioBId is required"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = ExplainDiffBodySchema.parse(json);

    try {
      const diff = await diffScenariosById(body.scenarioAId, body.scenarioBId);
      const explanation = await explainScenarioDiff(diff);
      return ok(explanation, 200);
    } catch (diffErr) {
      if (diffErr instanceof Error && diffErr.message.includes("not found")) {
        return fail(404, "NOT_FOUND", diffErr.message);
      }
      throw diffErr;
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
