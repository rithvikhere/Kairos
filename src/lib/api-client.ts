import type { ProjectRecord, ScenarioRecord } from "../data/schema.js";
import type {
  ScenarioInputs,
  SimulationResult,
} from "../domain/types.js";
import type {
  MonteCarloResult,
  UncertainScenarioInputs,
} from "../domain/monteCarlo.js";
import type { ScenarioDiff } from "../domain/diff.js";
import type { DiffExplanation, ScenarioIntentDelta } from "../ai/types.js";
import type { ErrorCode } from "./api/respond.js";

/**
 * Custom client-side API error preserving HTTP status and backend ErrorCode.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ErrorCode | string;

  constructor(status: number, code: ErrorCode | string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Shared fetch helper that unwraps { data } or throws ApiClientError({ code, message }).
 */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const code: ErrorCode | string = json?.error?.code ?? "INTERNAL_ERROR";
    const message: string = json?.error?.message ?? res.statusText ?? "Request failed";
    throw new ApiClientError(res.status, code, message);
  }

  return json.data as T;
}

/* =========================================================================
   PROJECTS
   ========================================================================= */

export async function getProjects(): Promise<ProjectRecord[]> {
  return request<ProjectRecord[]>("/api/projects");
}

export async function getProject(id: string): Promise<ProjectRecord> {
  return request<ProjectRecord>(`/api/projects/${encodeURIComponent(id)}`);
}

export async function createProject(data: {
  name: string;
  description?: string | null;
  suggestedTags?: string[];
}): Promise<ProjectRecord> {
  return request<ProjectRecord>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProjectTags(
  id: string,
  suggestedTags: string[]
): Promise<ProjectRecord> {
  return request<ProjectRecord>(`/api/projects/${encodeURIComponent(id)}/tags`, {
    method: "PATCH",
    body: JSON.stringify({ suggestedTags }),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return request<void>(`/api/projects/${encodeURIComponent(id)}?confirm=true`, {
    method: "DELETE",
  });
}

/* =========================================================================
   SCENARIOS
   ========================================================================= */

export async function getScenarios(projectId: string): Promise<ScenarioRecord[]> {
  return request<ScenarioRecord[]>(
    `/api/scenarios?projectId=${encodeURIComponent(projectId)}`
  );
}

export async function getScenario(id: string): Promise<ScenarioRecord> {
  return request<ScenarioRecord>(`/api/scenarios/${encodeURIComponent(id)}`);
}

export async function createScenario(data: {
  projectId: string;
  parentScenarioId?: string | null;
  name: string;
  description?: string | null;
  tags?: string[];
  inputs: UncertainScenarioInputs;
  runMonteCarlo?: boolean;
  monteCarloOptions?: { iterations?: number; seed?: number };
}): Promise<ScenarioRecord> {
  return request<ScenarioRecord>("/api/scenarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateScenario(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    tags?: string[];
  }
): Promise<ScenarioRecord> {
  return request<ScenarioRecord>(`/api/scenarios/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteScenario(id: string): Promise<void> {
  return request<void>(`/api/scenarios/${encodeURIComponent(id)}?confirm=true`, {
    method: "DELETE",
  });
}

export async function toggleFavorite(
  id: string
): Promise<{ id: string; favorite: boolean }> {
  return request<{ id: string; favorite: boolean }>(
    `/api/scenarios/${encodeURIComponent(id)}/favorite`,
    {
      method: "POST",
    }
  );
}

export async function setArchived(
  id: string,
  archived: boolean
): Promise<{ id: string; archived: boolean }> {
  return request<{ id: string; archived: boolean }>(
    `/api/scenarios/${encodeURIComponent(id)}/archive`,
    {
      method: "POST",
      body: JSON.stringify({ archived }),
    }
  );
}

export async function getChildScenarios(id: string): Promise<ScenarioRecord[]> {
  return request<ScenarioRecord[]>(
    `/api/scenarios/${encodeURIComponent(id)}/children`
  );
}

export async function searchScenarios(params: {
  q?: string;
  tags?: string[];
  favoritesOnly?: boolean;
}): Promise<ScenarioRecord[]> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.tags && params.tags.length > 0) search.set("tags", params.tags.join(","));
  if (params.favoritesOnly) search.set("favoritesOnly", "true");

  return request<ScenarioRecord[]>(`/api/scenarios/search?${search.toString()}`);
}

/* =========================================================================
   SIMULATION
   ========================================================================= */

export async function simulatePreview(
  inputs: ScenarioInputs
): Promise<SimulationResult> {
  return request<SimulationResult>("/api/simulate", {
    method: "POST",
    body: JSON.stringify(inputs),
  });
}

export async function simulateMonteCarlo(
  inputs: UncertainScenarioInputs,
  options?: {
    iterations?: number;
    seed?: number;
    bucketCount?: number;
    recordCheckpoints?: { every: number };
    sampleTrials?: { count: number };
  }
): Promise<MonteCarloResult> {
  return request<MonteCarloResult>("/api/simulate/monte-carlo", {
    method: "POST",
    body: JSON.stringify({ inputs, options }),
  });
}

/* =========================================================================
   DIFF & COMPARISON
   ========================================================================= */

export async function getDiff(a: string, b: string): Promise<ScenarioDiff> {
  return request<ScenarioDiff>(
    `/api/diff?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`
  );
}

/* =========================================================================
   AI
   ========================================================================= */

export async function parseScenarioIntent(
  freeText: string,
  baselineInputs: ScenarioInputs
): Promise<{ delta: ScenarioIntentDelta; resolvedInputs: ScenarioInputs }> {
  return request<{ delta: ScenarioIntentDelta; resolvedInputs: ScenarioInputs }>(
    "/api/ai/parse-intent",
    {
      method: "POST",
      body: JSON.stringify({ freeText, baselineInputs }),
    }
  );
}

export async function explainDiff(
  scenarioAId: string,
  scenarioBId: string
): Promise<DiffExplanation> {
  return request<DiffExplanation>("/api/ai/explain-diff", {
    method: "POST",
    body: JSON.stringify({ scenarioAId, scenarioBId }),
  });
}
