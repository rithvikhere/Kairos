import { simulate } from "../../../domain/simulation.js";
import { handleRouteError } from "../../../lib/api/errors.js";
import { ok } from "../../../lib/api/respond.js";
import { ScenarioInputsSchema } from "../../../lib/api/schemas.js";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const inputs = ScenarioInputsSchema.parse(json);
    const result = simulate(inputs);
    return ok(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
