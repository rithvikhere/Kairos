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

/** 15 Uniform Constraint Keys. */
export const ConstraintKeySchema = z.enum([
  "headcount",
  "budget",
  "deadlineWeeks",
  "scope",
  "teamSeniorityMix",
  "attritionRisk",
  "externalDependencyCount",
  "technicalDebtLevel",
  "scopeVolatility",
  "distributedTeamOverhead",
  "vendorLeadTimeWeeks",
  "regulatoryComplexity",
  "qualityRigor",
  "stakeholderCount",
  "teamFamiliarity",
]);

/** Setting for a single constraint with concrete numeric value. */
export const ConstraintSettingSchema = z.object({
  enabled: z.boolean(),
  value: z.number(),
});

/** Setting for a single constraint with scalar or probability distribution. */
export const UncertainConstraintSettingSchema = z.object({
  enabled: z.boolean(),
  value: NumericOrDistributionSchema,
});

function preprocessConstraints(val: unknown) {
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, any>;
    if ("constraints" in obj && typeof obj.constraints === "object" && obj.constraints !== null) {
      return val;
    }
    const constraints: Record<string, any> = {};
    for (const key of [
      "headcount",
      "budget",
      "deadlineWeeks",
      "scope",
      "teamSeniorityMix",
      "attritionRisk",
      "externalDependencyCount",
      "technicalDebtLevel",
      "scopeVolatility",
      "distributedTeamOverhead",
      "vendorLeadTimeWeeks",
      "regulatoryComplexity",
      "qualityRigor",
      "stakeholderCount",
      "teamFamiliarity",
    ]) {
      if (key in obj && obj[key] !== undefined) {
        constraints[key] = { enabled: true, value: obj[key] };
      }
    }
    return { constraints };
  }
  return val;
}

/** Uncertain inputs accepted by scenario models and Monte Carlo simulations. */
export const UncertainScenarioInputsSchema = z.preprocess(
  preprocessConstraints,
  z
    .object({
      constraints: z.record(ConstraintKeySchema, UncertainConstraintSettingSchema),
    })
    .refine(
      (data) => {
        const active = Object.values(data.constraints || {}).filter((c) => c.enabled);
        return active.length >= 1;
      },
      { message: "At least one constraint must be enabled" }
    )
);

/** Concrete scalar inputs required by the pure deterministic simulate() engine. */
export const ScenarioInputsSchema = z.preprocess(
  preprocessConstraints,
  z
    .object({
      constraints: z.record(ConstraintKeySchema, ConstraintSettingSchema),
    })
    .refine(
      (data) => {
        const active = Object.values(data.constraints || {}).filter((c) => c.enabled);
        return active.length >= 1;
      },
      { message: "At least one constraint must be enabled" }
    )
);

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

/** Options configuring a Monte Carlo run. */
export const MonteCarloOptionsSchema = z.object({
  iterations: z.number().int().positive().optional(),
  seed: z.number().int().optional(),
  bucketCount: z.number().int().positive().optional(),
  recordCheckpoints: z
    .object({
      every: z.number().int().positive(),
      metric: z.string().optional(),
    })
    .optional(),
  sampleTrials: z
    .object({
      count: z.number().int().positive(),
    })
    .optional(),
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
  monteCarloOptions: MonteCarloOptionsSchema.optional(),
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
  options: MonteCarloOptionsSchema.optional(),
});
