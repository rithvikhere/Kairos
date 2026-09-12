"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, GitCompare, Sparkles, RefreshCw } from "lucide-react";
import { useScenarioDiff, useExplainDiff } from "@/hooks/useScenarioDiff.js";
import { useScenarios } from "@/hooks/useScenarios.js";
import { ScenarioDiffTable } from "@/components/diff/ScenarioDiffTable.js";
import { AttributionBarChart } from "@/components/scenario/AttributionBarChart.js";
import { DiffExplanationPanel } from "@/components/diff/DiffExplanationPanel.js";
import { AnimatedButton } from "@/components/ui/AnimatedButton.js";
import type { DiffExplanation } from "@/ai/types.js";

export default function CompareScenariosPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const aId = searchParams.get("a") || "";
  const bId = searchParams.get("b") || "";

  const { data: scenarios = [] } = useScenarios(projectId);
  const { data: diff, isLoading: diffLoading, error: diffError } = useScenarioDiff(aId, bId);
  const explainMutation = useExplainDiff();

  const [explanation, setExplanation] = useState<DiffExplanation | null>(null);

  const scenarioA = scenarios.find((s) => s.id === aId);
  const scenarioB = scenarios.find((s) => s.id === bId);

  // Automatically request explanation when diff is ready
  useEffect(() => {
    if (aId && bId && !explanation && !explainMutation.isPending) {
      explainMutation.mutate(
        { scenarioAId: aId, scenarioBId: bId },
        {
          onSuccess: (data) => setExplanation(data),
          onError: (err) => console.error("Diff explanation failed:", err),
        }
      );
    }
  }, [aId, bId, diff]);

  const handleRefreshExplanation = () => {
    if (!aId || !bId) return;
    explainMutation.mutate(
      { scenarioAId: aId, scenarioBId: bId },
      {
        onSuccess: (data) => setExplanation(data),
      }
    );
  };

  if (!aId || !bId) {
    return (
      <div className="p-12 text-center rounded-2xl border border-neutral bg-[#faf8f4] max-w-xl mx-auto space-y-4">
        <GitCompare className="w-10 h-10 text-accent mx-auto" />
        <h3 className="font-serif text-lg font-bold text-ink">
          Select Two Scenarios to Compare
        </h3>
        <p className="text-xs text-ink/60">
          Pairwise comparison requires two scenario IDs in the query parameters (?a=&amp;b=).
        </p>
        <Link href={`/projects/${projectId}`}>
          <AnimatedButton variant="primary">Return to Scenarios</AnimatedButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="p-2 rounded-lg border border-neutral hover:bg-neutral text-ink/70 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-ink">
                Pairwise Scenario Comparison
              </h1>
            </div>
            <p className="text-xs text-ink/60 mt-0.5">
              Comparing{" "}
              <span className="font-semibold text-ink">
                {scenarioA?.name ?? `Scenario ${aId}`}
              </span>{" "}
              (A) against{" "}
              <span className="font-semibold text-accent">
                {scenarioB?.name ?? `Scenario ${bId}`}
              </span>{" "}
              (B)
            </p>
          </div>
        </div>

        <AnimatedButton
          variant="secondary"
          size="sm"
          isLoading={explainMutation.isPending}
          onClick={handleRefreshExplanation}
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Regenerate Narrative</span>
        </AnimatedButton>
      </div>

      {diffLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-neutral/50 rounded-2xl" />
          <div className="h-64 bg-neutral/40 rounded-2xl" />
        </div>
      ) : diffError ? (
        <div className="p-8 rounded-2xl border border-[#bf7765] bg-risk-crit/20 text-[#4f1e14] text-center text-sm">
          Failed to load scenario diff. Make sure both scenario IDs are valid.
        </div>
      ) : diff ? (
        <div className="space-y-8">
          {/* AI / Bounded Diff Narrative Panel */}
          <DiffExplanationPanel
            explanation={explanation}
            isLoading={explainMutation.isPending}
            onRefresh={handleRefreshExplanation}
          />

          {/* Single-Variable Risk Attribution Chart */}
          <AttributionBarChart attribution={diff.attribution} />

          {/* Comparative Deltas Table */}
          <ScenarioDiffTable diff={diff} />
        </div>
      ) : null}
    </div>
  );
}
