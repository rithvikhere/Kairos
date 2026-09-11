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

---

## Directory Structure

```
decision-sim/
├── src/
│   └── domain/
│       ├── constants.ts              # Calibration numbers & weights
│       ├── types.ts                  # Core domain types (ScenarioInputs, SimulationResult)
│       ├── simulation.ts             # Deterministic simulation engine (simulate())
│       ├── monteCarlo.ts             # Probabilistic Monte Carlo engine & runner
│       ├── index.ts                  # Public barrel export
│       └── __tests__/
│           ├── simulation.test.ts    # Phase 1 unit tests (35 tests)
│           └── monteCarlo.test.ts    # Phase 2 Monte Carlo tests (33 tests)
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
