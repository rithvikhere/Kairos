import { getProject, listScenariosByProject, saveScenario } from "../../../data/db.js";
import { runMonteCarloSimulation } from "../../../domain/monteCarlo.js";
import { handleRouteError } from "../../../lib/api/errors.js";
import { fail, ok } from "../../../lib/api/respond.js";
import { CreateScenarioSchema } from "../../../lib/api/schemas.js";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = CreateScenarioSchema.parse(json);

    // Verify project exists before calling saveScenario
    const project = await getProject(data.projectId);
    if (!project) {
      return fail(404, "NOT_FOUND", `Project '${data.projectId}' not found.`);
    }

    let monteCarloOutput = undefined;
    if (data.runMonteCarlo) {
      monteCarloOutput = runMonteCarloSimulation(data.inputs, data.monteCarloOptions);
    }

    const saved = await saveScenario({
      projectId: data.projectId,
      parentScenarioId: data.parentScenarioId ?? null,
      name: data.name,
      description: data.description ?? null,
      tags: data.tags ?? [],
      inputs: data.inputs,
      monteCarloOutput,
    });

    return ok(saved);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      return fail(400, "VALIDATION_ERROR", "projectId query parameter is required.");
    }

    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const scenarios = await listScenariosByProject(projectId, { includeArchived });
    return ok(scenarios);
  } catch (err) {
    return handleRouteError(err);
  }
}
