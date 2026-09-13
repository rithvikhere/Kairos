import type { ScenarioDiff } from "../domain/diff.js";
import type { DiffExplanation } from "./types.js";
import { _aiConnectorComplete, isAiConfigured } from "./client.js";
import {
  DIFF_EXPLANATION_SYSTEM_PROMPT,
  buildDiffExplanationUserPrompt,
} from "./prompts.js";

/**
 * Deterministic template fallback explanation generator.
 *
 * Guaranteed to produce byte-identical strings for the same ScenarioDiff input.
 * Cites every changed field from the attribution array in existing order.
 */
export function buildTemplateFallbackExplanation(diff: ScenarioDiff): string {
  const risk = diff.outputDiff.riskScore;
  const feas = diff.outputDiff.feasible?.changed ? "changed" : "did not change";

  const lines: string[] = [
    `Risk moved from ${risk.from} to ${risk.to} (${risk.direction}). Feasibility ${feas}. Contributing changes, largest impact first:`,
  ];

  for (const row of diff.attribution) {
    const input = diff.inputDiff[row.field];
    if (input) {
      lines.push(
        `- ${row.field}: ${input.from} → ${input.to} (${row.isolatedRiskContribution} points of risk impact)`
      );
    }
  }

  return lines.join("\n");
}

/**
 * Explains a ScenarioDiff in plain English.
 *
 * Uses an AI provider if configured and operational.
 * Falls back to a deterministic templated string on any AI error or when unconfigured,
 * returning source: "template-fallback" without throwing.
 */
export async function explainScenarioDiff(diff: ScenarioDiff): Promise<DiffExplanation> {
  if (!isAiConfigured("diffExplanation")) {
    return {
      explanation: buildTemplateFallbackExplanation(diff),
      source: "template-fallback",
    };
  }

  try {
    const rawResponse = await _aiConnectorComplete({
      task: "diffExplanation",
      systemPrompt: DIFF_EXPLANATION_SYSTEM_PROMPT,
      userPrompt: buildDiffExplanationUserPrompt(diff),
    });

    if (!rawResponse || rawResponse.trim().length === 0) {
      return {
        explanation: buildTemplateFallbackExplanation(diff),
        source: "template-fallback",
      };
    }

    return {
      explanation: rawResponse.trim(),
      source: "ai",
    };
  } catch {
    return {
      explanation: buildTemplateFallbackExplanation(diff),
      source: "template-fallback",
    };
  }
}
