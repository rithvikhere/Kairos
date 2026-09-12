"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Sparkles, CheckCircle2 } from "lucide-react";
import type { ScenarioInputs } from "@/domain/types.js";
import { DEFAULT_SCOPE_PERSON_WEEKS } from "@/domain/constants.js";
import { useCreateScenario } from "@/hooks/useScenarios.js";
import { useScenarioSimulatePreview } from "@/hooks/useScenarioSimulatePreview.js";
import { ScenarioSliderPanel } from "@/components/scenario/ScenarioSliderPanel.js";
import { NaturalLanguageIntentBar } from "@/components/scenario/NaturalLanguageIntentBar.js";
import { AnimatedButton } from "@/components/ui/AnimatedButton.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog.js";
import type { ScenarioRecord } from "@/data/schema.js";

export default function NewScenarioPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const createScenarioMutation = useCreateScenario();

  // Prepopulate if forking
  const initialBudget = searchParams.get("budget")
    ? Number(searchParams.get("budget"))
    : 500_000;
  const initialHeadcount = searchParams.get("headcount")
    ? Number(searchParams.get("headcount"))
    : 8;
  const initialDeadline = searchParams.get("deadlineWeeks")
    ? Number(searchParams.get("deadlineWeeks"))
    : 24;
  const initialScope = searchParams.get("scope")
    ? Number(searchParams.get("scope"))
    : DEFAULT_SCOPE_PERSON_WEEKS;
  const parentId = searchParams.get("parentScenarioId");

  const [name, setName] = useState(
    searchParams.get("name") ? `Fork of ${searchParams.get("name")}` : "Baseline Strategy"
  );
  const [description, setDescription] = useState(searchParams.get("description") || "");
  const [tagsInput, setTagsInput] = useState(searchParams.get("tags") || "");
  const [runMonteCarlo, setRunMonteCarlo] = useState(true);

  const [inputs, setInputs] = useState<ScenarioInputs>({
    budget: initialBudget,
    headcount: initialHeadcount,
    deadlineWeeks: initialDeadline,
    scope: initialScope,
  });

  // Debounced live simulation preview
  const { result: previewResult, isLoading: previewLoading } =
    useScenarioSimulatePreview(inputs);

  // Success Confirmation State
  const [savedScenario, setSavedScenario] = useState<ScenarioRecord | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const created = await createScenarioMutation.mutateAsync({
        projectId,
        parentScenarioId: parentId || null,
        name: name.trim(),
        description: description.trim() || null,
        tags,
        inputs: {
          budget: inputs.budget,
          headcount: inputs.headcount,
          deadlineWeeks: inputs.deadlineWeeks,
          scope: inputs.scope,
        },
        runMonteCarlo,
        monteCarloOptions: runMonteCarlo ? { iterations: 1000 } : undefined,
      });

      setSavedScenario(created);
    } catch (err) {
      console.error("Failed to save scenario:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-neutral">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="p-2 rounded-lg border border-neutral hover:bg-neutral text-ink/70 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">
              {parentId ? "Fork & Refine Scenario" : "Build Scenario"}
            </h1>
            <p className="text-xs text-ink/60">
              Tune parameters manually or use natural language intent extraction.
            </p>
          </div>
        </div>

        <AnimatedButton
          type="button"
          variant="primary"
          isLoading={createScenarioMutation.isPending}
          onClick={handleSave}
        >
          <Save className="w-4 h-4" />
          <span>Save Scenario</span>
        </AnimatedButton>
      </div>

      {/* Metadata Form */}
      <div className="p-6 rounded-2xl border border-neutral bg-[#faf8f4] shadow-card space-y-4">
        <h3 className="font-serif text-base font-bold text-ink">Scenario Metadata</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Scenario Name <span className="text-risk-crit">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aggressive Delivery with Overtime"
              className="w-full px-3.5 py-2 rounded-lg border border-neutral bg-[#f5f2ec] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. baseline, q3, high-confidence"
              className="w-full px-3.5 py-2 rounded-lg border border-neutral bg-[#f5f2ec] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink mb-1">
            Description & Hypotheses
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Document what strategic tradeoffs or staffing assumptions this scenario models."
            className="w-full px-3.5 py-2 rounded-lg border border-neutral bg-[#f5f2ec] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="run-mc"
            checked={runMonteCarlo}
            onChange={(e) => setRunMonteCarlo(e.target.checked)}
            className="w-4 h-4 rounded border-neutral text-accent focus:ring-accent accent-accent cursor-pointer"
          />
          <label
            htmlFor="run-mc"
            className="text-xs font-medium text-ink cursor-pointer select-none"
          >
            Compute 1,000-iteration Monte Carlo uncertainty analysis upon save
          </label>
        </div>
      </div>

      {/* Natural Language Intent Bar */}
      <NaturalLanguageIntentBar
        baselineInputs={inputs}
        onApplyDelta={(resolved: ScenarioInputs) => setInputs(resolved)}
      />

      {/* Interactive Sliders + Live Preview */}
      <ScenarioSliderPanel
        inputs={inputs}
        onChange={setInputs}
        previewResult={previewResult}
        isLoading={previewLoading}
      />

      {/* Dedicated Save Success Modal */}
      <Dialog
        open={Boolean(savedScenario)}
        onOpenChange={(open: boolean) => {
          if (!open && savedScenario) {
            router.push(`/projects/${projectId}/scenarios/${savedScenario.id}`);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-risk-low border border-[#2a4225]/20 flex items-center justify-center text-[#2a4225] mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle>Scenario Successfully Saved</DialogTitle>
            <DialogDescription>
              &apos;{savedScenario?.name}&apos; is recorded and ready for analysis.
            </DialogDescription>
          </DialogHeader>

          {savedScenario && (
            <div className="p-4 rounded-xl border border-neutral bg-[#f5f2ec] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink/60">Risk Score:</span>
                <span className="font-bold text-accent">
                  {savedScenario.deterministic_output.riskScore} / 100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/60">Feasibility:</span>
                <span className="font-bold">
                  {savedScenario.deterministic_output.feasible ? "Feasible" : "Infeasible"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/60">Duration:</span>
                <span>{savedScenario.deterministic_output.estimatedTimeWeeks} weeks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/60">Total Cost:</span>
                <span>${(savedScenario.deterministic_output.actualCost / 1000).toFixed(0)}k</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <AnimatedButton
              variant="secondary"
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              Back to Project
            </AnimatedButton>
            <AnimatedButton
              variant="primary"
              onClick={() => {
                if (savedScenario) {
                  router.push(`/projects/${projectId}/scenarios/${savedScenario.id}`);
                }
              }}
            >
              Open Scenario Detail
            </AnimatedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
