import { deleteScenario, getScenario, updateScenario } from "../../../../data/db.js";
import { handleRouteError } from "../../../../lib/api/errors.js";
import { fail, ok } from "../../../../lib/api/respond.js";
import { UpdateScenarioSchema } from "../../../../lib/api/schemas.js";

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
    return ok(scenario);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const scenario = await getScenario(id);
    if (!scenario) {
      return fail(404, "NOT_FOUND", `Scenario '${id}' not found.`);
    }

    const json = await request.json();
    const data = UpdateScenarioSchema.parse(json);

    const updated = await updateScenario(id, data);
    return ok(updated);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const url = new URL(request.url);
    const confirm = url.searchParams.get("confirm");
    if (confirm !== "true") {
      return fail(400, "CONFIRMATION_REQUIRED", "Deletion requires confirmation (?confirm=true).");
    }

    const { id } = await Promise.resolve(context.params);
    const scenario = await getScenario(id);
    if (!scenario) {
      return fail(404, "NOT_FOUND", `Scenario '${id}' not found.`);
    }

    await deleteScenario(id);
    return ok({ success: true, deletedId: id });
  } catch (err) {
    return handleRouteError(err);
  }
}
