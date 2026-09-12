import { getChildren, getScenario } from "../../../../../data/db.js";
import { handleRouteError } from "../../../../../lib/api/errors.js";
import { fail, ok } from "../../../../../lib/api/respond.js";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const scenario = await getScenario(id);
    if (!scenario) {
      return fail(404, "NOT_FOUND", `Scenario '${id}' not found.`);
    }

    const children = await getChildren(id);
    return ok(children);
  } catch (err) {
    return handleRouteError(err);
  }
}
