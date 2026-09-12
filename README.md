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

## Environment Configuration

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | (none — uses in-memory map engine) |
| `OPENAI_API_KEY` | OpenAI API authentication key | (none) |
| `ANTHROPIC_API_KEY` | Anthropic API authentication key | (none) |
| `AI_PROVIDER_INTENT_PARSING` | Primary provider for scenario intent extraction | `openai` |
| `AI_MODEL_INTENT_PARSING` | Primary model for scenario intent extraction | `gpt-4o` |
| `AI_PROVIDER_DIFF_EXPLANATION` | Primary provider for bounded diff explanation | `openai` |
| `AI_MODEL_DIFF_EXPLANATION` | Primary model for bounded diff explanation | `gpt-4o-mini` |
| `AI_FALLBACK_MODEL_INTENT_PARSING` | Secondary fallback model for intent parsing | `claude-3-5-sonnet-latest` |
| `AI_FALLBACK_MODEL_DIFF_EXPLANATION` | Secondary fallback model for diff explanation | `claude-3-5-haiku-latest` |

---

## Running the Test Suite

```bash
npm test
```

### Test Suite Breakdown (193 Tests across 14 Suites)

| Test File | Phase | Tests | Focus Area |
|---|---|---|---|
| `src/domain/__tests__/simulation.test.ts` | Phase 1 | 35 | Pure simulation, Brooks's law, risk breakdown, validation |
| `src/domain/__tests__/monteCarlo.test.ts` | Phase 2 | 37 | PRNG, Box-Muller, distributions, percentiles, histograms |
| `src/data/__tests__/db.test.ts` | Phase 3 | 24 | In-memory & Postgres CRUD, constraints, search, archiving |
| `src/domain/__tests__/diff.test.ts` | Phase 4 | 14 | Pairwise deltas, isolated risk attribution, non-additivity |
| `src/app/api/__tests__/projects.test.ts` | Phase 5 | 12 | Project creation, lookup, tag patching, cascade protection |
| `src/app/api/__tests__/scenarios.test.ts` | Phase 5 | 22 | Scenario CRUD, branching, favorites, search, pagination |
| `src/app/api/__tests__/simulate.test.ts` | Phase 5 | 4 | Stateless deterministic & Monte Carlo simulation routes |
| `src/app/api/__tests__/diff.test.ts` | Phase 5 | 3 | Scenario diff endpoint with 400 & 404 validation |
| `src/ai/__tests__/applyIntentDelta.test.ts` | Phase 6 | 17 | Pure delta arithmetic (absolute, percent, delta, multi-field) |
| `src/ai/__tests__/client.test.ts` | Phase 6 | 6 | Multi-provider fallback chain, connector invocation, error handling |
| `src/ai/__tests__/explainDiff.test.ts` | Phase 6 | 5 | Diff prompt generation, AI success, deterministic template fallback |
| `src/ai/__tests__/parseScenarioIntent.test.ts` | Phase 6 | 6 | Multi-field structured JSON extraction, error handling, unconfigured AI |
| `src/app/api/ai/__tests__/parse-intent.test.ts` | Phase 6 | 4 | POST /api/ai/parse-intent endpoint (200, 400, 503 AI_UNAVAILABLE) |
| `src/app/api/ai/__tests__/explain-diff.test.ts` | Phase 6 | 4 | POST /api/ai/explain-diff endpoint (200 AI, 200 template, 404) |
| `src/lib/__tests__/riskBand.test.ts` | Phase 7 | 10 | RiskBand threshold boundaries, FEASIBILITY_RISK_THRESHOLD alignment, color map |
| `src/lib/__tests__/api-client.test.ts` | Phase 7 | 9 | Fetch wrapper, query serialization, confirm=true on delete, ApiClientError codes |
| `src/components/background/__tests__/RiskSilkBackground.test.tsx` | Phase 7 | 3 | WebGL Silk integration, prefers-reduced-motion static fallback fill |
| `src/components/diff/__tests__/ScenarioDiffTable.test.tsx` | Phase 7 | 1 | All input lever shifts & output metric deltas rendered with direction arrows |
| `src/components/diff/__tests__/DiffExplanationPanel.test.tsx` | Phase 7 | 2 | Distinct rendering of AI-generated vs Computed directly badges |
| **Total (Vitest)** | **Phases 1–7** | **218** | **All 19 suites passing with 100% success** |
| `e2e/scenario-flow.spec.ts` | Phase 7 | 1 (E2E) | Full happy path: create project → build scenario → fork via NL → compare → explanation |

---

## Phase 7: Frontend Architecture & User Interface

Phase 7 delivers the complete frontend presentation layer for Kairos, purposely rejecting generic "AI SaaS" templates (blue/purple gradients, generic rounded cards on pure white) in favor of an editorial, warm, publication-grade analytical aesthetic.

### 1. Palette System & Chromatic Rationale

The palette establishes a strict distinction between **cool interactive chrome** and **warm functional risk indicators**:

| Token | Hex | Role | Visual Rationale |
|---|---|---|---|
| **Base** | `#f5f2ec` | Background | Warm bone — replaces pure `#ffffff` to reduce glare and convey warmth. |
| **Ink** | `#1f2421` | Typography & Icons | Deep forest-charcoal — soft high-contrast dark tone. |
| **Accent** | `#3a5a6b` | Primary controls & focus | Deep petrol/slate-teal (cool) — solid color representing "this is the application chrome". |
| **Neutral** | `#e8e3d8` | Borders & Cards | Warm greige card and divider lines. |
| **Risk: Low** | `#e6ede3` | RiskBand: `low` | Soft sage — calm, feasible. |
| **Risk: Moderate** | `#f2e6c8` | RiskBand: `moderate` | Honey amber — feasible warning territory. |
| **Risk: High** | `#eccb9c` | RiskBand: `high` | Amber copper — infeasible zone entrance (riskScore ≥ 50). |
| **Risk: Critical** | `#d99a8a` | RiskBand: `critical` | Deep brick red — extreme schedule/cost strain or explicit infeasibility. |

### 2. Typography Pairing
- **Headings & Scenario Display Names**: **Fraunces** (Google Fonts variable serif display face, editorial and dignified).
- **Data, Numbers, Metrics & UI Chrome**: **Plus Jakarta Sans** (Google Fonts crisp geometric grotesque with high tabular legibility).

### 3. RiskBand Derivation (`src/lib/riskBand.ts`)
A pure client-side derivation aligned with `FEASIBILITY_RISK_THRESHOLD = 50`:
- `riskScore < 25` → `"low"`
- `25 <= riskScore < 50` → `"moderate"` (feasible)
- `50 <= riskScore < 75` → `"high"` (infeasible zone begins here)
- `riskScore >= 75` OR `!feasible` → `"critical"`

### 4. Animation Strategy & React Bits Primitives
- **Interactive WebGL Background**: `Silk-TS-TW` (`@react-bits/Silk-TS-TW`) via Three.js / React Three Fiber, interpolating colors and noise intensity across risk bands. Falls back to static SVG fill when `prefers-reduced-motion` is detected.
- **Dynamic Counters**: `CountUp-TS-TW` (`@react-bits/CountUp-TS-TW`) provides real-time smooth numeric interpolation during slider drags and preview updates.
- **Narrative Explanation Reveal**: `TextType-TS-TW` (`@react-bits/TextType-TS-TW`) simulates an editorial typewriter reveal for diff explanations client-side without artificial streaming.
- **Physics**: Confident weighty press (`scale: 0.96`) for primary actions; deliberate, resistant, slower hover feel for destructive actions.

### 5. Data Layer Discipline
- `src/lib/api-client.ts` is the **single `fetch()` call site** across the entire application.
- Server state is managed exclusively by **TanStack Query** hooks (`useProjects`, `useScenarios`, `useScenarioDiff`, `useScenarioSimulatePreview`).
- UI-only state (sidebar collapsed, scenario comparison pair) is isolated in **Zustand** (`src/stores/uiStore.ts`).

### 6. Verification
```bash
# Run unit & component tests (218 passing across 19 suites)
npm test

# Run End-to-End browser test (Chromium, in-memory mode)
npx playwright test

# Build production Next.js bundle
npm run build
```


