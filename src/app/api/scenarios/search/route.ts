import { searchScenarios } from "../../../../data/db.js";
import { handleRouteError } from "../../../../lib/api/errors.js";
import { fail, ok } from "../../../../lib/api/respond.js";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      return fail(400, "VALIDATION_ERROR", "projectId query parameter is required.");
    }

    const query = url.searchParams.get("query") || undefined;
    const tagsParam = url.searchParams.get("tags");
    const tags = tagsParam
      ? tagsParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const favoritesOnly = url.searchParams.get("favoritesOnly") === "true";

    let results = await searchScenarios(projectId, {
      query,
      tags,
      includeArchived,
    });

    if (favoritesOnly) {
      results = results.filter((s) => s.is_favorite);
    }

    return ok(results);
  } catch (err) {
    return handleRouteError(err);
  }
}
