# Kairos

> Deterministic decision simulation engine with Monte Carlo uncertainty modeling for project resourcing trade-offs.

Kairos provides decision support for software engineering leaders and project managers by modeling the trade-offs between budget, headcount, scope, and deadlines under both deterministic scenarios and probabilistic uncertainty.

---

## Architecture & Layers

Kairos is built in additive, modular layers of pure TypeScript with zero external runtime dependencies:

### Phase 1 — Core Deterministic Domain Engine
Located in `src/domain/` (`simulation.ts`, `types.ts`, `constants.ts`):
- **Team Efficiency & Brooks's Law**: Models communication overhead past `BASE_TEAM_SIZE` (8 people) where adding staff reduces individual throughput, leading to the classic Mythical Man-Month crossover effect.
- **Estimated Duration**: `time = scope / effectiveHeadcount`.
- **Actual Cost**: `cost = headcount × time × COST_PER_PERSON_WEEK`.
- **Composite Risk Scoring (0–100)**: Piecewise blend of schedule risk (40%), budget risk (40%), and staffing risk (20%). Scenarios with risk scores below `FEASIBILITY_RISK_THRESHOLD` (50) are marked feasible.

### Phase 2 — Monte Carlo Uncertainty Layer
Located in `src/domain/` (`monteCarlo.ts`):
- **Probabilistic Levers**: Allows scenario parameters (`budget`, `headcount`, `deadlineWeeks`, `scope`) to be specified as fixed point estimates, uniform ranges, or Gaussian normal distributions.
- **Reproducible Seeded Sampling**: Integrates a self-contained 32-bit `mulberry32` PRNG and Box-Muller normal transform.
- **Non-destructive Filtering**: Evaluates each sampled iteration against `simulate()`, safely catching and recording `skippedIterations` for invalid samples (e.g. non-positive values) without aborting the simulation.
- **Distribution Summaries**: Produces comprehensive statistics across all 6 varying simulation metrics (`estimatedTimeWeeks`, `effectiveHeadcount`, `actualCost`, `budgetUtilization`, `scheduleUtilization`, `riskScore`):
  - `mean`, `median`, sample `stddev`, `min`, `max`
  - Percentiles (`p10`, `p25`, `p50`, `p75`, `p90`)
  - Contiguous 10-bin frequency `histogram`
  - `feasibleRate` (fraction of valid runs where scenario is feasible)
  - `probabilityOnTime` and `probabilityWithinBudget` boundary metrics

### Phase 3 — Data & Persistence Layer
Located in `src/data/` (`schema.ts`, `setup.sql`, `db.ts`):
- **Relational Schema**: Manages `projects` and `scenarios` tables with exact relational constraints and 6 specialized indexes (`idx_scenarios_project`, `idx_scenarios_parent`, `idx_scenarios_created_at`, `idx_scenarios_favorite`, `idx_scenarios_tags`, `idx_scenarios_active`).
- **Domain JSONB Integrity**: Row records (`ProjectRecord`, `ScenarioRecord`) reference the real domain types (`UncertainScenarioInputs`, `SimulationResult`, `MonteCarloResult`) without `any` or loose dictionaries.
- **Dual-Mode Architecture**: Transparently queries a live Postgres pool when `DATABASE_URL` is set, falling back seamlessly to module-level in-memory maps (`inMemoryProjects`, `inMemoryScenarios`) for offline development and testing.
- **Business Guardrails**:
  - Project deletion is strictly blocked (`ProjectNotEmptyError`) when scenarios reference it. No cascading deletes.
  - Parent deletion nullifies children's `parent_scenario_id` without deleting them.
  - Curated project tag suggestions remain independent from free-form scenario tags.
  - Distinct soft delete (`setArchived`) vs. hard delete (`deleteScenario`).
  - Search provides case-insensitive substring matching on name/description and strict AND matching across all queried tags.

### Phase 4 — Pairwise Diff & Risk Attribution Engine
Located in `src/domain/` (`diff.ts`):
- **Three-Tier Pairwise Comparison**: Compares two saved scenarios (`ScenarioRecord`) across:
  1. Input parameter shifts, resolving distributions (`fixed`, `normal` by mean, `uniform` by midpoint) to representative scalar numbers.
  2. Output metric shifts across all 6 core deterministic metrics (`estimatedTimeWeeks`, `effectiveHeadcount`, `actualCost`, `budgetUtilization`, `scheduleUtilization`, `riskScore`), nested `riskBreakdown` components (`scheduleRisk`, `budgetRisk`, `staffingRisk`), and boolean `feasible` transition tracking.
  3. Monte Carlo probabilistic shifts across `probabilityOnTime`, `probabilityWithinBudget`, and `feasibleRate` (null if either scenario lacks Monte Carlo data).
- **Fieldwise Deltas (`fieldwiseDelta`)**: Computes literal `delta`, `percentChange` (`null` when `from === 0` to prevent division-by-zero or `Infinity`/`NaN`), and `direction` (`"increased" | "decreased" | "unchanged"`).
- **Single-Variable Risk Attribution (`simulate()` Probing)**: Evaluates each changed input in isolation against scenario A's baseline using the pure `simulate()` engine to determine `isolatedRiskScore` and `isolatedRiskContribution`, sorted by `|isolatedRiskContribution|` descending.
- **Mathematical Integrity & Non-Additivity**: Acknowledges and preserves the non-linear interaction effect between variables resulting from Brooks's Law team efficiency curves and piecewise risk thresholds — individual contributions are never artificially normalized or rescaled.
- **Dual-Interface Consumption**: Pure `diffScenarios()` for in-memory / zero-I/O comparison, accompanied by `diffScenariosById()` for database-backed scenario resolution via `getScenario()`.

### Phase 5 — Next.js API Routes
Located in `src/app/api/` and `src/lib/api/`:
- **App Router REST API Endpoints**: Exposes domain, data, and diff layers via 16 modular Next.js API route handlers:
  - `/api/projects`: POST (create), GET (list)
  - `/api/projects/[id]`: GET (lookup), DELETE (guarded hard delete with `?confirm=true` and `PROJECT_NOT_EMPTY` protection)
  - `/api/projects/[id]/tags`: PATCH (update curated tag suggestions)
  - `/api/scenarios`: POST (create scenario with server-side simulation calculation and optional Monte Carlo), GET (list by project)
  - `/api/scenarios/[id]`: GET (lookup), PATCH (update metadata), DELETE (guarded hard delete with `?confirm=true`)
  - `/api/scenarios/[id]/favorite`: POST (toggle favorite state)
  - `/api/scenarios/[id]/archive`: POST (update soft-delete / archived state)
  - `/api/scenarios/[id]/children`: GET (retrieve child branched scenarios)
  - `/api/scenarios/search`: GET (search scenarios by text query, tag filter, and favorite filter)
  - `/api/simulate`: POST (pure deterministic simulation execution without storage I/O)
  - `/api/simulate/monte-carlo`: POST (pure probabilistic Monte Carlo simulation execution without storage I/O)
  - `/api/diff`: GET (pairwise scenario diffing and single-variable risk attribution via `?a=&b=`)
- **Uniform Response Envelope**: Every route strictly returns either `{ data: <payload> }` (HTTP 200) or `{ error: { code: string, message: string } }` (HTTP 4xx/5xx).
- **Domain & Output Integrity**: Enforces that client-supplied `deterministic_output` is never trusted or forwarded; the server always runs `simulate()` directly on the resolved inputs.
- **Input Validation via Zod**: Comprehensive request schemas in `src/lib/api/schemas.ts` with discriminated unions for probability distributions (`fixed`, `normal`, `uniform`).
- **Strict Error Guardrails**: Centralized error translation in `src/lib/api/errors.ts` mapping validation errors (400), confirmation requirements (400), not found errors (404), non-empty project deletions (409), and internal server errors (500 without leaking stack traces).

### Phase 6 — AI Layer
Located in `src/ai/` and `src/app/api/ai/`:
- **Strict Separation of AI from Calculation Truth**: The AI never calculates or invents simulation numbers — it only extracts user intent from free text or explains pre-computed diff metrics:
  1. **Natural-Language Scenario Intent Parsing (`parseScenarioIntent`)**: Translates free-form conversational text (e.g., "cut budget 20%, add 2 people, push deadline back 4 weeks") into a structured `ScenarioIntentDelta` via OpenAI/Anthropic Structured Outputs with JSON schema enforcement. Multi-field extraction is the primary design.
  2. **Pure Intent Application (`applyIntentDelta`)**: A zero-AI, zero-I/O pure function applying `absolute`, `percent`, or unit `delta` modifications to baseline inputs to produce concrete `ScenarioInputs`. Does not validate business rules (e.g. non-positive values), deferring to `simulate()` downstream.
  3. **Bounded Diff Explanation (`explainScenarioDiff`)**: Translates pre-computed `ScenarioDiff` objects into plain-English summaries. Built entirely from diff fields, citing every attribution row in exact sort order and enforcing the verbatim disclaimer: *"These per-field contributions do NOT sum to the total risk change — do not claim they do, and do not imply the risk change can be fully decomposed into independent causes"*.
  4. **Deterministic Template Fallback**: Diff explanation never fails if AI is unconfigured or unreachable — it returns a byte-identical templated string with `source: "template-fallback"`.
- **Multi-Provider Fallback Chain (`_aiConnectorComplete`)**: Automatically attempts primary provider (`gpt-4o` for intent parsing, `gpt-4o-mini` for diff explanation) and fails over to secondary provider (`claude-3-5-sonnet-latest` / `claude-3-5-haiku-latest`). Throws `AiUnavailableError` only after all configured providers in the chain fail.
- **Dedicated AI API Endpoints**:
  - `POST /api/ai/parse-intent`: Returns `{ delta, resolvedInputs }`. Returns 503 `AI_UNAVAILABLE` when AI is unconfigured, directing users to structured sliders/forms. Never returns a `SimulationResult`.
  - `POST /api/ai/explain-diff`: Resolves scenarios by ID via `diffScenariosById` and returns `DiffExplanation`. Always returns 200 OK (with `source: "ai" | "template-fallback"`). Returns 404 `NOT_FOUND` if a scenario cannot be found.

---

## Directory Structure

```
decision-sim/
├── src/
│   ├── ai/
│   │   ├── types.ts                  # DeltaSpec, ScenarioIntentDelta, ParsedIntentResult, DiffExplanation
│   │   ├── modelConfig.ts            # ModelSpec & MODEL_CONFIG per task
│   │   ├── client.ts                 # Fallback chain _aiConnectorComplete, _providerConnectors, isAiConfigured
│   │   ├── errors.ts                 # AiUnavailableError class
│   │   ├── prompts.ts                # System prompts, JSON schema, and user prompt builders
│   │   ├── applyIntentDelta.ts       # Pure arithmetic delta resolver (zero AI)
│   │   ├── parseScenarioIntent.ts    # Intent parsing via structured JSON schema
│   │   ├── explainDiff.ts            # Bounded diff explanation with deterministic template fallback
│   │   └── __tests__/
│   │       ├── applyIntentDelta.test.ts    # Unit tests for delta arithmetic (17 tests)
│   │       ├── parseScenarioIntent.test.ts # Structured extraction tests (6 tests)
│   │       ├── explainDiff.test.ts         # Diff explanation & template fallback tests (5 tests)
│   │       └── client.test.ts              # Multi-provider fallback tests (6 tests)
│   ├── app/
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── parse-intent/
│   │       │   │   └── route.ts      # POST /api/ai/parse-intent
│   │       │   ├── explain-diff/
│   │       │   │   └── route.ts      # POST /api/ai/explain-diff
│   │       │   └── __tests__/
│   │       │       ├── parse-intent.test.ts # Route tests for parse-intent (4 tests)
│   │       │       └── explain-diff.test.ts # Route tests for explain-diff (4 tests)
│   │       ├── projects/
│   │       │   ├── route.ts          # POST (create), GET (list)
│   │       │   └── [id]/
│   │       │       ├── route.ts      # GET (lookup), DELETE (delete)
│   │       │       └── tags/
│   │       │           └── route.ts  # PATCH (update tag suggestions)
│   │       ├── scenarios/
│   │       │   ├── route.ts          # POST (create), GET (list by project)
│   │       │   ├── search/
│   │       │   │   └── route.ts      # GET (search scenarios)
│   │       │   └── [id]/
│   │       │       ├── route.ts      # GET (lookup), PATCH (update), DELETE (delete)
│   │       │       ├── favorite/
│   │       │       │   └── route.ts  # POST (toggle favorite)
│   │       │       ├── archive/
│   │       │       │   └── route.ts  # POST (set archived)
│   │       │       └── children/
│   │       │           └── route.ts  # GET (get children)
│   │       ├── simulate/
│   │       │   ├── route.ts          # POST (pure deterministic simulate)
│   │       │   └── monte-carlo/
│   │       │       └── route.ts      # POST (pure Monte Carlo simulate)
│   │       ├── diff/
│   │       │   └── route.ts          # GET (pairwise scenario diff)
│   │       └── __tests__/
│   │           ├── projects.test.ts  # Projects API integration tests (12 tests)
│   │           ├── scenarios.test.ts # Scenarios API integration tests (22 tests)
│   │           ├── simulate.test.ts  # Simulation API integration tests (4 tests)
│   │           └── diff.test.ts      # Diff API integration tests (3 tests)
│   ├── lib/
│   │   └── api/
│   │       ├── schemas.ts            # Zod request body schemas
│   │       ├── respond.ts            # Response envelope helpers (ok/fail)
│   │       └── errors.ts             # ApiError class & centralized error handler
│   ├── domain/
│   │   ├── constants.ts              # Calibration numbers & weights
│   │   ├── types.ts                  # Core domain types (ScenarioInputs, SimulationResult)
│   │   ├── simulation.ts             # Deterministic simulation engine (simulate())
│   │   ├── monteCarlo.ts             # Probabilistic Monte Carlo engine & runner
│   │   ├── diff.ts                   # Phase 4 pairwise diff & risk attribution engine
│   │   ├── index.ts                  # Public domain barrel export
│   │   └── __tests__/
│   │       ├── simulation.test.ts    # Phase 1 unit tests (35 tests)
│   │       ├── monteCarlo.test.ts    # Phase 2 Monte Carlo tests (37 tests)
│   │       └── diff.test.ts          # Phase 4 diff & attribution tests (14 tests)
│   └── data/
│       ├── schema.ts                 # Database entity records & error classes
│       ├── setup.sql                 # DDL migration script with all 6 indexes
│       ├── db.ts                     # Dual-mode (Postgres + in-memory fallback) database engine
│       └── __tests__/
│           └── db.test.ts            # Phase 3 persistence unit tests (24 tests)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Running the Test Suite

```bash
npm test
```

Run test suite with coverage:
```bash
npx vitest run --coverage
```

Type check:
```bash
npx tsc --noEmit
```
