"use client";

import React from "react";
import { Sparkles, Calculator, RefreshCw } from "lucide-react";
import type { DiffExplanation } from "../../ai/types.js";
import { TextType } from "../ui/TextType.js";

export interface DiffExplanationPanelProps {
  explanation: DiffExplanation | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const DiffExplanationPanel: React.FC<DiffExplanationPanelProps> = ({
  explanation,
  isLoading = false,
  onRefresh,
}) => {
  return (
    <div className="p-6 rounded-2xl border border-neutral bg-[#faf8f4] shadow-card space-y-4">
      {/* Header with Source Badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="font-serif text-base font-bold text-ink">
            Scenario Narrative & Risk Analysis
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {explanation && (
            <>
              {explanation.source === "ai" ? (
                <span
                  data-testid="source-badge-ai"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent text-base border border-[#2e4755]"
                >
                  <Sparkles className="w-3 h-3" />
                  AI-generated
                </span>
              ) : (
                <span
                  data-testid="source-badge-template"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral text-ink border border-[#d4cdc0]"
                >
                  <Calculator className="w-3 h-3 text-ink/60" />
                  Computed directly
                </span>
              )}
            </>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg border border-neutral hover:bg-neutral text-ink/60 hover:text-ink disabled:opacity-50 transition-colors"
              title="Recompute explanation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Narrative Body */}
      {isLoading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-sm text-ink/60">
          <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          <span>Generating diff explanation...</span>
        </div>
      ) : explanation ? (
        <div
          data-testid="diff-explanation-content"
          className="p-4 rounded-xl border border-neutral/80 bg-[#f5f2ec] text-sm text-ink font-sans leading-relaxed"
        >
          <TextType text={explanation.explanation} typingSpeed={12} />
        </div>
      ) : (
        <div className="text-xs text-ink/50 py-6 text-center">
          Click &apos;Explain Diff&apos; to summarize these scenario shifts.
        </div>
      )}
    </div>
  );
};

export default DiffExplanationPanel;
