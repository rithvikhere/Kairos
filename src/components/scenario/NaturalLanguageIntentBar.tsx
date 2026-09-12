"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Check, X, AlertCircle } from "lucide-react";
import * as api from "../../lib/api-client.js";
import type { ScenarioInputs } from "../../domain/types.js";
import type { ScenarioIntentDelta } from "../../ai/types.js";
import { AnimatedButton } from "../ui/AnimatedButton.js";

export interface NaturalLanguageIntentBarProps {
  baselineInputs: ScenarioInputs;
  onApplyDelta: (resolvedInputs: ScenarioInputs) => void;
}

export const NaturalLanguageIntentBar: React.FC<NaturalLanguageIntentBarProps> = ({
  baselineInputs,
  onApplyDelta,
}) => {
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<{
    delta: ScenarioIntentDelta;
    resolvedInputs: ScenarioInputs;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isParsing) return;

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const res = await api.parseScenarioIntent(text.trim(), baselineInputs);
      setParsedResult(res);
    } catch (err: any) {
      if (err.code === "AI_UNAVAILABLE") {
        setErrorMessage(
          "AI intent parsing is currently offline. Please adjust the scenario levers using the sliders above."
        );
      } else {
        setErrorMessage(err.message || "Failed to extract scenario intent from text.");
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!parsedResult) return;
    onApplyDelta(parsedResult.resolvedInputs);
    setParsedResult(null);
    setText("");
  };

  const handleCancel = () => {
    setParsedResult(null);
  };

  return (
    <div className="p-5 rounded-2xl border border-neutral bg-[#faf8f4] shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <h4 className="font-serif text-sm font-bold text-ink">
          Natural-Language Scenario Intent
        </h4>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 'Cut budget 20%, add 2 people, and push deadline back 4 weeks'"
          className="flex-1 px-3.5 py-2.5 rounded-lg border border-neutral bg-[#f5f2ec] text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-accent"
          disabled={isParsing}
        />
        <AnimatedButton
          type="submit"
          variant="primary"
          size="md"
          isLoading={isParsing}
          disabled={!text.trim()}
        >
          <span>Extract Intent</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </AnimatedButton>
      </form>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-risk-crit/30 border border-[#bf7765] text-xs text-[#4f1e14]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Visual Resolution from Text into Structured Delta Chips */}
      <AnimatePresence>
        {parsedResult && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pt-3 border-t border-neutral space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-ink/70">
              <span className="font-semibold text-ink">
                Extracted Modifications (Review before applying):
              </span>
              <span className="text-[11px] text-ink/50">Pure non-AI arithmetic</span>
            </div>

            {/* Delta Chips */}
            <div className="flex flex-wrap gap-2">
              {parsedResult.delta.budget && (
                <div className="px-3 py-1.5 rounded-lg border border-accent/30 bg-accent/10 text-xs text-ink">
                  <span className="font-semibold text-accent">Budget:</span>{" "}
                  {parsedResult.delta.budget.type === "percent"
                    ? `${parsedResult.delta.budget.value > 0 ? "+" : ""}${parsedResult.delta.budget.value}%`
                    : parsedResult.delta.budget.type === "delta"
                    ? `${parsedResult.delta.budget.value > 0 ? "+" : ""}$${parsedResult.delta.budget.value.toLocaleString()}`
                    : `$${parsedResult.delta.budget.value.toLocaleString()}`}
                  <span className="text-ink/50 ml-1">
                    → ${parsedResult.resolvedInputs.budget.toLocaleString()}
                  </span>
                </div>
              )}

              {parsedResult.delta.headcount && (
                <div className="px-3 py-1.5 rounded-lg border border-accent/30 bg-accent/10 text-xs text-ink">
                  <span className="font-semibold text-accent">Headcount:</span>{" "}
                  {parsedResult.delta.headcount.type === "delta"
                    ? `${parsedResult.delta.headcount.value > 0 ? "+" : ""}${parsedResult.delta.headcount.value}`
                    : parsedResult.delta.headcount.type === "percent"
                    ? `${parsedResult.delta.headcount.value > 0 ? "+" : ""}${parsedResult.delta.headcount.value}%`
                    : `${parsedResult.delta.headcount.value}`}
                  <span className="text-ink/50 ml-1">
                    → {parsedResult.resolvedInputs.headcount} people
                  </span>
                </div>
              )}

              {parsedResult.delta.deadlineWeeks && (
                <div className="px-3 py-1.5 rounded-lg border border-accent/30 bg-accent/10 text-xs text-ink">
                  <span className="font-semibold text-accent">Deadline:</span>{" "}
                  {parsedResult.delta.deadlineWeeks.type === "delta"
                    ? `${parsedResult.delta.deadlineWeeks.value > 0 ? "+" : ""}${parsedResult.delta.deadlineWeeks.value} wks`
                    : `${parsedResult.delta.deadlineWeeks.value} wks`}
                  <span className="text-ink/50 ml-1">
                    → {parsedResult.resolvedInputs.deadlineWeeks} weeks
                  </span>
                </div>
              )}

              {parsedResult.delta.scope && (
                <div className="px-3 py-1.5 rounded-lg border border-accent/30 bg-accent/10 text-xs text-ink">
                  <span className="font-semibold text-accent">Scope:</span>{" "}
                  {parsedResult.delta.scope.type === "delta"
                    ? `${parsedResult.delta.scope.value > 0 ? "+" : ""}${parsedResult.delta.scope.value} pw`
                    : `${parsedResult.delta.scope.value} pw`}
                  <span className="text-ink/50 ml-1">
                    → {parsedResult.resolvedInputs.scope} person-weeks
                  </span>
                </div>
              )}
            </div>

            {/* Confirmation Controls */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <AnimatedButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCancel}
              >
                <X className="w-3.5 h-3.5" />
                <span>Discard</span>
              </AnimatedButton>
              <AnimatedButton
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirm}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Apply to Sliders</span>
              </AnimatedButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NaturalLanguageIntentBar;
