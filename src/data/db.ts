/**
 * Dual-mode database interface for projects and scenarios.
 *
 * Implements a try-Postgres-then-fall-back architecture:
 * - If a live Postgres pool is available (configured via DATABASE_URL), queries
 *   are executed against PostgreSQL with relational constraints and indexing.
 * - If no connection is available or if Postgres fails, execution transparently
 *   falls back to module-level in-memory Maps (`inMemoryProjects`, `inMemoryScenarios`).
 *
 * Callers never need to know which storage backend served the request.
 * Tests run completely in in-memory mode with zero database or network dependencies.
 */

import { simulate } from "../domain/simulation.js";
import type { Distribution } from "../domain/monteCarlo.js";
import type {
  CreateProjectParams,
  ListScenariosOptions,
  ProjectRecord,
  SaveScenarioParams,
  ScenarioRecord,
  SearchScenariosOptions,
  UpdateScenarioPatch,
} from "./schema.js";
import { ProjectNotEmptyError } from "./schema.js";

/** In-memory storage for projects. */
const inMemoryProjects = new Map<string, ProjectRecord>();

/** In-memory storage for scenarios. */
const inMemoryScenarios = new Map<string, ScenarioRecord>();

/**
 * Resets the in-memory database. Used primarily for test suite isolation.
 */
export function _resetInMemoryDb(): void {
  inMemoryProjects.clear();
  inMemoryScenarios.clear();
}

/**
 * Generates a standard RFC4122 v4 UUID string.
 */
function generateId(): string {
  const gCrypto = (globalThis as any).crypto;
  if (gCrypto && typeof gCrypto.randomUUID === "function") {
    return gCrypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extracts a concrete baseline scalar from a number or Distribution specification.
 */
function extractBaseline(value: number | Distribution): number {
  if (typeof value === "number") return value;
  switch (value.kind) {
    case "fixed":
      return value.value;
    case "normal":
      return value.mean;
    case "uniform":
      return (value.min + value.max) / 2;
  }
}

/** Cooldown duration (30 seconds) before retrying a failed Postgres connection. */
export const PG_RETRY_COOLDOWN_MS = 30_000;

// ---------------------------------------------------------------------------
// Postgres Connection & Initialization
// ---------------------------------------------------------------------------

let pgPool: any = null;
let lastConnectionAttempt = 0;

/**
 * Resets the Postgres connection state (pool and last attempt timestamp).
 * Test-only helper to simulate a fresh process state.
 */
export function _resetPgConnectionState(): void {
  pgPool = null;
  lastConnectionAttempt = 0;
}

/**
 * Connector object providing the actual Postgres connection attempt.
 * Isolated to enable mocking and spying in tests without requiring real Postgres.
 */
export const _pgConnector = {
  connect: async (dbUrl: string): Promise<any> => {
    const pgModule = "pg";
    const pg: any = await import(/* @vite-ignore */ pgModule);
    const Pool = (pg.default && pg.default.Pool) || pg.Pool;
    const candidatePool = new Pool({ connectionString: dbUrl });
    const client = await candidatePool.connect();
    client.release();
    return candidatePool;
  },
};

/**
 * Resolves a live PostgreSQL pool if available, otherwise returns null.
 *
 * Employs a retry-with-cooldown strategy:
 * - If pgPool is already set (previous successful connection), returns it immediately.
 * - If pgPool is null, checks how long it has been since lastConnectionAttempt.
 *   If less than PG_RETRY_COOLDOWN_MS has elapsed, returns null immediately without attempting.
 * - Otherwise updates lastConnectionAttempt = Date.now(), attempts connection, and:
 *   - On success: stores pool in pgPool and returns it.
 *   - On failure: leaves pgPool as null and returns null. The next call after the cooldown will retry.
 */
export async function getPgPool(): Promise<any> {
  if (pgPool !== null) {
    return pgPool;
  }

  const now = Date.now();
  if (now - lastConnectionAttempt < PG_RETRY_COOLDOWN_MS) {
    return null;
  }

  lastConnectionAttempt = now;

  const dbUrl = (globalThis as any).process?.env?.DATABASE_URL;
  if (!dbUrl) {
    return null;
  }

  try {
    const candidatePool = await _pgConnector.connect(dbUrl);
    pgPool = candidatePool;
    return pgPool;
  } catch {
    pgPool = null;
    return null;
  }
}

/**
 * SQL script to initialize tables and indexes in Postgres.
 */
const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NULL,
    suggested_tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    parent_scenario_id TEXT NULL REFERENCES scenarios(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    inputs JSONB NOT NULL,
    deterministic_output JSONB NOT NULL,
    monte_carlo_output JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_project ON scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_parent ON scenarios(parent_scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_favorite ON scenarios(project_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_scenarios_tags ON scenarios USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_scenarios_active ON scenarios(project_id, is_archived);
`;

/**
 * Ensures the database schema exists.
 *
 * Idempotent: runs setup.sql verbatim against Postgres if connected;
 * safely acts as a no-op in in-memory mode.
 */
export async function ensureSchema(): Promise<void> {
  const pool = await getPgPool();
  if (pool) {
    try {
      await pool.query(SETUP_SQL);
    } catch {
      // Fall back silently if Postgres setup fails
    }
  }
}

// ---------------------------------------------------------------------------
// Projects API
// ---------------------------------------------------------------------------

/**
 * Creates and persists a new Project.
 */
export async function createProject(params: CreateProjectParams): Promise<ProjectRecord> {
  const id = params.id ?? generateId();
  const now = new Date().toISOString();
  const suggestedTags = params.suggested_tags ?? params.suggestedTags ?? [];

  const record: ProjectRecord = {
    id,
    name: params.name,
    description: params.description ?? null,
    suggested_tags: [...suggestedTags],
    created_at: now,
    updated_at: now,
  };

  const pool = await getPgPool();
  if (pool) {
    try {
      const query = `
        INSERT INTO projects (id, name, description, suggested_tags, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const res = await pool.query(query, [
        record.id,
        record.name,
        record.description,
        record.suggested_tags,
        record.created_at,
        record.updated_at,
      ]);
      return res.rows[0];
    } catch {
      // Fall through to in-memory mode
    }
  }

  inMemoryProjects.set(id, { ...record });
  return { ...record };
}

/**
 * Retrieves a single project by its unique identifier.
 */
export async function getProject(id: string): Promise<ProjectRecord | null> {
  const pool = await getPgPool();
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM projects WHERE id = $1;", [id]);
      if (res.rows.length > 0) return res.rows[0];
      return null;
    } catch {
      // Fall through to in-memory mode
    }
  }

  const found = inMemoryProjects.get(id);
  return found ? { ...found } : null;
}

/**
 * Lists all existing projects, ordered by creation date descending.
 */
export async function listProjects(): Promise<ProjectRecord[]> {
  const pool = await getPgPool();
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM projects ORDER BY created_at DESC;");
      return res.rows;
    } catch {
      // Fall through to in-memory mode
    }
  }

  return Array.from(inMemoryProjects.values())
    .map((p) => ({ ...p }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Updates the curated list of suggested tags for a project.
 *
 * Notice: scenario tags never automatically sync into this list; suggested tags
 * are explicitly curated by stakeholders via this function.
 */
export async function updateProjectTagSuggestions(
  id: string,
  suggestedTags: string[]
): Promise<ProjectRecord | null> {
  const now = new Date().toISOString();

  const pool = await getPgPool();
  if (pool) {
    try {
      const query = `
        UPDATE projects
        SET suggested_tags = $1, updated_at = $2
        WHERE id = $3
        RETURNING *;
      `;
      const res = await pool.query(query, [suggestedTags, now, id]);
      if (res.rows.length > 0) return res.rows[0];
      return null;
    } catch {
      // Fall through to in-memory mode
    }
  }

  const existing = inMemoryProjects.get(id);
  if (!existing) return null;

  const updated: ProjectRecord = {
    ...existing,
    suggested_tags: [...suggestedTags],
    updated_at: now,
  };
  inMemoryProjects.set(id, updated);
  return { ...updated };
}

/**
 * Deletes a project.
 *
 * Guardrail: Deleting a project is strictly BLOCKED if any scenario references it.
 * Throws `ProjectNotEmptyError` rather than cascading deletions.
 */
export async function deleteProject(id: string): Promise<boolean> {
  const pool = await getPgPool();
  if (pool) {
    try {
      // Check if any scenarios reference this project
      const countRes = await pool.query(
        "SELECT COUNT(*) AS count FROM scenarios WHERE project_id = $1;",
        [id]
      );
      if (parseInt(countRes.rows[0]?.count ?? "0", 10) > 0) {
        throw new ProjectNotEmptyError(id);
      }
      const deleteRes = await pool.query("DELETE FROM projects WHERE id = $1;", [id]);
      return (deleteRes.rowCount ?? 0) > 0;
    } catch (err) {
      if (err instanceof ProjectNotEmptyError) throw err;
      // Fall through to in-memory mode
    }
  }

  // Check in-memory scenarios for reference
  const hasScenarios = Array.from(inMemoryScenarios.values()).some((s) => s.project_id === id);
  if (hasScenarios) {
    throw new ProjectNotEmptyError(id);
  }

  return inMemoryProjects.delete(id);
}

// ---------------------------------------------------------------------------
// Scenarios API
// ---------------------------------------------------------------------------

/**
 * Saves and persists a scenario.
 *
 * Re-running Monte Carlo or creating a variant is performed by passing
 * `parentScenarioId` set to the original's ID — this creates a new row and
 * never mutates the parent.
 */
export async function saveScenario(params: SaveScenarioParams): Promise<ScenarioRecord> {
  const projectId = params.projectId ?? params.project_id;
  if (!projectId) {
    throw new Error("project_id is required on every scenario; no orphans allowed.");
  }

  // Ensure target project exists
  const project = await getProject(projectId);
  if (!project) {
    throw new Error(`Project '${projectId}' not found. Cannot create orphan scenario.`);
  }

  const id = params.id ?? generateId();
  const parentScenarioId = params.parentScenarioId ?? params.parent_scenario_id ?? null;
  const now = new Date().toISOString();

  // Compute deterministic output if omitted
  const deterministicOutput =
    params.deterministic_output ??
    params.deterministicOutput ??
    simulate({
      budget: extractBaseline(params.inputs.budget),
      headcount: extractBaseline(params.inputs.headcount),
      deadlineWeeks: extractBaseline(params.inputs.deadlineWeeks),
      scope:
        params.inputs.scope !== undefined
          ? extractBaseline(params.inputs.scope)
          : undefined,
    });

  const record: ScenarioRecord = {
    id,
    project_id: projectId,
    parent_scenario_id: parentScenarioId,
    name: params.name,
    description: params.description ?? null,
    tags: params.tags ? [...params.tags] : [],
    is_favorite: params.is_favorite ?? params.isFavorite ?? false,
    is_archived: params.is_archived ?? params.isArchived ?? false,
    inputs: params.inputs,
    deterministic_output: deterministicOutput,
    monte_carlo_output: params.monte_carlo_output ?? params.monteCarloOutput ?? null,
    created_at: now,
    updated_at: now,
  };

  const pool = await getPgPool();
  if (pool) {
    try {
      const query = `
        INSERT INTO scenarios (
          id, project_id, parent_scenario_id, name, description,
          tags, is_favorite, is_archived, inputs, deterministic_output,
          monte_carlo_output, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `;
      const res = await pool.query(query, [
        record.id,
        record.project_id,
        record.parent_scenario_id,
        record.name,
        record.description,
        record.tags,
        record.is_favorite,
        record.is_archived,
        JSON.stringify(record.inputs),
        JSON.stringify(record.deterministic_output),
        record.monte_carlo_output ? JSON.stringify(record.monte_carlo_output) : null,
        record.created_at,
        record.updated_at,
      ]);
      return res.rows[0];
    } catch {
      // Fall through to in-memory mode
    }
  }

  inMemoryScenarios.set(id, { ...record });
  return { ...record };
}

/**
 * Retrieves a scenario by its unique identifier.
 */
export async function getScenario(id: string): Promise<ScenarioRecord | null> {
  const pool = await getPgPool();
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM scenarios WHERE id = $1;", [id]);
      if (res.rows.length > 0) return res.rows[0];
      return null;
    } catch {
      // Fall through to in-memory mode
    }
  }

  const found = inMemoryScenarios.get(id);
  return found ? { ...found } : null;
}

/**
 * Lists all scenarios in a project, ordered by creation date descending.
 *
 * By default, archived scenarios are excluded unless `opts.includeArchived` is true.
 */
export async function listScenariosByProject(
  projectId: string,
  opts?: ListScenariosOptions
): Promise<ScenarioRecord[]> {
  const includeArchived = opts?.includeArchived ?? false;

  const pool = await getPgPool();
  if (pool) {
    try {
      const query = includeArchived
        ? "SELECT * FROM scenarios WHERE project_id = $1 ORDER BY created_at DESC;"
        : "SELECT * FROM scenarios WHERE project_id = $1 AND is_archived = false ORDER BY created_at DESC;";
      const res = await pool.query(query, [projectId]);
      return res.rows;
    } catch {
      // Fall through to in-memory mode
    }
  }

  return Array.from(inMemoryScenarios.values())
    .filter((s) => s.project_id === projectId)
    .filter((s) => (includeArchived ? true : !s.is_archived))
    .map((s) => ({ ...s }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Retrieves all child scenarios that branched from the specified parent scenario.
 */
export async function getChildren(parentScenarioId: string): Promise<ScenarioRecord[]> {
  const pool = await getPgPool();
  if (pool) {
    try {
      const res = await pool.query(
        "SELECT * FROM scenarios WHERE parent_scenario_id = $1 ORDER BY created_at DESC;",
        [parentScenarioId]
      );
      return res.rows;
    } catch {
      // Fall through to in-memory mode
    }
  }

  return Array.from(inMemoryScenarios.values())
    .filter((s) => s.parent_scenario_id === parentScenarioId)
    .map((s) => ({ ...s }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Updates selected fields of an existing scenario, automatically bumping `updated_at`.
 */
export async function updateScenario(
  id: string,
  patch: UpdateScenarioPatch
): Promise<ScenarioRecord | null> {
  const now = new Date().toISOString();

  const pool = await getPgPool();
  if (pool) {
    try {
      const current = await getScenario(id);
      if (!current) return null;

      const updatedName = patch.name !== undefined ? patch.name : current.name;
      const updatedDesc = patch.description !== undefined ? patch.description : current.description;
      const updatedTags = patch.tags !== undefined ? patch.tags : current.tags;
      const updatedFavorite =
        patch.is_favorite !== undefined
          ? patch.is_favorite
          : patch.isFavorite !== undefined
            ? patch.isFavorite
            : current.is_favorite;
      const updatedArchived =
        patch.is_archived !== undefined
          ? patch.is_archived
          : patch.isArchived !== undefined
            ? patch.isArchived
            : current.is_archived;
      const updatedInputs = patch.inputs !== undefined ? patch.inputs : current.inputs;
      const updatedDet =
        patch.deterministic_output !== undefined
          ? patch.deterministic_output
          : patch.deterministicOutput !== undefined
            ? patch.deterministicOutput
            : current.deterministic_output;
      const updatedMc =
        patch.monte_carlo_output !== undefined
          ? patch.monte_carlo_output
          : patch.monteCarloOutput !== undefined
            ? patch.monteCarloOutput
            : current.monte_carlo_output;

      const query = `
        UPDATE scenarios
        SET name = $1, description = $2, tags = $3, is_favorite = $4, is_archived = $5,
            inputs = $6, deterministic_output = $7, monte_carlo_output = $8, updated_at = $9
        WHERE id = $10
        RETURNING *;
      `;
      const res = await pool.query(query, [
        updatedName,
        updatedDesc,
        updatedTags,
        updatedFavorite,
        updatedArchived,
        JSON.stringify(updatedInputs),
        JSON.stringify(updatedDet),
        updatedMc ? JSON.stringify(updatedMc) : null,
        now,
        id,
      ]);
      if (res.rows.length > 0) return res.rows[0];
      return null;
    } catch {
      // Fall through to in-memory mode
    }
  }

  const existing = inMemoryScenarios.get(id);
  if (!existing) return null;

  const updated: ScenarioRecord = {
    ...existing,
    name: patch.name !== undefined ? patch.name : existing.name,
    description: patch.description !== undefined ? patch.description : existing.description,
    tags: patch.tags !== undefined ? [...patch.tags] : existing.tags,
    is_favorite:
      patch.is_favorite !== undefined
        ? patch.is_favorite
        : patch.isFavorite !== undefined
          ? patch.isFavorite
          : existing.is_favorite,
    is_archived:
      patch.is_archived !== undefined
        ? patch.is_archived
        : patch.isArchived !== undefined
          ? patch.isArchived
          : existing.is_archived,
    inputs: patch.inputs !== undefined ? patch.inputs : existing.inputs,
    deterministic_output:
      patch.deterministic_output !== undefined
        ? patch.deterministic_output
        : patch.deterministicOutput !== undefined
          ? patch.deterministicOutput
          : existing.deterministic_output,
    monte_carlo_output:
      patch.monte_carlo_output !== undefined
        ? patch.monte_carlo_output
        : patch.monteCarloOutput !== undefined
          ? patch.monteCarloOutput
          : existing.monte_carlo_output,
    updated_at: now,
  };

  inMemoryScenarios.set(id, updated);
  return { ...updated };
}

/**
 * Toggles the favorite status of a scenario, bumping `updated_at`.
 */
export async function toggleFavorite(id: string): Promise<ScenarioRecord | null> {
  const current = await getScenario(id);
  if (!current) return null;
  return updateScenario(id, { is_favorite: !current.is_favorite });
}

/**
 * Updates the archive (soft delete) state of a scenario, bumping `updated_at`.
 */
export async function setArchived(id: string, archived: boolean): Promise<ScenarioRecord | null> {
  return updateScenario(id, { is_archived: archived });
}

/**
 * Hard deletes a scenario from persistent storage.
 *
 * Guardrail: Deleting a parent scenario does NOT delete its children; the children's
 * `parent_scenario_id` is set to null, leaving them fully intact.
 */
export async function deleteScenario(id: string): Promise<boolean> {
  const pool = await getPgPool();
  if (pool) {
    try {
      const res = await pool.query("DELETE FROM scenarios WHERE id = $1;", [id]);
      return (res.rowCount ?? 0) > 0;
    } catch {
      // Fall through to in-memory mode
    }
  }

  const existing = inMemoryScenarios.get(id);
  if (!existing) return false;

  // Nullify parent_scenario_id on all child scenarios
  for (const [childId, child] of inMemoryScenarios.entries()) {
    if (child.parent_scenario_id === id) {
      inMemoryScenarios.set(childId, {
        ...child,
        parent_scenario_id: null,
      });
    }
  }

  return inMemoryScenarios.delete(id);
}

/**
 * Searches scenarios within a project using substring and tag filters.
 *
 * - `query`: case-insensitive substring match against name OR description.
 * - `tags`: AND match (scenario must contain all requested tags).
 * - Archived scenarios are excluded by default unless `opts.includeArchived` is true.
 */
export async function searchScenarios(
  projectId: string,
  opts?: SearchScenariosOptions
): Promise<ScenarioRecord[]> {
  const includeArchived = opts?.includeArchived ?? false;
  const queryText = opts?.query?.trim().toLowerCase();
  const searchTags =
    opts?.tags && opts.tags.length > 0 ? opts.tags.map((t) => t.trim().toLowerCase()) : null;

  const pool = await getPgPool();
  if (pool) {
    try {
      const clauses: string[] = ["project_id = $1"];
      const values: any[] = [projectId];
      let paramIdx = 2;

      if (!includeArchived) {
        clauses.push("is_archived = false");
      }

      if (queryText) {
        clauses.push(`(LOWER(name) LIKE $${paramIdx} OR LOWER(COALESCE(description, '')) LIKE $${paramIdx})`);
        values.push(`%${queryText}%`);
        paramIdx++;
      }

      if (searchTags && searchTags.length > 0) {
        clauses.push(`tags @> $${paramIdx}`);
        values.push(opts!.tags);
        paramIdx++;
      }

      const sql = `SELECT * FROM scenarios WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC;`;
      const res = await pool.query(sql, values);
      return res.rows;
    } catch {
      // Fall through to in-memory mode
    }
  }

  return Array.from(inMemoryScenarios.values())
    .filter((s) => s.project_id === projectId)
    .filter((s) => (includeArchived ? true : !s.is_archived))
    .filter((s) => {
      if (queryText) {
        const nameMatch = s.name.toLowerCase().includes(queryText);
        const descMatch = s.description ? s.description.toLowerCase().includes(queryText) : false;
        if (!nameMatch && !descMatch) return false;
      }
      if (searchTags && searchTags.length > 0) {
        const scenarioTags = s.tags.map((t) => t.toLowerCase());
        const hasAllTags = searchTags.every((reqTag) => scenarioTags.includes(reqTag));
        if (!hasAllTags) return false;
      }
      return true;
    })
    .map((s) => ({ ...s }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
