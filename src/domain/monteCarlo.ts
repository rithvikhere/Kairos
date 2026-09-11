/**
 * Monte Carlo simulation layer.
 *
 * This module wraps the deterministic core `simulate()` in a probabilistic
 * sampling framework. In real-world project planning, key levers such as
 * budget, available headcount, delivery deadlines, and overall scope are rarely
 * known with absolute certainty.
 *
 * Rather than forcing stakeholders to pick single point estimates, this layer
 * models inputs as probability distributions (fixed point values, uniform ranges,
 * or normal distributions). By taking repeated pseudo-random draws from these
 * input distributions and evaluating each draw through the real `simulate()`
 * function, we construct full empirical probability distributions across all
 * simulation outputs (cost, time, risk, utilizations, feasibility).
 *
 * Philosophy:
 * - Deterministic core remains untouched: every sample is evaluated by the exact
 *   formulas in `simulation.ts`.
 * - Credibility & traceability: output distributions reflect the combined variance
 *   of the inputs propagated through explicit formulas — nothing is synthesized
 *   by AI or heuristic shortcuts.
 * - Reproducibility: an optional seed parameter enables byte-for-byte reproducible
 *   runs via a self-contained PRNG (mulberry32).
 */

import { DEFAULT_SCOPE_PERSON_WEEKS } from "./constants.js";
import { InvalidScenarioError, simulate } from "./simulation.js";
import type { ScenarioInputs, SimulationResult } from "./types.js";

/**
 * Specification for an input distribution.
 *
 * - `fixed`: A deterministic point estimate. Always returns `value`.
 * - `normal`: A Gaussian distribution with specified `mean` and `stddev`.
 * - `uniform`: A continuous uniform distribution bounded in `[min, max]`.
 */
export type Distribution =
  | { kind: "fixed"; value: number }
  | { kind: "normal"; mean: number; stddev: number }
  | { kind: "uniform"; min: number; max: number };

/**
 * Levers for a scenario where each numeric parameter can be either a concrete
 * number (treated as a fixed point estimate) or a probability distribution.
 */
export interface UncertainScenarioInputs {
  /** Total budget available, or a distribution over budget in dollars. */
  budget: number | Distribution;
  /** Team headcount, or a distribution over headcount. */
  headcount: number | Distribution;
  /** Delivery deadline in weeks, or a distribution over deadline. */
  deadlineWeeks: number | Distribution;
  /**
   * Total effort in person-weeks, or a distribution over effort.
   * Defaults to DEFAULT_SCOPE_PERSON_WEEKS if omitted.
   */
  scope?: number | Distribution;
}

/**
 * Normalized scenario inputs where all numeric fields are guaranteed to be
 * explicit `Distribution` objects.
 */
export interface NormalizedUncertainScenarioInputs {
  budget: Distribution;
  headcount: Distribution;
  deadlineWeeks: Distribution;
  scope: Distribution;
}

/**
 * Statistical summary of a metric's distribution across Monte Carlo iterations.
 */
export interface DistributionSummary {
  /** Expected value (arithmetic mean) across valid runs. */
  mean: number;
  /** Median (50th percentile) across valid runs. */
  median: number;
  /** Sample standard deviation across valid runs (0 if invariant or N <= 1). */
  stddev: number;
  /** Minimum observed value across valid runs. */
  min: number;
  /** Maximum observed value across valid runs. */
  max: number;
  /** Key percentiles for assessing risk and confidence intervals. */
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  /** Empirical frequency distribution divided into contiguous buckets. */
  histogram: Array<{
    bucketStart: number;
    bucketEnd: number;
    count: number;
  }>;
}

/** Alias for DistributionSummary. */
export type MetricDistributionSummary = DistributionSummary;

/**
 * Comprehensive results from a Monte Carlo simulation execution.
 */
export interface MonteCarloResult {
  /** Total iterations requested by the caller. */
  iterationsRequested: number;
  /** Iterations successfully evaluated post-validation filtering. */
  iterationsActuallyUsed: number;
  /** Alias for iterationsActuallyUsed. */
  iterationsUsed: number;
  /** Number of iterations dropped due to invalid sampled inputs (e.g. non-positive values). */
  skippedIterations: number;
  /** Fraction of valid runs where the scenario was feasible (0.0 to 1.0). */
  feasibleRate: number;
  /** Alias for feasibleRate. */
  feasibilityRate: number;

  /** Distribution of estimated calendar time in weeks. */
  estimatedTimeWeeks: DistributionSummary;
  /** Distribution of effective headcount adjusted for coordination overhead. */
  effectiveHeadcount: DistributionSummary;
  /** Distribution of true project cost in dollars. */
  actualCost: DistributionSummary;
  /** Distribution of budget utilization (cost / budget). */
  budgetUtilization: DistributionSummary;
  /** Distribution of schedule utilization (time / deadline). */
  scheduleUtilization: DistributionSummary;
  /** Distribution of composite risk score (0 to 100). */
  riskScore: DistributionSummary;
}

/** Options configuring a Monte Carlo simulation run. */
export interface MonteCarloOptions {
  /** Number of sampling iterations to perform. Defaults to 2000. */
  iterations?: number;
  /** Optional integer seed for repeatable, deterministic pseudo-random sequences. */
  seed?: number;
  /** Number of histogram bins to generate for metric summaries. Defaults to 10. */
  bucketCount?: number;
}

/**
 * 32-bit Mulberry32 seeded pseudo-random number generator.
 *
 * Produces high-quality uniform floats in [0, 1) using simple 32-bit arithmetic,
 * without requiring external dependencies.
 *
 * @param seed - Any integer seed value.
 * @returns A zero-argument function returning a pseudo-random number in [0, 1).
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
 *
 * Shorthand plain numbers are converted into `{ kind: "fixed", value: input }`.
 *
 * @param input - Numeric value or Distribution object.
 * @returns A canonical Distribution object.
 */
export function normalizeDistribution(input: number | Distribution): Distribution {
  if (typeof input === "number") {
    return { kind: "fixed", value: input };
  }
  return input;
}

/**
 * Normalizes all fields of an UncertainScenarioInputs object, filling default scope if omitted.
 *
 * @param inputs - Raw uncertain scenario inputs.
 * @returns Fully normalized inputs where every property is a Distribution.
 */
export function normalizeUncertainInputs(
  inputs: UncertainScenarioInputs
): NormalizedUncertainScenarioInputs {
  return {
    budget: normalizeDistribution(inputs.budget),
    headcount: normalizeDistribution(inputs.headcount),
    deadlineWeeks: normalizeDistribution(inputs.deadlineWeeks),
    scope:
      inputs.scope !== undefined
        ? normalizeDistribution(inputs.scope)
        : { kind: "fixed", value: DEFAULT_SCOPE_PERSON_WEEKS },
  };
}

/**
 * Samples a single standard normal variate using the Box-Muller transform,
 * scaled to the requested mean and standard deviation.
 *
 * Consumes exactly two draws from the provided RNG to ensure consistent PRNG state progression.
 *
 * @param mean - Center of the Gaussian distribution.
 * @param stddev - Standard deviation of the Gaussian distribution.
 * @param rng - Pseudo-random generator returning numbers in [0, 1).
 * @returns A sampled floating-point value.
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
 *
 * @param dist - The distribution to sample from.
 * @param rng - Pseudo-random generator returning numbers in [0, 1).
 * @returns A concrete numeric sample.
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
 * Samples each field of an UncertainScenarioInputs once to produce one concrete ScenarioInputs.
 *
 * Sampling order is deterministic (`budget`, `headcount`, `deadlineWeeks`, `scope`)
 * to ensure that identical seeds always generate identical scenario trajectories.
 *
 * @param inputs - Uncertain scenario levers.
 * @param rng - Pseudo-random generator returning numbers in [0, 1).
 * @returns A single concrete ScenarioInputs ready for simulation.
 */
export function sampleScenarioInputs(
  inputs: UncertainScenarioInputs,
  rng: () => number
): ScenarioInputs {
  const normalized = normalizeUncertainInputs(inputs);
  return {
    budget: sampleDistribution(normalized.budget, rng),
    headcount: sampleDistribution(normalized.headcount, rng),
    deadlineWeeks: sampleDistribution(normalized.deadlineWeeks, rng),
    scope: sampleDistribution(normalized.scope, rng),
  };
}

/**
 * Calculates a percentile value from a sorted array using standard linear interpolation.
 *
 * @param sorted - Non-empty array of numbers sorted in ascending order.
 * @param p - Percentile target between 0.0 and 1.0 (e.g. 0.5 for median).
 * @returns The interpolated percentile value.
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
 *
 * When all values are identical (min === max), returns a single bucket containing
 * the entire population to avoid degenerate zero-width intervals.
 *
 * @param values - Array of observed values.
 * @param min - Minimum value in the dataset.
 * @param max - Maximum value in the dataset.
 * @param bucketCount - Number of equal-width bins (defaults to 10).
 * @returns Array of bucket ranges and their occurrence counts.
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
 * Computes statistical distribution metrics (mean, median, stddev, percentiles, histogram)
 * for a series of observations.
 *
 * @param values - Numeric samples collected across simulation runs.
 * @param bucketCount - Number of histogram bins (defaults to 10).
 * @returns A complete DistributionSummary.
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

  // If all values are identical, return exact values with 0 stddev
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

  // Sample standard deviation with Bessel's correction (n - 1)
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
 *
 * Evaluates `iterations` pseudo-randomly sampled scenarios using the deterministic
 * `simulate()` engine. If a sampled scenario produces invalid inputs (e.g., negative
 * headcount or non-positive budget resulting from normal distribution tails),
 * the iteration is safely skipped and recorded in `skippedIterations` rather than
 * terminating the run.
 *
 * @param inputs - Uncertain scenario inputs containing numbers or distribution specs.
 * @param options - Simulation options (iterations count, random seed, histogram bucket count).
 * @returns Aggregated distribution summaries for all simulation outputs and feasibility rate.
 */
export function runMonteCarloSimulation(
  inputs: UncertainScenarioInputs,
  options?: MonteCarloOptions
): MonteCarloResult {
  const iterationsRequested = options?.iterations ?? 2000;
  const bucketCount = options?.bucketCount ?? 10;
  const rng = options?.seed !== undefined ? mulberry32(options.seed) : Math.random;

  const validResults: SimulationResult[] = [];
  let skippedIterations = 0;

  for (let i = 0; i < iterationsRequested; i++) {
    const sampled = sampleScenarioInputs(inputs, rng);
    try {
      const result = simulate(sampled);
      validResults.push(result);
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

  const estimatedTimeWeeksValues = validResults.map((r) => r.estimatedTimeWeeks);
  const effectiveHeadcountValues = validResults.map((r) => r.effectiveHeadcount);
  const actualCostValues = validResults.map((r) => r.actualCost);
  const budgetUtilizationValues = validResults.map((r) => r.budgetUtilization);
  const scheduleUtilizationValues = validResults.map((r) => r.scheduleUtilization);
  const riskScoreValues = validResults.map((r) => r.riskScore);

  return {
    iterationsRequested,
    iterationsActuallyUsed,
    iterationsUsed: iterationsActuallyUsed,
    skippedIterations,
    feasibleRate,
    feasibilityRate: feasibleRate,
    estimatedTimeWeeks: summarizeDistribution(estimatedTimeWeeksValues, bucketCount),
    effectiveHeadcount: summarizeDistribution(effectiveHeadcountValues, bucketCount),
    actualCost: summarizeDistribution(actualCostValues, bucketCount),
    budgetUtilization: summarizeDistribution(budgetUtilizationValues, bucketCount),
    scheduleUtilization: summarizeDistribution(scheduleUtilizationValues, bucketCount),
    riskScore: summarizeDistribution(riskScoreValues, bucketCount),
  };
}
