export interface ModelSpec {
  provider: "openai" | "anthropic";
  model: string;
  temperature: number;
}

export const MODEL_CONFIG: Record<"intentParsing" | "diffExplanation", ModelSpec> = {
  intentParsing: {
    provider: (process.env.AI_PROVIDER_INTENT_PARSING as ModelSpec["provider"]) ?? "openai",
    model: process.env.AI_MODEL_INTENT_PARSING ?? "gpt-4o",
    temperature: 0.1,
  },
  diffExplanation: {
    provider: (process.env.AI_PROVIDER_DIFF_EXPLANATION as ModelSpec["provider"]) ?? "openai",
    model: process.env.AI_MODEL_DIFF_EXPLANATION ?? "gpt-4o-mini",
    temperature: 0.1,
  },
};
