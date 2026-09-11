/**
 * Data layer schema and record types for projects and scenarios.
 *
 * This module defines the persistent entities used by the data layer, mapping
 * directly to the relational tables defined in `setup.sql`.
 *
 * Crucially, JSONB document fields (`inputs`, `deterministic_output`,
 * `monte_carlo_output`) strictly reference the concrete domain types from
 * Phase 1 (`SimulationResult`) and Phase 2 (`UncertainScenarioInputs`,
 * `MonteCarloResult`), ensuring end-to-end type safety without loose dictionaries
 * or `any`.
 */

import type { SimulationResult } from "../domain/types.js";
import type {
  MonteCarloResult,
  UncertainScenarioInputs,
} from "../domain/monteCarlo.js";

/**
 * Thrown when an attempt is made to delete a project that still has associated scenarios.
 * Cascading deletions are strictly forbidden to prevent accidental data loss.
 */
export class ProjectNotEmptyError extends Error {
  readonly projectId: string;

  constructor(projectId: string) {
    super(`Cannot delete project '${projectId}' because it still contains scenarios.`);
    this.name = "ProjectNotEmptyError";
    this.projectId = projectId;
  }
}

/**
 * Persistent representation of a Project row.
 *
 * A project groups related scenarios together, providing curated tag suggestions
 * for its member scenarios.
 */
export interface ProjectRecord {
  /** Unique project identifier (UUID). */
  id: string;
  /** Human-readable display name for the project. */
  name: string;
  /** Optional markdown description or executive summary. */
  description: string | null;
  /** Curated list of suggested tags available to scenarios in this project. */
  suggested_tags: string[];
  /** ISO 8601 creation timestamp. */
  created_at: string;
  /** ISO 8601 last-update timestamp. */
  updated_at: string;
}

/**
 * Persistent representation of a Scenario row.
 *
 * A scenario belongs to exactly one project (no orphans) and may branch from
 * an optional parent scenario (for variant tracking or Monte Carlo re-runs).
 */
export interface ScenarioRecord {
  /** Unique scenario identifier (UUID). */
  id: string;
  /** Project to which this scenario belongs (FOREIGN KEY -> projects.id). */
  project_id: string;
  /** Optional parent scenario identifier if forked or re-run (FOREIGN KEY -> scenarios.id). */
  parent_scenario_id: string | null;
  /** Human-readable scenario name. */
  name: string;
  /** Optional scenario description or rationale. */
  description: string | null;
  /** Free-text tags assigned to this scenario. */
  tags: string[];
  /** Whether the user has marked this scenario as a favorite. */
  is_favorite: boolean;
  /** Whether the scenario has been soft-deleted / archived. */
  is_archived: boolean;
  /** Uncertain levers and parameters defining this scenario. */
  inputs: UncertainScenarioInputs;
  /** Deterministic core calculation results (Phase 1). */
  deterministic_output: SimulationResult;
  /** Optional probabilistic Monte Carlo sampling results (Phase 2). */
  monte_carlo_output: MonteCarloResult | null;
  /** ISO 8601 creation timestamp. */
  created_at: string;
  /** ISO 8601 last-update timestamp. */
  updated_at: string;
}

/**
 * Parameters for creating a new project.
 */
export interface CreateProjectParams {
  /** Optional pre-assigned UUID (generated automatically if omitted). */
  id?: string;
  /** Project name. */
  name: string;
  /** Optional project description. */
  description?: string | null;
  /** Initial suggested tags list (defaults to empty array). */
  suggested_tags?: string[];
  /** Shorthand camelCase alias for suggested_tags. */
  suggestedTags?: string[];
}

/**
 * Parameters for saving a scenario (new scenario, variant fork, or Monte Carlo re-run).
 */
export interface SaveScenarioParams {
  /** Optional pre-assigned UUID (generated automatically if omitted). */
  id?: string;
  /** Target project identifier (required). */
  projectId?: string;
  /** Target project identifier (snake_case alias). */
  project_id?: string;
  /** Optional parent scenario identifier. */
  parentScenarioId?: string | null;
  /** Optional parent scenario identifier (snake_case alias). */
  parent_scenario_id?: string | null;
  /** Scenario name. */
  name: string;
  /** Optional scenario description. */
  description?: string | null;
  /** Free-text tags. */
  tags?: string[];
  /** Whether marked as favorite (defaults to false). */
  isFavorite?: boolean;
  is_favorite?: boolean;
  /** Whether archived (defaults to false). */
  isArchived?: boolean;
  is_archived?: boolean;
  /** Scenario inputs (required). */
  inputs: UncertainScenarioInputs;
  /** Deterministic simulation output (computed if omitted). */
  deterministicOutput?: SimulationResult;
  deterministic_output?: SimulationResult;
  /** Optional Monte Carlo probabilistic output. */
  monteCarloOutput?: MonteCarloResult | null;
  monte_carlo_output?: MonteCarloResult | null;
}

/**
 * Partial fields for updating an existing scenario.
 */
export interface UpdateScenarioPatch {
  name?: string;
  description?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  is_favorite?: boolean;
  isArchived?: boolean;
  is_archived?: boolean;
  inputs?: UncertainScenarioInputs;
  deterministicOutput?: SimulationResult;
  deterministic_output?: SimulationResult;
  monteCarloOutput?: MonteCarloResult | null;
  monte_carlo_output?: MonteCarloResult | null;
}

/**
 * Options for listing scenarios in a project.
 */
export interface ListScenariosOptions {
  /** Whether to include archived scenarios (defaults to false). */
  includeArchived?: boolean;
}

/**
 * Options for searching scenarios in a project.
 */
export interface SearchScenariosOptions {
  /** Substring to match case-insensitively against name OR description. */
  query?: string;
  /** Array of tags; scenario must match ALL listed tags (AND condition). */
  tags?: string[];
  /** Whether to search across archived scenarios as well (defaults to false). */
  includeArchived?: boolean;
}
