import { createProject, listProjects } from "../../../data/db.js";
import { handleRouteError } from "../../../lib/api/errors.js";
import { ok } from "../../../lib/api/respond.js";
import { CreateProjectSchema } from "../../../lib/api/schemas.js";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = CreateProjectSchema.parse(json);
    const project = await createProject({
      name: data.name,
      description: data.description,
      suggestedTags: data.suggestedTags ?? data.suggested_tags,
    });
    return ok(project);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function GET() {
  try {
    const projects = await listProjects();
    return ok(projects);
  } catch (err) {
    return handleRouteError(err);
  }
}
