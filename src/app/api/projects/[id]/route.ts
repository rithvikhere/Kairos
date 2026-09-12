import { deleteProject, getProject } from "../../../../data/db.js";
import { handleRouteError } from "../../../../lib/api/errors.js";
import { fail, ok } from "../../../../lib/api/respond.js";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const project = await getProject(id);
    if (!project) {
      return fail(404, "NOT_FOUND", `Project '${id}' not found.`);
    }
    return ok(project);
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
    const project = await getProject(id);
    if (!project) {
      return fail(404, "NOT_FOUND", `Project '${id}' not found.`);
    }

    await deleteProject(id);
    return ok({ success: true, deletedId: id });
  } catch (err) {
    return handleRouteError(err);
  }
}
