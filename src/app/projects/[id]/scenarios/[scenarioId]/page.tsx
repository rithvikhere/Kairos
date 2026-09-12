"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  GitFork,
  Star,
  Archive,
  Trash2,
  GitCompare,
  Clock,
  Tag,
  Sparkles,
} from "lucide-react";
import {
  useScenario,
  useToggleFavorite,
  useSetArchived,
  useDeleteScenario,
} from "../../../../../hooks/useScenarios.js";
import { getRiskBand } from "../../../../../lib/riskBand.js";
import { RISK_COLOR_MAP } from "../../../../../lib/riskColorMap.js";
import { Badge } from "../../../../../components/ui/Badge.js";
import { AnimatedButton } from "../../../../../components/ui/AnimatedButton.js";
import { MonteCarloDistributionChart } from "../../../../../components/scenario/MonteCarloDistributionChart.js";
import { useUiStore } from "../../../../../stores/uiStore.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../../../components/ui/Dialog.js";
import * as api from "../../../../../lib/api-client.js";

export default function ScenarioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const scenarioId = params.scenarioId as string;

  const { data: scenario, isLoading } = useScenario(scenarioId);
  const toggleFavoriteMutation = useToggleFavorite();
  const setArchivedMutation = useSetArchived();
  const deleteScenarioMutation = useDeleteScenario();
  const { compareScenarioIds, toggleCompareScenario } = useUiStore();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRunningMC, setIsRunningMC] = useState(false);
  const [localMC, setLocalMC] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-64 bg-neutral rounded" />
        <div className="h-32 bg-neutral/50 rounded-xl" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 bg-neutral/40 rounded-xl" />
          <div className="h-48 bg-neutral/40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="p-12 text-center rounded-2xl border border-neutral bg-[#faf8f4]">
        <h3 className="font-serif text-lg font-bold text-ink">Scenario Not Found</h3>
        <p className="text-xs text-ink/60 mt-1">
          The requested scenario does not exist or has been removed.
        </p>
        <Link href={`/projects/${projectId}`} className="inline-block mt-4">
          <AnimatedButton variant="primary">Return to Project</AnimatedButton>
        </Link>
      </div>
    );
  }

  const out = scenario.deterministic_output;
  const riskBand = getRiskBand(out.riskScore, out.feasible);
  const visualConfig = RISK_COLOR_MAP[riskBand];

  const isCompared =
    compareScenarioIds[0] === scenario.id || compareScenarioIds[1] === scenario.id;

  const handleFork = () => {
    const query = new URLSearchParams({
      parentScenarioId: scenario.id,
      name: scenario.name,
      description: scenario.description || "",
      budget: String(scenario.inputs.budget),
      headcount: String(scenario.inputs.headcount),
      deadlineWeeks: String(scenario.inputs.deadlineWeeks),
      scope: String(scenario.inputs.scope || 480),
    });
    router.push(`/projects/${projectId}/scenarios/new?${query.toString()}`);
  };

  const handleDelete = async () => {
    await deleteScenarioMutation.mutateAsync({ id: scenario.id, projectId });
    router.push(`/projects/${projectId}`);
  };

  const handleRunMonteCarlo = async () => {
    setIsRunningMC(true);
    try {
      const res = await api.simulateMonteCarlo(scenario.inputs, {
        iterations: 1000,
      });
      setLocalMC(res);
    } catch (err) {
      console.error("Monte Carlo simulation failed:", err);
    } finally {
      setIsRunningMC(false);
    }
  };

  const effectiveMC = localMC || scenario.monte_carlo_output;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-neutral">
        <div className="flex items-start gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="p-2 rounded-lg border border-neutral hover:bg-neutral text-ink/70 hover:text-ink transition-colors mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-ink">
                {scenario.name}
              </h1>
              <Badge variant={riskBand}>{visualConfig.label}</Badge>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  out.feasible
                    ? "bg-risk-low text-[#2a4225]"
                    : "bg-risk-crit text-[#4f1e14]"
                }`}
              >
                {out.feasible ? "Feasible" : "Infeasible"}
              </span>
            </div>

            {scenario.description && (
              <p className="text-sm text-ink/70 max-w-2xl leading-relaxed">
                {scenario.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-ink/50 pt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Created {new Date(scenario.created_at).toLocaleDateString()}
              </span>
              {scenario.tags && scenario.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {scenario.tags.map((t) => (
                    <span key={t} className="bg-neutral px-1.5 py-0.5 rounded text-[11px]">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggleCompareScenario(scenario.id)}
            className={`p-2 rounded-lg border transition-colors ${
              isCompared
                ? "bg-accent text-base border-[#2e4755]"
                : "border-neutral text-ink/70 hover:bg-neutral hover:text-ink"
            }`}
            title="Toggle Compare"
          >
            <GitCompare className="w-4 h-4" />
          </button>

          <button
            onClick={() => toggleFavoriteMutation.mutate(scenario.id)}
            className="p-2 rounded-lg border border-neutral text-ink/70 hover:text-[#d6ad76] hover:bg-neutral transition-colors"
            title="Favorite"
          >
            <Star
              className={`w-4 h-4 ${
                scenario.is_favorite ? "text-[#d6ad76] fill-[#d6ad76]" : ""
              }`}
            />
          </button>

          <button
            onClick={() =>
              setArchivedMutation.mutate({
                id: scenario.id,
                archived: !scenario.is_archived,
              })
            }
            className="p-2 rounded-lg border border-neutral text-ink/70 hover:text-ink hover:bg-neutral transition-colors"
            title={scenario.is_archived ? "Unarchive" : "Archive"}
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsDeleteOpen(true)}
            className="p-2 rounded-lg border border-neutral hover:bg-risk-crit/20 hover:border-risk-crit text-ink/60 hover:text-[#4f1e14] transition-colors"
            title="Delete Scenario"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <AnimatedButton variant="primary" size="sm" onClick={handleFork}>
            <GitFork className="w-3.5 h-3.5" />
            <span>Fork Scenario</span>
          </AnimatedButton>
        </div>
      </div>

      {/* Grid: Inputs vs Outputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Levers Card */}
        <div className="p-6 rounded-2xl border border-neutral bg-[#faf8f4] shadow-card space-y-4">
          <h3 className="font-serif text-base font-bold text-ink">
            Configured Levers
          </h3>

          <div className="space-y-3 font-sans text-sm">
            <div className="flex justify-between py-2 border-b border-neutral/60">
              <span className="text-ink/60">Budget Available</span>
              <span className="font-mono font-bold text-ink">
                ${Number(scenario.inputs.budget).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral/60">
              <span className="text-ink/60">Team Headcount</span>
              <span className="font-mono font-bold text-ink">
                {Number(scenario.inputs.headcount)} people
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral/60">
              <span className="text-ink/60">Target Deadline</span>
              <span className="font-mono font-bold text-ink">
                {Number(scenario.inputs.deadlineWeeks)} weeks
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink/60">Total Scope</span>
              <span className="font-mono font-bold text-ink">
                {Number(scenario.inputs.scope ?? 480)} person-weeks
              </span>
            </div>
          </div>
        </div>

        {/* Deterministic Outputs Card */}
        <div className="p-6 rounded-2xl border border-neutral bg-[#faf8f4] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-ink">
              Deterministic Output
            </h3>
            <div className="text-right">
              <span className="text-xs text-ink/50">Composite Risk: </span>
              <span className="font-mono text-base font-bold text-accent">
                {out.riskScore} / 100
              </span>
            </div>
          </div>

          <div className="space-y-3 font-sans text-sm">
            <div className="flex justify-between py-2 border-b border-neutral/60">
              <span className="text-ink/60">Estimated Duration</span>
              <span className="font-mono font-bold text-ink">
                {out.estimatedTimeWeeks} weeks
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral/60">
              <span className="text-ink/60">Effective Headcount</span>
              <span className="font-mono font-bold text-ink">
                {out.effectiveHeadcount.toFixed(1)} people
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral/60">
              <span className="text-ink/60">Actual Cost</span>
              <span className="font-mono font-bold text-ink">
                ${out.actualCost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink/60">Budget Utilization</span>
              <span className="font-mono font-bold text-ink">
                {(out.budgetUtilization * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Risk Breakdown */}
          <div className="pt-3 border-t border-neutral/80 space-y-1.5 text-xs">
            <span className="font-semibold text-ink/70">Risk Breakdown:</span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-neutral/40">
                <div className="text-[10px] text-ink/50">Schedule (40%)</div>
                <div className="font-bold">{out.riskBreakdown.scheduleRisk}</div>
              </div>
              <div className="p-2 rounded bg-neutral/40">
                <div className="text-[10px] text-ink/50">Budget (40%)</div>
                <div className="font-bold">{out.riskBreakdown.budgetRisk}</div>
              </div>
              <div className="p-2 rounded bg-neutral/40">
                <div className="text-[10px] text-ink/50">Staffing (20%)</div>
                <div className="font-bold">{out.riskBreakdown.staffingRisk}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monte Carlo Section */}
      {effectiveMC ? (
        <MonteCarloDistributionChart monteCarlo={effectiveMC} />
      ) : (
        <div className="p-8 rounded-2xl border border-dashed border-neutral bg-[#faf8f4] text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral mx-auto flex items-center justify-center text-accent">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif text-base font-bold text-ink">
              Monte Carlo Uncertainty Simulation
            </h4>
            <p className="text-xs text-ink/60 mt-1 max-w-md mx-auto">
              Run 1,000 stochastic sampling runs with Box-Muller normal transforms to evaluate schedule risk and budget overrun probabilities.
            </p>
          </div>
          <AnimatedButton
            variant="primary"
            size="sm"
            isLoading={isRunningMC}
            onClick={handleRunMonteCarlo}
          >
            Run 1,000 Iteration Simulation
          </AnimatedButton>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scenario</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &apos;{scenario.name}&apos;?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-ink/70">
            This action cannot be undone. Child scenarios will have their parent link
            cleared.
          </p>

          <DialogFooter>
            <AnimatedButton
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              type="button"
              variant="destructive"
              isLoading={deleteScenarioMutation.isPending}
              onClick={handleDelete}
            >
              Delete Scenario
            </AnimatedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
