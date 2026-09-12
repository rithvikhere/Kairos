import { getProject, updateProjectTagSuggestions } from "../../../../../data/db.js";
import { handleRouteError } from "../../../../../lib/api/errors.js";
import { fail, ok } from "../../../../../lib/api/respond.js";
import { UpdateProjectTagsSchema } from "../../../../../lib/api/schemas.js";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const project = await getProject(id);
    if (!project) {
      return fail(404, "NOT_FOUND", `Project '${id}' not found.`);
    }

    const json = await request.json();
    const data = UpdateProjectTagsSchema.parse(json);

    const updated = await updateProjectTagSuggestions(id, data.suggestedTags);
    return ok(updated);
  } catch (err) {
    return handleRouteError(err);
  }
}
