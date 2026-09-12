import { runMonteCarloSimulation } from "../../../../domain/monteCarlo.js";
import { handleRouteError } from "../../../../lib/api/errors.js";
import { ok } from "../../../../lib/api/respond.js";
import { SimulateMonteCarloSchema } from "../../../../lib/api/schemas.js";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = SimulateMonteCarloSchema.parse(json);
    const result = runMonteCarloSimulation(data.inputs, data.options);
    return ok(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
