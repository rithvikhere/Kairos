"use client";

import React from "react";
import type { InputAttribution } from "../../domain/diff.js";
import { CONSTRAINT_CATALOGUE } from "./ConstraintCatalogueModal.js";

interface SensitivityTornadoChartProps {
  attribution: InputAttribution[];
}

export function SensitivityTornadoChart({ attribution }: SensitivityTornadoChartProps) {
  if (!attribution || attribution.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-neutral text-center text-ink/50 text-xs">
        No active input levers changed between scenarios.
      </div>
    );
  }

  // Preserve diff.ts attribution ordering: already sorted by |isolatedRiskContribution| descending
  const maxAbsImpact = Math.max(
    ...attribution.map((a) => Math.abs(a.isolatedRiskContribution)),
    1
  );

  const getLabel = (field: string) => {
    const found = CONSTRAINT_CATALOGUE.find((m) => m.key === field);
    return found ? found.label : field;
  };

  return (
    <div className="p-5 bg-white border border-neutral rounded-2xl shadow-xs space-y-4 text-ink">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-sm font-bold text-ink">Sensitivity Tornado Chart</h3>
          <p className="text-xs text-ink/60">
            Isolated risk delta per active changed lever (largest absolute impact first)
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-ink/60 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#8ba888]" />
            Risk Decreasing (-pts)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#b5502f]" />
            Risk Increasing (+pts)
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {attribution.map((row) => {
          const impact = row.isolatedRiskContribution;
          const isIncrease = impact > 0;
          const widthPercent = (Math.abs(impact) / maxAbsImpact) * 100;

          return (
            <div key={row.field} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">{getLabel(row.field)}</span>
                <span className="font-mono text-[11px] font-bold">
                  {impact > 0 ? `+${impact.toFixed(1)}` : impact.toFixed(1)} pts
                </span>
              </div>

              {/* Centered zero-axis tornado bar */}
              <div className="h-6 w-full bg-[#f5f2ec] rounded-lg relative flex items-center overflow-hidden border border-neutral/60">
                {/* Center line (0 impact) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-ink/20 z-10" />

                {isIncrease ? (
                  // Positive impact: bar extends right from center
                  <div
                    className="absolute left-1/2 top-1 bottom-1 bg-[#b5502f] rounded-r-md transition-all duration-500 flex items-center justify-end pr-1.5"
                    style={{ width: `${widthPercent / 2}%` }}
                  >
                    <span className="text-[10px] text-white font-mono font-bold">
                      +{impact.toFixed(0)}
                    </span>
                  </div>
                ) : (
                  // Negative impact: bar extends left from center
                  <div
                    className="absolute right-1/2 top-1 bottom-1 bg-[#8ba888] rounded-l-md transition-all duration-500 flex items-center justify-start pl-1.5"
                    style={{ width: `${widthPercent / 2}%` }}
                  >
                    <span className="text-[10px] text-white font-mono font-bold">
                      {impact.toFixed(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 text-[11px] text-ink/50 italic border-t border-neutral/60 leading-relaxed">
        * Single-variable probe: isolated risk score if only this lever were modified from baseline.
        Non-linear interaction effects mean these deltas do not sum directly to total risk change.
      </div>
    </div>
  );
}
