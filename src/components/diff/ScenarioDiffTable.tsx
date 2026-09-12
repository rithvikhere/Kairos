"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { ScenarioDiff, FieldDelta } from "../../domain/diff.js";

export interface ScenarioDiffTableProps {
  diff: ScenarioDiff;
}

export const ScenarioDiffTable: React.FC<ScenarioDiffTableProps> = ({ diff }) => {
  const { inputDiff, outputDiff, monteCarloDiff } = diff;

  const renderDirection = (delta: FieldDelta) => {
    if (delta.direction === "increased") {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>+{delta.delta.toLocaleString("en-US")}</span>
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
          <span>{delta.delta.toLocaleString("en-US")}</span>
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

  return (
    <div className="space-y-6">
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
              <tr>
                <td className="px-6 py-3.5 font-medium text-ink">Budget Available</td>
                <td className="px-6 py-3.5">${inputDiff.budget.from.toLocaleString("en-US")}</td>
                <td className="px-6 py-3.5 font-semibold text-ink">
                  ${inputDiff.budget.to.toLocaleString("en-US")}
                </td>
                <td className="px-6 py-3.5">{renderDirection(inputDiff.budget)}</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-ink">Team Headcount</td>
                <td className="px-6 py-3.5">{inputDiff.headcount.from} people</td>
                <td className="px-6 py-3.5 font-semibold text-ink">
                  {inputDiff.headcount.to} people
                </td>
                <td className="px-6 py-3.5">{renderDirection(inputDiff.headcount)}</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-ink">Target Deadline</td>
                <td className="px-6 py-3.5">{inputDiff.deadlineWeeks.from} weeks</td>
                <td className="px-6 py-3.5 font-semibold text-ink">
                  {inputDiff.deadlineWeeks.to} weeks
                </td>
                <td className="px-6 py-3.5">{renderDirection(inputDiff.deadlineWeeks)}</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-ink">Total Scope</td>
                <td className="px-6 py-3.5">{inputDiff.scope.from} person-wks</td>
                <td className="px-6 py-3.5 font-semibold text-ink">
                  {inputDiff.scope.to} person-wks
                </td>
                <td className="px-6 py-3.5">{renderDirection(inputDiff.scope)}</td>
              </tr>
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
              <tr className="bg-neutral/10 font-bold">
                <td className="px-6 py-3.5">Risk Score (0-100)</td>
                <td className="px-6 py-3.5">{outputDiff.riskScore.from}</td>
                <td className="px-6 py-3.5">{outputDiff.riskScore.to}</td>
                <td className="px-6 py-3.5">{renderDirection(outputDiff.riskScore)}</td>
              </tr>
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
              <tr>
                <td className="px-6 py-3.5 font-medium text-ink">Estimated Duration</td>
                <td className="px-6 py-3.5">{outputDiff.estimatedTimeWeeks.from} wks</td>
                <td className="px-6 py-3.5 font-semibold text-ink">
                  {outputDiff.estimatedTimeWeeks.to} wks
                </td>
                <td className="px-6 py-3.5">
                  {renderDirection(outputDiff.estimatedTimeWeeks)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-ink">Actual Cost</td>
                <td className="px-6 py-3.5">
                  ${outputDiff.actualCost.from.toLocaleString("en-US")}
                </td>
                <td className="px-6 py-3.5 font-semibold text-ink">
                  ${outputDiff.actualCost.to.toLocaleString("en-US")}
                </td>
                <td className="px-6 py-3.5">{renderDirection(outputDiff.actualCost)}</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-ink">Budget Utilization</td>
                <td className="px-6 py-3.5">
                  {(outputDiff.budgetUtilization.from * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-3.5 font-semibold text-ink">
                  {(outputDiff.budgetUtilization.to * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-3.5">
                  {renderDirection({
                    ...outputDiff.budgetUtilization,
                    delta: Number((outputDiff.budgetUtilization.delta * 100).toFixed(1)) as any,
                  })}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-ink">Schedule Utilization</td>
                <td className="px-6 py-3.5">
                  {(outputDiff.scheduleUtilization.from * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-3.5 font-semibold text-ink">
                  {(outputDiff.scheduleUtilization.to * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-3.5">
                  {renderDirection({
                    ...outputDiff.scheduleUtilization,
                    delta: Number((outputDiff.scheduleUtilization.delta * 100).toFixed(1)) as any,
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScenarioDiffTable;
