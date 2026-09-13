"use client";

import React from "react";
import { Slider } from "../ui/Slider.js";
import { CountUp } from "../ui/CountUp.js";
import { Badge } from "../ui/Badge.js";
import { getRiskBand } from "../../lib/riskBand.js";
import { RISK_COLOR_MAP } from "../../lib/riskColorMap.js";
import type { ScenarioInputs, SimulationResult } from "../../domain/types.js";
import { DEFAULT_SCOPE_PERSON_WEEKS } from "../../domain/constants.js";

export interface ScenarioSliderPanelProps {
  inputs: ScenarioInputs;
  onChange: (inputs: ScenarioInputs) => void;
  previewResult: SimulationResult | null;
  isLoading?: boolean;
}

export const ScenarioSliderPanel: React.FC<ScenarioSliderPanelProps> = ({
  inputs,
  onChange,
  previewResult,
  isLoading = false,
}) => {
  const rawInputs = inputs as any;
  const budgetVal = inputs.constraints?.budget?.value ?? rawInputs.budget ?? 500000;
  const headcountVal = inputs.constraints?.headcount?.value ?? rawInputs.headcount ?? 8;
  const deadlineVal = inputs.constraints?.deadlineWeeks?.value ?? rawInputs.deadlineWeeks ?? 24;
  const currentScope =
    inputs.constraints?.scope?.value ?? rawInputs.scope ?? DEFAULT_SCOPE_PERSON_WEEKS;

  const handleBudgetChange = (val: number[]) => {
    const v = val[0] ?? budgetVal;
    onChange({
      ...inputs,
      constraints: {
        ...(inputs.constraints || {}),
        budget: { enabled: true, value: v },
      },
    });
  };

  const handleHeadcountChange = (val: number[]) => {
    const v = val[0] ?? headcountVal;
    onChange({
      ...inputs,
      constraints: {
        ...(inputs.constraints || {}),
        headcount: { enabled: true, value: v },
      },
    });
  };

  const handleDeadlineChange = (val: number[]) => {
    const v = val[0] ?? deadlineVal;
    onChange({
      ...inputs,
      constraints: {
        ...(inputs.constraints || {}),
        deadlineWeeks: { enabled: true, value: v },
      },
    });
  };

  const handleScopeChange = (val: number[]) => {
    const v = val[0] ?? currentScope;
    onChange({
      ...inputs,
      constraints: {
        ...(inputs.constraints || {}),
        scope: { enabled: true, value: v },
      },
    });
  };

  const riskBand = previewResult
    ? getRiskBand(previewResult.riskScore, previewResult.feasible)
    : "neutral";
  const visualConfig = RISK_COLOR_MAP[riskBand];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 rounded-2xl border border-neutral bg-[#faf8f4] shadow-card">
      {/* Sliders Column (2 cols wide on desktop) */}
      <div className="lg:col-span-2 space-y-6">
        <h3 className="font-serif text-lg font-bold text-ink">
          Scenario Levers & Calibration
        </h3>

        {/* Budget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Budget Available</span>
            <div className="font-mono text-base font-bold text-accent">
              $<CountUp to={budgetVal} separator="," duration={0.3} />
            </div>
          </div>
          <Slider
            value={[budgetVal]}
            min={20_000}
            max={2_000_000}
            step={10_000}
            onValueChange={handleBudgetChange}
          />
          <div className="flex justify-between text-[11px] text-ink/40">
            <span>$20k</span>
            <span>$2,000k</span>
          </div>
        </div>

        {/* Headcount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Team Headcount</span>
            <div className="font-mono text-base font-bold text-accent">
              <CountUp to={headcountVal} duration={0.3} /> people
            </div>
          </div>
          <Slider
            value={[headcountVal]}
            min={1}
            max={35}
            step={1}
            onValueChange={handleHeadcountChange}
          />
          <div className="flex justify-between text-[11px] text-ink/40">
            <span>1 person</span>
            <span>35 people</span>
          </div>
        </div>

        {/* Deadline Weeks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Target Deadline</span>
            <div className="font-mono text-base font-bold text-accent">
              <CountUp to={deadlineVal} duration={0.3} /> weeks
            </div>
          </div>
          <Slider
            value={[deadlineVal]}
            min={2}
            max={104}
            step={1}
            onValueChange={handleDeadlineChange}
          />
          <div className="flex justify-between text-[11px] text-ink/40">
            <span>2 weeks</span>
            <span>104 weeks (2 yrs)</span>
          </div>
        </div>

        {/* Scope (Person-Weeks) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Total Scope</span>
            <div className="font-mono text-base font-bold text-accent">
              <CountUp to={currentScope} duration={0.3} /> person-weeks
            </div>
          </div>
          <Slider
            value={[currentScope]}
            min={40}
            max={1500}
            step={10}
            onValueChange={handleScopeChange}
          />
          <div className="flex justify-between text-[11px] text-ink/40">
            <span>40 person-weeks</span>
            <span>1,500 person-weeks</span>
          </div>
        </div>
      </div>

      {/* Live Preview Column */}
      <div className="flex flex-col justify-between p-5 rounded-xl border border-neutral bg-[#f5f2ec] text-ink">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/50">
              Live Preview
            </span>
            {isLoading && (
              <span className="text-[10px] text-accent animate-pulse font-medium">
                Simulating...
              </span>
            )}
          </div>

          {previewResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-serif font-bold text-ink">
                    <CountUp to={previewResult.riskScore} duration={0.4} />
                    <span className="text-xs text-ink/50 font-normal"> / 100</span>
                  </div>
                  <Badge variant={riskBand} className="mt-1">
                    {visualConfig.label}
                  </Badge>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                      previewResult.feasible
                        ? "bg-risk-low text-[#2a4225] border border-[#c8d9c2]"
                        : "bg-risk-crit text-[#4f1e14] border border-[#bf7765]"
                    }`}
                  >
                    {previewResult.feasible ? "Feasible" : "Infeasible"}
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 pt-3 border-t border-neutral text-xs">
                <div className="flex justify-between">
                  <span className="text-ink/60">Estimated Time:</span>
                  <span className="font-semibold">
                    {previewResult.estimatedTimeWeeks ?? previewResult.computed?.estimatedTimeWeeks ?? "—"} weeks
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Effective Headcount:</span>
                  <span className="font-semibold">
                    {(previewResult.effectiveHeadcount ?? previewResult.computed?.effectiveHeadcount)?.toFixed(1) ?? "—"} people
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Actual Cost:</span>
                  <span className="font-semibold">
                    ${Math.round(((previewResult.actualCost ?? previewResult.computed?.actualCost) || 0) / 1000)}k
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Budget Utilization:</span>
                  <span className="font-semibold">
                    {(((previewResult.budgetUtilization ?? previewResult.computed?.budgetUtilization) || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Schedule Utilization:</span>
                  <span className="font-semibold">
                    {(((previewResult.scheduleUtilization ?? previewResult.computed?.scheduleUtilization) || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-ink/50 py-8 text-center">
              Adjust sliders to preview simulation outcome.
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-neutral/60 text-[10px] text-ink/40">
          * Pure client preview computed via Brooks&apos;s law engine.
        </div>
      </div>
    </div>
  );
};

export default ScenarioSliderPanel;
