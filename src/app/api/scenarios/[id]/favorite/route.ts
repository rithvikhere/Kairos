import { getScenario, toggleFavorite } from "../../../../../data/db.js";
import { handleRouteError } from "../../../../../lib/api/errors.js";
import { fail, ok } from "../../../../../lib/api/respond.js";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const scenario = await getScenario(id);
    if (!scenario) {
      return fail(404, "NOT_FOUND", `Scenario '${id}' not found.`);
    }

    const updated = await toggleFavorite(id);
    return ok(updated);
  } catch (err) {
    return handleRouteError(err);
  }
}
