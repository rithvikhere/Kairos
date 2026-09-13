"use client";

import React from "react";
import { Info } from "lucide-react";
import { RISK_DIMENSION_WEIGHTS } from "../../domain/simulation.js";

interface RiskCompositionBarChartProps {
  computed: Partial<Record<string, number>>;
  riskScore: number;
  onExplainDimension?: (dimensionKey: string) => void;
}

const DIMENSION_LABELS: Record<string, string> = {
  scheduleRisk: "Schedule Risk",
  budgetRisk: "Budget Risk",
  staffingRisk: "Staffing Headcount Risk",
  teamSeniorityMixRisk: "Team Seniority Risk",
  attritionRisk: "Team Attrition Risk",
  dependencyRisk: "External Dependency Risk",
  technicalDebtRisk: "Technical Debt Risk",
  scopeVolatilityRisk: "Scope Volatility Risk",
  distributedTeamOverheadRisk: "Multisite Overhead Risk",
  vendorLeadTimeRisk: "Vendor Lead Time Risk",
  regulatoryComplexityRisk: "Regulatory Compliance Risk",
  complianceRisk: "Compliance Risk",
  qualityRigorRisk: "Quality & Testing Rigor Risk",
  stakeholderCountRisk: "Stakeholder Alignment Risk",
  approvalRisk: "Approval Complexity Risk",
  teamFamiliarityRisk: "Domain Familiarity Risk",
};

export function RiskCompositionBarChart({
  computed,
  riskScore,
  onExplainDimension,
}: RiskCompositionBarChartProps) {
  // Extract only risk dimensions actually computed, avoiding double-counting aliases
  const activeKeys = Object.keys(computed).filter(
    (k) =>
      k.toLowerCase().includes("risk") &&
      typeof computed[k] === "number" &&
      k !== "complianceRisk" && // alias of regulatoryComplexityRisk
      k !== "approvalRisk" // alias of stakeholderCountRisk
  );

  if (activeKeys.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-neutral text-center text-ink/50 text-xs">
        No risk dimensions evaluated. Enable resourcing or risk constraints to evaluate risk composition.
      </div>
    );
  }

  // Calculate total active weight for display
  const totalWeight = activeKeys.reduce(
    (sum, k) => sum + (RISK_DIMENSION_WEIGHTS[k] ?? 0.1),
    0
  );

  const getBarColor = (val: number) => {
    if (val >= 75) return "bg-[#b5502f]"; // critical
    if (val >= 50) return "bg-[#c98a3e]"; // high
    if (val >= 25) return "bg-[#d4b068]"; // moderate
    return "bg-[#8ba888]"; // low
  };

  return (
    <div className="p-5 bg-white border border-neutral rounded-2xl shadow-xs space-y-4 text-ink">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-sm font-bold text-ink">Risk Composition Breakdown</h3>
          <p className="text-xs text-ink/60">
            Evaluated risk dimensions ({activeKeys.length} active) contributing to composite risk score ({riskScore.toFixed(2)})
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold text-ink/50 uppercase font-mono">Composite Score</div>
          <div className="font-serif text-lg font-bold text-ink">{riskScore.toFixed(2)} / 100</div>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {activeKeys.map((key) => {
          const score = computed[key] ?? 0;
          const baseWeight = RISK_DIMENSION_WEIGHTS[key] ?? 0.1;
          const normalizedWeightPct = totalWeight > 0 ? Math.round((baseWeight / totalWeight) * 100) : 0;
          const label = DIMENSION_LABELS[key] || key;

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-ink flex items-center gap-1.5">
                  {label}
                  {onExplainDimension && (
                    <button
                      type="button"
                      onClick={() => onExplainDimension(key)}
                      className="text-ink/40 hover:text-accent transition-colors p-0.5"
                      title={`Explain ${label}`}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-[10px] text-ink/40 font-mono">({normalizedWeightPct}% wt)</span>
                </span>
                <span className="font-mono text-xs font-bold text-ink">
                  {score.toFixed(2)}
                </span>
              </div>

              <div className="h-2.5 w-full bg-[#f5f2ec] rounded-full overflow-hidden border border-neutral/50">
                <div
                  className={`h-full ${getBarColor(score)} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
