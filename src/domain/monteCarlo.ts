/**
 * Monte Carlo simulation layer for Phase 8.
 *
 * Implements stochastic sampling over the uniform 15-constraint model.
 * Each constraint's setting can wrap a concrete numeric value or a Distribution
 * (fixed, uniform, normal).
 *
 * Provides convergence checkpoint tracking and trial scatter sampling.
 */

import { DEFAULT_SCOPE_PERSON_WEEKS } from "./constants.js";
import { InvalidScenarioError, simulate } from "./simulation.js";
import type {
  ConstraintKey,
  ScenarioInputs,
  SimulationResult,
} from "./types.js";

/**
 * Specification for an input distribution.
 */
export type Distribution =
  | { kind: "fixed"; value: number }
  | { kind: "normal"; mean: number; stddev: number }
  | { kind: "uniform"; min: number; max: number };

/**
 * An individual uncertain constraint setting.
 */
export interface UncertainConstraintSetting {
  enabled: boolean;
  value: number | Distribution;
}

/**
 * Uncertain inputs for Monte Carlo simulations: uniform constraints where values can be Distributions.
 */
export interface UncertainScenarioInputs {
  constraints: Partial<Record<ConstraintKey, UncertainConstraintSetting>>;
}

/**
 * Statistical summary of a metric's distribution across Monte Carlo iterations.
 */
export interface DistributionSummary {
  mean: number;
  median: number;
  stddev: number;
  min: number;
  max: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  histogram: Array<{
    bucketStart: number;
    bucketEnd: number;
    count: number;
  }>;
}

export type MetricDistributionSummary = DistributionSummary;

/**
 * Comprehensive results from a Monte Carlo simulation execution.
 */
export interface MonteCarloResult {
  iterationsRequested: number;
  iterationsActuallyUsed: number;
  iterationsUsed: number;
  skippedIterations: number;
  feasibleRate: number;
  feasibilityRate: number;
  probabilityOnTime: number;
  probabilityWithinBudget: number;

  estimatedTimeWeeks: DistributionSummary;
  effectiveHeadcount: DistributionSummary;
  actualCost: DistributionSummary;
  budgetUtilization: DistributionSummary;
  scheduleUtilization: DistributionSummary;
  riskScore: DistributionSummary;

  /** Running-mean snapshots recording convergence across trials. */
  convergence?: Array<{ iteration: number; runningMean: number }>;
  /** Representative sample of raw trial outcomes for scatter plotting. */
  trialSample?: Array<{
    actualCost: number;
    estimatedTimeWeeks: number;
    feasible: boolean;
  }>;
}

/** Options configuring a Monte Carlo simulation run. */
export interface MonteCarloOptions {
  iterations?: number;
  seed?: number;
  bucketCount?: number;
  /** Snapshot running mean of the target metric every N trials. */
  recordCheckpoints?: { every: number; metric?: string };
  /** Retain a representative sample of N raw trial outcomes. */
  sampleTrials?: { count: number };
}

/**
 * 32-bit Mulberry32 seeded pseudo-random number generator.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Normalizes a number or Distribution specification into a canonical Distribution object.
 */
export function normalizeDistribution(input: number | Distribution): Distribution {
  if (typeof input === "number") {
    return { kind: "fixed", value: input };
  }
  return input;
}

/**
 * Normalizes uncertain inputs from either constraints dictionary or legacy flat levers.
 */
export function normalizeUncertainInputs(inputs: UncertainScenarioInputs | any): any {
  if (!inputs) return { constraints: {} };

  if (inputs.constraints && typeof inputs.constraints === "object") {
    return inputs;
  }

  const budget = normalizeDistribution(inputs.budget);
  const headcount = normalizeDistribution(inputs.headcount);
  const deadlineWeeks = normalizeDistribution(inputs.deadlineWeeks);
  const scope =
    inputs.scope !== undefined
      ? normalizeDistribution(inputs.scope)
      : { kind: "fixed" as const, value: DEFAULT_SCOPE_PERSON_WEEKS };

  const constraints: Partial<Record<ConstraintKey, UncertainConstraintSetting>> = {
    budget: { enabled: true, value: budget },
    headcount: { enabled: true, value: headcount },
    deadlineWeeks: { enabled: true, value: deadlineWeeks },
    scope: { enabled: true, value: scope },
  };

  return {
    constraints,
    budget,
    headcount,
    deadlineWeeks,
    scope,
  };
}

/**
 * Samples a single standard normal variate using the Box-Muller transform.
 */
export function sampleNormal(mean: number, stddev: number, rng: () => number): number {
  if (stddev === 0) return mean;
  const u1 = Math.max(Number.MIN_VALUE, 1 - rng());
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stddev * z;
}

/**
 * Draws a single numeric sample from a distribution specification.
 */
export function sampleDistribution(dist: Distribution, rng: () => number): number {
  switch (dist.kind) {
    case "fixed":
      return dist.value;
    case "uniform":
      return dist.min + rng() * (dist.max - dist.min);
    case "normal":
      return sampleNormal(dist.mean, dist.stddev, rng);
  }
}

/**
 * Samples each active constraint of an UncertainScenarioInputs once to produce a concrete ScenarioInputs.
 */
export function sampleScenarioInputs(
  inputs: UncertainScenarioInputs | any,
  rng: () => number
): ScenarioInputs & {
  budget?: number;
  headcount?: number;
  deadlineWeeks?: number;
  scope?: number;
} {
  const normalizedInputs = normalizeUncertainInputs(inputs);
  const sampledConstraints: Partial<Record<ConstraintKey, { enabled: boolean; value: number }>> = {};

  const keys = (Object.keys(normalizedInputs.constraints) as ConstraintKey[]).sort();

  for (const key of keys) {
    const setting = normalizedInputs.constraints[key];
    if (!setting) continue;

    if (setting.enabled) {
      const dist = normalizeDistribution(setting.value);
      const val = sampleDistribution(dist, rng);
      sampledConstraints[key] = { enabled: true, value: val };
    } else {
      sampledConstraints[key] = {
        enabled: false,
        value: typeof setting.value === "number" ? setting.value : 0,
      };
    }
  }

  // Ensure default scope if headcount is enabled and scope constraint was omitted
  if (sampledConstraints.headcount?.enabled && !sampledConstraints.scope) {
    sampledConstraints.scope = { enabled: true, value: DEFAULT_SCOPE_PERSON_WEEKS };
  }

  const result: any = { constraints: sampledConstraints };
  if (sampledConstraints.budget?.enabled) result.budget = sampledConstraints.budget.value;
  if (sampledConstraints.headcount?.enabled) result.headcount = sampledConstraints.headcount.value;
  if (sampledConstraints.deadlineWeeks?.enabled) result.deadlineWeeks = sampledConstraints.deadlineWeeks.value;
  if (sampledConstraints.scope?.enabled) result.scope = sampledConstraints.scope.value;

  return result;
}

/**
 * Calculates a percentile value from a sorted array using linear interpolation.
 */
export function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return (1 - weight) * sorted[lower]! + weight * sorted[upper]!;
}

/**
 * Groups an array of numbers into contiguous histogram buckets.
 */
export function createHistogram(
  values: number[],
  min: number,
  max: number,
  bucketCount: number = 10
): Array<{ bucketStart: number; bucketEnd: number; count: number }> {
  if (values.length === 0) return [];

  if (min === max) {
    return [{ bucketStart: min, bucketEnd: max, count: values.length }];
  }

  const width = (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    bucketStart: min + i * width,
    bucketEnd: i === bucketCount - 1 ? max : min + (i + 1) * width,
    count: 0,
  }));

  for (const val of values) {
    const rawIndex = Math.floor((val - min) / width);
    const index = Math.max(0, Math.min(bucketCount - 1, rawIndex));
    buckets[index]!.count++;
  }

  return buckets;
}

/**
 * Computes statistical distribution metrics for a series of observations.
 */
export function summarizeDistribution(
  values: number[],
  bucketCount: number = 10
): DistributionSummary {
  const n = values.length;
  if (n === 0) {
    return {
      mean: 0,
      median: 0,
      stddev: 0,
      min: 0,
      max: 0,
      percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
      histogram: [],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[n - 1]!;

  if (min === max) {
    return {
      mean: min,
      median: min,
      stddev: 0,
      min,
      max,
      percentiles: {
        p10: min,
        p25: min,
        p50: min,
        p75: min,
        p90: min,
      },
      histogram: createHistogram(values, min, max, bucketCount),
    };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  const sumSquaredDiff = values.reduce((acc, val) => acc + (val - mean) ** 2, 0);
  const variance = n > 1 ? sumSquaredDiff / (n - 1) : 0;
  const stddev = Math.sqrt(Math.max(0, variance));

  const percentiles = {
    p10: calculatePercentile(sorted, 0.1),
    p25: calculatePercentile(sorted, 0.25),
    p50: calculatePercentile(sorted, 0.5),
    p75: calculatePercentile(sorted, 0.75),
    p90: calculatePercentile(sorted, 0.9),
  };

  return {
    mean,
    median: percentiles.p50,
    stddev,
    min,
    max,
    percentiles,
    histogram: createHistogram(values, min, max, bucketCount),
  };
}

/**
 * Executes a Monte Carlo simulation over uncertain scenario inputs.
 */
export function runMonteCarloSimulation(
  rawInputs: UncertainScenarioInputs | any,
  options?: MonteCarloOptions
): MonteCarloResult {
  const inputs = normalizeUncertainInputs(rawInputs);
  const iterationsRequested = options?.iterations ?? 2000;
  const bucketCount = options?.bucketCount ?? 10;
  const rng = options?.seed !== undefined ? mulberry32(options.seed) : Math.random;

  const validResults: SimulationResult[] = [];
  let skippedIterations = 0;

  // Checkpoint tracking state
  const checkpointEvery = options?.recordCheckpoints?.every;
  const targetMetric = options?.recordCheckpoints?.metric ?? "actualCost";
  const convergence: Array<{ iteration: number; runningMean: number }> = [];
  let runningTargetMetricSum = 0;

  for (let i = 0; i < iterationsRequested; i++) {
    const sampled = sampleScenarioInputs(inputs, rng);
    try {
      const result = simulate(sampled);
      validResults.push(result);

      if (checkpointEvery && checkpointEvery > 0) {
        const metricVal =
          result.computed[targetMetric] ?? (result as Record<string, any>)[targetMetric] ?? 0;
        runningTargetMetricSum += metricVal;
        const currentCount = validResults.length;
        if (currentCount % checkpointEvery === 0) {
          convergence.push({
            iteration: currentCount,
            runningMean: runningTargetMetricSum / currentCount,
          });
        }
      }
    } catch (err) {
      if (err instanceof InvalidScenarioError) {
        skippedIterations++;
      } else {
        throw err;
      }
    }
  }

  const iterationsActuallyUsed = validResults.length;
  const feasibleCount = validResults.filter((r) => r.feasible).length;
  const feasibleRate = iterationsActuallyUsed > 0 ? feasibleCount / iterationsActuallyUsed : 0;

  const onTimeCount = validResults.filter(
    (r) => (r.computed.scheduleUtilization ?? (r as any).scheduleUtilization ?? 0) <= 1
  ).length;
  const probabilityOnTime = iterationsActuallyUsed > 0 ? onTimeCount / iterationsActuallyUsed : 0;

  const withinBudgetCount = validResults.filter(
    (r) => (r.computed.budgetUtilization ?? (r as any).budgetUtilization ?? 0) <= 1
  ).length;
  const probabilityWithinBudget =
    iterationsActuallyUsed > 0 ? withinBudgetCount / iterationsActuallyUsed : 0;

  const estimatedTimeWeeksValues = validResults.map(
    (r) => r.computed.estimatedTimeWeeks ?? (r as any).estimatedTimeWeeks ?? 0
  );
  const effectiveHeadcountValues = validResults.map(
    (r) => r.computed.effectiveHeadcount ?? (r as any).effectiveHeadcount ?? 0
  );
  const actualCostValues = validResults.map(
    (r) => r.computed.actualCost ?? (r as any).actualCost ?? 0
  );
  const budgetUtilizationValues = validResults.map(
    (r) => r.computed.budgetUtilization ?? (r as any).budgetUtilization ?? 0
  );
  const scheduleUtilizationValues = validResults.map(
    (r) => r.computed.scheduleUtilization ?? (r as any).scheduleUtilization ?? 0
  );
  const riskScoreValues = validResults.map((r) => r.riskScore);

  const costSummary = summarizeDistribution(actualCostValues, bucketCount);
  const timeSummary = summarizeDistribution(estimatedTimeWeeksValues, bucketCount);
  const riskSummary = summarizeDistribution(riskScoreValues, bucketCount);

  // Finalize convergence checkpoints: guarantee final checkpoint matches overall mean exactly
  let finalizedConvergence: Array<{ iteration: number; runningMean: number }> | undefined = undefined;
  if (checkpointEvery && checkpointEvery > 0 && iterationsActuallyUsed > 0) {
    const overallMean =
      targetMetric === "actualCost"
        ? costSummary.mean
        : targetMetric === "riskScore"
        ? riskSummary.mean
        : targetMetric === "estimatedTimeWeeks"
        ? timeSummary.mean
        : runningTargetMetricSum / iterationsActuallyUsed;

    if (
      convergence.length === 0 ||
      convergence[convergence.length - 1]!.iteration !== iterationsActuallyUsed
    ) {
      convergence.push({
        iteration: iterationsActuallyUsed,
        runningMean: overallMean,
      });
    } else {
      convergence[convergence.length - 1]!.runningMean = overallMean;
    }
    finalizedConvergence = convergence;
  }

  // Representative trial sampling for scatter plotting (systematic evenly-spaced sampling)
  let trialSample: Array<{ actualCost: number; estimatedTimeWeeks: number; feasible: boolean }> | undefined = undefined;
  if (options?.sampleTrials?.count && options.sampleTrials.count > 0 && iterationsActuallyUsed > 0) {
    const sampleCount = Math.min(options.sampleTrials.count, iterationsActuallyUsed);
    trialSample = [];
    const step = iterationsActuallyUsed / sampleCount;
    for (let i = 0; i < sampleCount; i++) {
      const idx = Math.min(iterationsActuallyUsed - 1, Math.floor(i * step));
      const res = validResults[idx]!;
      trialSample.push({
        actualCost: res.computed.actualCost ?? (res as any).actualCost ?? 0,
        estimatedTimeWeeks: res.computed.estimatedTimeWeeks ?? (res as any).estimatedTimeWeeks ?? 0,
        feasible: res.feasible,
      });
    }
  }

  return {
    iterationsRequested,
    iterationsActuallyUsed,
    iterationsUsed: iterationsActuallyUsed,
    skippedIterations,
    feasibleRate,
    feasibilityRate: feasibleRate,
    probabilityOnTime,
    probabilityWithinBudget,
    estimatedTimeWeeks: timeSummary,
    effectiveHeadcount: summarizeDistribution(effectiveHeadcountValues, bucketCount),
    actualCost: costSummary,
    budgetUtilization: summarizeDistribution(budgetUtilizationValues, bucketCount),
    scheduleUtilization: summarizeDistribution(scheduleUtilizationValues, bucketCount),
    riskScore: riskSummary,
    ...(finalizedConvergence ? { convergence: finalizedConvergence } : {}),
    ...(trialSample ? { trialSample } : {}),
  };
}
