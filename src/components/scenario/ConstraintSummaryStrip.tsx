"use client";

import React from "react";
import { Sliders, Info } from "lucide-react";
import type { ConstraintKey, ConstraintSetting } from "../../domain/types.js";
import {
  CONSTRAINT_CATALOGUE,
  CATEGORY_COLORS,
} from "./ConstraintCatalogueModal.js";

interface ConstraintSummaryStripProps {
  constraints: Partial<Record<ConstraintKey, ConstraintSetting>>;
  onOpenModal: () => void;
  onExplainConstraint?: (key: ConstraintKey) => void;
}

export function ConstraintSummaryStrip({
  constraints,
  onOpenModal,
  onExplainConstraint,
}: ConstraintSummaryStripProps) {
  const activeCount = Object.values(constraints).filter((s) => s?.enabled).length;

  return (
    <div className="p-3.5 bg-white border border-neutral rounded-2xl shadow-xs space-y-2.5 text-ink">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">Active Constraints</span>
          <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono text-[11px] font-semibold border border-accent/20">
            {activeCount} of 15 enabled
          </span>
        </div>
        <button
          onClick={onOpenModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral bg-[#faf8f4] hover:bg-neutral text-xs font-semibold text-ink transition-colors shadow-xs"
        >
          <Sliders className="w-3.5 h-3.5 text-accent" />
          Configure Constraints
        </button>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5">
        {CONSTRAINT_CATALOGUE.map((meta) => {
          const setting = constraints[meta.key];
          const isEnabled = setting?.enabled === true;
          const style = CATEGORY_COLORS[meta.category] || { bg: "bg-[#edf3f6]", text: "text-[#244252]", border: "border-neutral" };

          return (
            <div
              key={meta.key}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                isEnabled
                  ? `${style.bg} ${style.text} border ${style.border} shadow-2xs font-semibold`
                  : "bg-[#f5f2ec]/50 text-ink/35 border border-neutral/60 hover:border-neutral hover:text-ink/60"
              }`}
            >
              <button
                type="button"
                onClick={onOpenModal}
                className="flex items-center gap-1.5 text-left focus:outline-none"
                title={`${meta.label}: ${meta.description}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isEnabled ? "bg-current" : "bg-ink/20"
                  }`}
                />
                <span>{meta.label}</span>
                {isEnabled && setting?.value !== undefined && (
                  <span className="font-mono text-[11px] opacity-80">
                    {meta.key === "budget"
                      ? `$${Number(setting.value).toLocaleString()}`
                      : setting.value}
                  </span>
                )}
              </button>

              {onExplainConstraint && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExplainConstraint(meta.key);
                  }}
                  className="p-0.5 opacity-40 hover:opacity-100 hover:text-accent transition-opacity"
                  title={`Explain what ${meta.label} does`}
                >
                  <Info className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
