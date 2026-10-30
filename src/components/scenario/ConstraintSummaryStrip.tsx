"use client";

import React from "react";
import { Sliders } from "lucide-react";
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
    <div className="p-3.5 bg-[#1c1f20] border border-[#454d4b] rounded-2xl shadow-card space-y-3 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Active Constraints</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#8ba888]/20 text-[#a3d8b8] font-mono text-[11px] font-semibold border border-[#8ba888]/40">
            {activeCount} of 15 enabled
          </span>
        </div>
        <button
          onClick={onOpenModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#454d4b] bg-[#2a2e30] hover:bg-[#34383a] text-xs font-semibold text-white transition-colors shadow-xs cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#a3d8b8]" />
          <span>Configure Constraints</span>
        </button>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5">
        {CONSTRAINT_CATALOGUE.map((meta) => {
          const setting = constraints[meta.key];
          const isEnabled = setting?.enabled === true;
          const style = CATEGORY_COLORS[meta.category] || { bg: "bg-[#1d3545]", text: "text-[#7ee787]", border: "border-[#388bfd]/60" };

          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => (onExplainConstraint ? onExplainConstraint(meta.key) : onOpenModal())}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer text-left focus:outline-none ${
                isEnabled
                  ? `${style.bg} ${style.text} border ${style.border} shadow-2xs font-semibold hover:brightness-110`
                  : "bg-[#25282a] text-[#e0e3e5] border border-[#454d4b] hover:border-[#6b7376] hover:text-white hover:bg-[#2e3235]"
              }`}
              title={`${meta.label}: Click to view details`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isEnabled ? "bg-current shadow-[0_0_6px_currentColor]" : "bg-[#7a8387]"
                }`}
              />
              <span className="font-medium">{meta.label}</span>
              {isEnabled && setting?.value !== undefined && (
                <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-black/40 text-white border border-white/10" suppressHydrationWarning>
                  {meta.key === "budget"
                    ? `$${Number(setting.value).toLocaleString("en-US")}`
                    : setting.value}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
