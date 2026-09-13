"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from "lucide-react";
import type { ScenarioDiff, FieldDelta } from "../../domain/diff.js";

export interface ScenarioDiffTableProps {
  diff: ScenarioDiff;
}

function formatLabel(key: string): string {
  const customMap: Record<string, string> = {
    headcount: "Team Headcount",
    budget: "Budget Available",
    deadlineWeeks: "Target Deadline",
    scope: "Total Scope",
    teamSeniorityMix: "Team Seniority Mix",
    attritionRisk: "Attrition Risk",
    teamFamiliarity: "Team Familiarity",
    externalDependencyCount: "External Dependencies",
    vendorLeadTimeWeeks: "Vendor Lead Time",
    regulatoryComplexity: "Regulatory Complexity",
    technicalDebtLevel: "Technical Debt Level",
    scopeVolatility: "Scope Volatility",
    distributedTeamOverhead: "Distributed Team Overhead",
    qualityRigor: "Quality Rigor",
    stakeholderCount: "Stakeholder Count",
    estimatedTimeWeeks: "Estimated Duration",
    effectiveHeadcount: "Effective Headcount",
    actualCost: "Actual Cost",
    budgetUtilization: "Budget Utilization",
    scheduleUtilization: "Schedule Utilization",
    scheduleRisk: "Schedule Risk",
    budgetRisk: "Budget Risk",
    staffingRisk: "Staffing Risk",
    dependencyRisk: "Dependency Risk",
    complianceRisk: "Compliance Risk",
    approvalRisk: "Approval Risk",
  };

  if (customMap[key]) return customMap[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatVal(key: string, val: number | undefined): string {
  if (val === undefined || isNaN(val)) return "—";
  if (key === "deadlineWeeks") {
    return `${val} weeks`;
  }
  if (key === "scope") {
    return `${val} person-wks`;
  }
  if (key === "headcount") {
    return `${val} people`;
  }
  if (key === "estimatedTimeWeeks") {
    return `${val} wks`;
  }
  const lower = key.toLowerCase();
  if (lower.includes("cost") || (lower.includes("budget") && !lower.includes("utilization") && !lower.includes("risk"))) {
    return `$${Math.round(val).toLocaleString("en-US")}`;
  }
  if (lower.includes("utilization")) {
    return `${(val * 100).toFixed(0)}%`;
  }
  if (lower.includes("weeks") || lower.includes("time") || lower.includes("duration")) {
    return `${val} wks`;
  }
  if (lower.includes("risk") || lower.includes("score")) {
    return `${Math.round(val)}`;
  }
  return Number.isInteger(val) ? val.toLocaleString("en-US") : val.toFixed(2);
}

export const ScenarioDiffTable: React.FC<ScenarioDiffTableProps> = ({ diff }) => {
  const { inputDiff, outputDiff, onlyInA = [], onlyInB = [] } = diff;

  const renderDirection = (delta: FieldDelta) => {
    if (delta.direction === "increased") {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>+{typeof delta.delta === "number" ? delta.delta.toLocaleString("en-US") : delta.delta}</span>
          {delta.percentChange !== null && (
            <span className="text-[10px] text-ink/50 ml-0.5">
              (+{delta.percentChange.toFixed(1)}%)
            </span>
          )}
        </span>
      );
    }
    if (delta.direction === "decreased") {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#573511]">
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>{typeof delta.delta === "number" ? delta.delta.toLocaleString("en-US") : delta.delta}</span>
          {delta.percentChange !== null && (
            <span className="text-[10px] text-ink/50 ml-0.5">
              ({delta.percentChange.toFixed(1)}%)
            </span>
          )}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-ink/40">
        <Minus className="w-3 h-3" />
        <span>0</span>
      </span>
    );
  };

  const inputEntries = Object.entries(inputDiff || {});
  const otherOutputEntries = Object.entries(outputDiff || {}).filter(
    ([k, v]) => k !== "riskScore" && k !== "feasible" && k !== "riskBreakdown" && v && typeof v === "object" && "from" in v
  );

  return (
    <div className="space-y-6">
      {/* Unevaluated Asymmetry Notice */}
      {(onlyInA.length > 0 || onlyInB.length > 0) && (
        <div className="p-4 rounded-xl border border-neutral/80 bg-[#f5f2ec]/70 flex items-start gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-[#c98a3e] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-ink">Asymmetric Constraint Evaluation</div>
            <p className="text-ink/70 leading-relaxed">
              Some constraints or outputs were enabled in one scenario but not evaluated in the other:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {onlyInA.map((item) => (
                <span
                  key={`only-a-${item}`}
                  className="px-2 py-0.5 rounded bg-neutral/50 border border-neutral text-ink/70 font-mono text-[10px]"
                >
                  Baseline only: {formatLabel(item)}
                </span>
              ))}
              {onlyInB.map((item) => (
                <span
                  key={`only-b-${item}`}
                  className="px-2 py-0.5 rounded bg-neutral/50 border border-neutral text-ink/70 font-mono text-[10px]"
                >
                  Proposed only: {formatLabel(item)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Deltas Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral bg-[#faf8f4] shadow-card">
        <div className="px-6 py-4 border-b border-neutral bg-[#f5f2ec]/60">
          <h4 className="font-serif text-base font-bold text-ink">
            Scenario Input Levers
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral bg-neutral/30 text-xs font-semibold text-ink/60 uppercase">
              <tr>
                <th className="px-6 py-3">Parameter</th>
                <th className="px-6 py-3">Baseline (A)</th>
                <th className="px-6 py-3">Proposed (B)</th>
                <th className="px-6 py-3">Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral/50 font-sans">
              {inputEntries.length > 0 ? (
                inputEntries.map(([key, delta]) => {
                  if (!delta) return null;
                  return (
                    <tr key={key}>
                      <td className="px-6 py-3.5 font-medium text-ink">{formatLabel(key)}</td>
                      <td className="px-6 py-3.5">{formatVal(key, delta.from)}</td>
                      <td className="px-6 py-3.5 font-semibold text-ink">
                        {formatVal(key, delta.to)}
                      </td>
                      <td className="px-6 py-3.5">{renderDirection(delta)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-xs text-ink/50">
                    No active constraints were evaluated in both scenarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Output Deltas Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral bg-[#faf8f4] shadow-card">
        <div className="px-6 py-4 border-b border-neutral bg-[#f5f2ec]/60">
          <h4 className="font-serif text-base font-bold text-ink">
            Deterministic Simulation Outputs
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral bg-neutral/30 text-xs font-semibold text-ink/60 uppercase">
              <tr>
                <th className="px-6 py-3">Metric</th>
                <th className="px-6 py-3">Baseline (A)</th>
                <th className="px-6 py-3">Proposed (B)</th>
                <th className="px-6 py-3">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral/50 font-sans">
              {/* Composite Risk Score */}
              {outputDiff?.riskScore && (
                <tr className="bg-neutral/10 font-bold">
                  <td className="px-6 py-3.5">Risk Score (0-100)</td>
                  <td className="px-6 py-3.5">{outputDiff.riskScore.from}</td>
                  <td className="px-6 py-3.5">{outputDiff.riskScore.to}</td>
                  <td className="px-6 py-3.5">{renderDirection(outputDiff.riskScore)}</td>
                </tr>
              )}

              {/* Feasibility Status */}
              {outputDiff?.feasible && (
                <tr>
                  <td className="px-6 py-3.5 font-medium text-ink">Feasibility Status</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        outputDiff.feasible.from
                          ? "bg-risk-low text-[#2a4225]"
                          : "bg-risk-crit text-[#4f1e14]"
                      }`}
                    >
                      {outputDiff.feasible.from ? "Feasible" : "Infeasible"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        outputDiff.feasible.to
                          ? "bg-risk-low text-[#2a4225]"
                          : "bg-risk-crit text-[#4f1e14]"
                      }`}
                    >
                      {outputDiff.feasible.to ? "Feasible" : "Infeasible"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-xs">
                    {outputDiff.feasible.changed ? (
                      <span className="text-accent font-bold">Transitioned</span>
                    ) : (
                      <span className="text-ink/40">No change</span>
                    )}
                  </td>
                </tr>
              )}

              {/* Other Evaluated Outputs */}
              {otherOutputEntries.map(([key, delta]) => {
                if (!delta || typeof delta !== "object" || !("from" in delta)) return null;
                return (
                  <tr key={key}>
                    <td className="px-6 py-3.5 font-medium text-ink">{formatLabel(key)}</td>
                    <td className="px-6 py-3.5">{formatVal(key, delta.from)}</td>
                    <td className="px-6 py-3.5 font-semibold text-ink">
                      {formatVal(key, delta.to)}
                    </td>
                    <td className="px-6 py-3.5">{renderDirection(delta)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScenarioDiffTable;
