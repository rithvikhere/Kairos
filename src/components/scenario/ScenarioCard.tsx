"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Archive, GitCompare, GitFork, ArrowRight } from "lucide-react";
import type { ScenarioRecord } from "../../data/schema.js";
import { getRiskBand } from "../../lib/riskBand.js";
import { RISK_COLOR_MAP } from "../../lib/riskColorMap.js";
import { Badge } from "../ui/Badge.js";
import { useToggleFavorite, useSetArchived } from "../../hooks/useScenarios.js";
import { useUiStore } from "../../stores/uiStore.js";

export interface ScenarioCardProps {
  scenario: ScenarioRecord;
  projectId: string;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, projectId }) => {
  const toggleFavoriteMutation = useToggleFavorite();
  const setArchivedMutation = useSetArchived();
  const { compareScenarioIds, toggleCompareScenario } = useUiStore();

  const isCompared =
    compareScenarioIds[0] === scenario.id || compareScenarioIds[1] === scenario.id;

  const output = scenario.deterministic_output;
  const riskBand = getRiskBand(output.riskScore, output.feasible);
  const visualConfig = RISK_COLOR_MAP[riskBand];

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteMutation.mutate(scenario.id);
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setArchivedMutation.mutate({
      id: scenario.id,
      archived: !scenario.is_archived,
    });
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompareScenario(scenario.id);
  };

  return (
    <motion.div
      whileHover={{
        y: -4,
        boxShadow: "0 10px 25px -5px rgba(31, 36, 33, 0.12), 0 8px 10px -6px rgba(31, 36, 33, 0.08)",
        borderColor: visualConfig.color,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative flex flex-col justify-between p-5 rounded-xl border border-neutral bg-[#faf8f4] text-ink shadow-card transition-colors"
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: visualConfig.color,
      }}
    >
      <div>
        {/* Top bar: Badges + Affordances */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={riskBand}>
              {visualConfig.label} ({output.riskScore})
            </Badge>

            {output.feasible ? (
              <span className="text-[11px] font-medium text-[#2a4225] bg-risk-low/60 px-2 py-0.5 rounded-full">
                Feasible
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#4f1e14] bg-risk-crit/60 px-2 py-0.5 rounded-full">
                Infeasible
              </span>
            )}

            {scenario.monte_carlo_output && (
              <span className="text-[10px] font-semibold text-accent border border-accent/30 px-1.5 py-0.5 rounded">
                MC
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleCompare}
              className={`p-1.5 rounded-md transition-colors ${
                isCompared
                  ? "bg-accent text-base"
                  : "text-ink/40 hover:text-ink hover:bg-neutral"
              }`}
              title={isCompared ? "Remove from comparison" : "Select for comparison"}
            >
              <GitCompare className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleToggleFavorite}
              className="p-1.5 rounded-md text-ink/40 hover:text-[#d6ad76] hover:bg-neutral transition-colors"
              title={scenario.is_favorite ? "Unstar scenario" : "Star scenario"}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  scenario.is_favorite ? "text-[#d6ad76] fill-[#d6ad76]" : ""
                }`}
              />
            </button>

            <button
              onClick={handleToggleArchive}
              className="p-1.5 rounded-md text-ink/40 hover:text-ink hover:bg-neutral transition-colors"
              title={scenario.is_archived ? "Unarchive" : "Archive"}
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <Link
          href={`/projects/${projectId}/scenarios/${scenario.id}`}
          className="group block"
        >
          <h4 className="font-serif text-base font-bold text-ink group-hover:text-accent transition-colors">
            {scenario.name}
          </h4>
          {scenario.description && (
            <p className="text-xs text-ink/70 mt-1 line-clamp-2">
              {scenario.description}
            </p>
          )}
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="pt-4 mt-4 border-t border-neutral/80 flex items-center justify-between text-xs">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <span className="text-ink/50 text-[10px] uppercase">Duration:</span>{" "}
            <span className="font-medium text-ink">
              {(output.estimatedTimeWeeks ?? output.computed?.estimatedTimeWeeks) !== undefined
                ? `${output.estimatedTimeWeeks ?? output.computed?.estimatedTimeWeeks} wks`
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-ink/50 text-[10px] uppercase">Cost:</span>{" "}
            <span className="font-medium text-ink">
              {(output.actualCost ?? output.computed?.actualCost) !== undefined
                ? `$${(((output.actualCost ?? output.computed?.actualCost)!) / 1000).toFixed(0)}k`
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-ink/50 text-[10px] uppercase">Staff:</span>{" "}
            <span className="font-medium text-ink">
              {(output.effectiveHeadcount ?? output.computed?.effectiveHeadcount) !== undefined
                ? (output.effectiveHeadcount ?? output.computed?.effectiveHeadcount)!.toFixed(1)
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-ink/50 text-[10px] uppercase">Budget:</span>{" "}
            <span className="font-medium text-ink">
              {(output.budgetUtilization ?? output.computed?.budgetUtilization) !== undefined
                ? `${(((output.budgetUtilization ?? output.computed?.budgetUtilization)!) * 100).toFixed(0)}%`
                : "—"}
            </span>
          </div>
        </div>

        <Link
          href={`/projects/${projectId}/scenarios/${scenario.id}`}
          className="flex items-center gap-1 text-accent font-semibold hover:underline"
        >
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
};

export default ScenarioCard;
