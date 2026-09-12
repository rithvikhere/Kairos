import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { MODEL_CONFIG, type ModelSpec } from "./modelConfig.js";
import { AiUnavailableError } from "./errors.js";

export interface AiCallParams {
  task: "intentParsing" | "diffExplanation";
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: object;
}

/**
 * Returns the ordered chain of ModelSpecs to try for a given task.
 * Falls over to an alternate provider if the primary provider fails.
 */
export function getProviderChain(task: "intentParsing" | "diffExplanation"): ModelSpec[] {
  const primary = MODEL_CONFIG[task];
  const secondaryProvider: ModelSpec["provider"] =
    primary.provider === "openai" ? "anthropic" : "openai";

  let secondaryModel: string;
  if (secondaryProvider === "anthropic") {
    secondaryModel =
      task === "intentParsing"
        ? process.env.AI_FALLBACK_MODEL_INTENT_PARSING ?? "claude-3-5-sonnet-latest"
        : process.env.AI_FALLBACK_MODEL_DIFF_EXPLANATION ?? "claude-3-5-haiku-latest";
  } else {
    secondaryModel =
      task === "intentParsing"
        ? process.env.AI_FALLBACK_MODEL_INTENT_PARSING ?? "gpt-4o"
        : process.env.AI_FALLBACK_MODEL_DIFF_EXPLANATION ?? "gpt-4o-mini";
  }

  const secondary: ModelSpec = {
    provider: secondaryProvider,
    model: secondaryModel,
    temperature: primary.temperature,
  };

  return [primary, secondary];
}

/**
 * Checks if at least one provider in the task's fallback chain has its required API key present in env.
 */
export function isAiConfigured(task: "intentParsing" | "diffExplanation"): boolean {
  const chain = getProviderChain(task);
  return chain.some((spec) => {
    if (spec.provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
    if (spec.provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
    return false;
  });
}

/**
 * Concrete provider connectors for OpenAI and Anthropic SDKs.
 */
export const _providerConnectors: Record<
  ModelSpec["provider"],
  (spec: ModelSpec, params: AiCallParams) => Promise<string>
> = {
  openai: async (spec, params) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment");
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ];

    const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: spec.model,
      temperature: spec.temperature,
      messages,
    };

    if (params.jsonSchema) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: "scenario_intent_delta",
          strict: true,
          schema: params.jsonSchema as any,
        },
      };
    }

    const response = await client.chat.completions.create(body);
    const content = response.choices[0]?.message?.content;
    if (content === null || content === undefined) {
      throw new Error("OpenAI returned empty completion content");
    }
    return content;
  },

  anthropic: async (spec, params) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set in environment");
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    if (params.jsonSchema) {
      const response = await client.messages.create({
        model: spec.model,
        max_tokens: 1024,
        temperature: spec.temperature,
        system: params.systemPrompt,
        messages: [{ role: "user", content: params.userPrompt }],
        tools: [
          {
            name: "extract_scenario_intent",
            description: "Extract structured scenario intent delta",
            input_schema: params.jsonSchema as any,
          },
        ],
        tool_choice: { type: "tool", name: "extract_scenario_intent" },
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      if (toolUse && toolUse.type === "tool_use") {
        return JSON.stringify(toolUse.input);
      }
      throw new Error("Anthropic response missing tool_use block");
    }

    const response = await client.messages.create({
      model: spec.model,
      max_tokens: 1024,
      temperature: spec.temperature,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      return textBlock.text;
    }
    throw new Error("Anthropic response missing text content");
  },
};

/**
 * Tries the primary provider first, falling through to secondary providers in the chain
 * on any throw or error. Only throws AiUnavailableError after every provider has failed.
 */
export async function _aiConnectorComplete(params: AiCallParams): Promise<string> {
  const chain = getProviderChain(params.task);
  let lastError: unknown = null;

  for (const spec of chain) {
    const connector = _providerConnectors[spec.provider];
    if (!connector) continue;
    try {
      return await connector(spec, params);
    } catch (err) {
      lastError = err;
    }
  }

  throw new AiUnavailableError(
    `All configured AI providers failed for task '${params.task}': ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
