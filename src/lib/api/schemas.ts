import { z } from "zod";

/** Reusable tag collection validator. */
export const TagsSchema = z.array(z.string());

/** Discriminated union for probability distributions. */
export const FixedDistributionSchema = z.object({
  kind: z.literal("fixed"),
  value: z.number(),
});

export const NormalDistributionSchema = z.object({
  kind: z.literal("normal"),
  mean: z.number(),
  stddev: z.number(),
});

export const UniformDistributionSchema = z.object({
  kind: z.literal("uniform"),
  min: z.number(),
  max: z.number(),
});

export const DistributionSchema = z.discriminatedUnion("kind", [
  FixedDistributionSchema,
  NormalDistributionSchema,
  UniformDistributionSchema,
]);

/** Single lever input: either a concrete scalar or an explicit Distribution. */
export const NumericOrDistributionSchema = z.union([z.number(), DistributionSchema]);

/** Uncertain inputs accepted by scenario models and Monte Carlo simulations. */
export const UncertainScenarioInputsSchema = z.object({
  budget: NumericOrDistributionSchema,
  headcount: NumericOrDistributionSchema,
  deadlineWeeks: NumericOrDistributionSchema,
  scope: NumericOrDistributionSchema.optional(),
});

/** Concrete scalar inputs required by the pure deterministic simulate() engine. */
export const ScenarioInputsSchema = z.object({
  budget: z.number(),
  headcount: z.number(),
  deadlineWeeks: z.number(),
  scope: z.number().optional(),
});

/** Body schema for POST /api/projects. */
export const CreateProjectSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().nullable().optional(),
  suggestedTags: TagsSchema.optional(),
  suggested_tags: TagsSchema.optional(),
});

/** Body schema for PATCH /api/projects/[id]/tags. */
export const UpdateProjectTagsSchema = z.object({
  suggestedTags: TagsSchema,
});

/**
 * Body schema for POST /api/scenarios.
 *
 * Notice: deterministic_output and monte_carlo_output are explicitly NOT accepted.
 * Any client-supplied outputs are stripped away, guaranteeing that deterministic
 * outputs are always computed server-side from inputs via simulate().
 */
export const CreateScenarioSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  parentScenarioId: z.string().nullable().optional(),
  name: z.string().min(1, "name is required"),
  description: z.string().nullable().optional(),
  tags: TagsSchema.optional(),
  inputs: UncertainScenarioInputsSchema,
  runMonteCarlo: z.boolean().optional().default(false),
  monteCarloOptions: z
    .object({
      iterations: z.number().int().positive().optional(),
      seed: z.number().int().optional(),
    })
    .optional(),
});

/** Body schema for PATCH /api/scenarios/[id]. */
export const UpdateScenarioSchema = z.object({
  name: z.string().min(1, "name cannot be empty").optional(),
  description: z.string().nullable().optional(),
  tags: TagsSchema.optional(),
});

/** Body schema for POST /api/scenarios/[id]/archive. */
export const ArchiveScenarioSchema = z.object({
  archived: z.boolean(),
});

/** Body schema for POST /api/simulate/monte-carlo. */
export const SimulateMonteCarloSchema = z.object({
  inputs: UncertainScenarioInputsSchema,
  options: z
    .object({
      iterations: z.number().int().positive().optional(),
      seed: z.number().int().optional(),
      bucketCount: z.number().int().positive().optional(),
    })
    .optional(),
});
