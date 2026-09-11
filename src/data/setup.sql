-- Relational schema for Kairos Decision Simulation Platform
-- Safe to execute repeatedly (idempotent).

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

-- Index 1: Look up all scenarios in a given project
CREATE INDEX IF NOT EXISTS idx_scenarios_project ON scenarios(project_id);

-- Index 2: Track branching variants and child scenario executions
CREATE INDEX IF NOT EXISTS idx_scenarios_parent ON scenarios(parent_scenario_id);

-- Index 3: Chronological ordering for scenario history (newest first)
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at DESC);

-- Index 4: Fast filtered access for starred / favorite scenarios
CREATE INDEX IF NOT EXISTS idx_scenarios_favorite ON scenarios(project_id, is_favorite) WHERE is_favorite = true;

-- Index 5: GIN index for rapid set-containment tag queries
CREATE INDEX IF NOT EXISTS idx_scenarios_tags ON scenarios USING GIN (tags);

-- Index 6: Compound index for filtering out archived scenarios within a project
CREATE INDEX IF NOT EXISTS idx_scenarios_active ON scenarios(project_id, is_archived);
