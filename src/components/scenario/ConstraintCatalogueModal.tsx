"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Sliders, ShieldAlert, Users, Layers, Globe } from "lucide-react";
import type { ConstraintKey, ConstraintSetting, ScenarioInputs } from "../../domain/types.js";

export interface ConstraintMeta {
  key: ConstraintKey;
  label: string;
  category: "Core Resourcing" | "Team Factors" | "External Factors" | "Process Factors";
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description: string;
  isMandatory?: boolean;
}

export const CONSTRAINT_CATALOGUE: ConstraintMeta[] = [
  // 1. Core Resourcing
  {
    key: "scope",
    label: "Scope Effort",
    category: "Core Resourcing",
    unit: "story points",
    min: 20,
    max: 2000,
    step: 5,
    defaultValue: 140,
    description: "Total estimated technical workload. Core workload anchor required to compute timeline, cost, and simulation charts.",
    isMandatory: true,
  },
  {
    key: "headcount",
    label: "Headcount",
    category: "Core Resourcing",
    unit: "people",
    min: 1,
    max: 50,
    step: 1,
    defaultValue: 8,
    description: "Total team size. Below 3 increases bus-factor risk; above 15 increases communication overhead.",
  },
  {
    key: "budget",
    label: "Budget",
    category: "Core Resourcing",
    unit: "$",
    min: 10000,
    max: 2000000,
    step: 5000,
    defaultValue: 250000,
    description: "Allocated funding cap in USD.",
  },
  {
    key: "deadlineWeeks",
    label: "Deadline",
    category: "Core Resourcing",
    unit: "weeks",
    min: 2,
    max: 104,
    step: 1,
    defaultValue: 16,
    description: "Required calendar delivery timeframe.",
  },

  // 2. Team Factors
  {
    key: "teamSeniorityMix",
    label: "Seniority Ratio",
    category: "Team Factors",
    unit: "ratio (0–1)",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.4,
    description: "Fraction of team with senior/lead-level domain experience.",
  },
  {
    key: "attritionRisk",
    label: "Attrition Expectation",
    category: "Team Factors",
    unit: "rate (0–1)",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.15,
    description: "Expected team turnover probability during the execution lifecycle.",
  },
  {
    key: "teamFamiliarity",
    label: "Tech & Domain Familiarity",
    category: "Team Factors",
    unit: "ratio (0–1)",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.6,
    description: "Fraction of team already experienced with target stack and codebase.",
  },

  // 3. External Factors
  {
    key: "externalDependencyCount",
    label: "External Dependencies",
    category: "External Factors",
    unit: "deps",
    min: 0,
    max: 20,
    step: 1,
    defaultValue: 3,
    description: "Number of external teams, third-party APIs, or vendor systems required.",
  },
  {
    key: "vendorLeadTimeWeeks",
    label: "Vendor Lead Time",
    category: "External Factors",
    unit: "weeks",
    min: 0,
    max: 26,
    step: 1,
    defaultValue: 4,
    description: "Estimated procurement or external review lead time in weeks.",
  },
  {
    key: "regulatoryComplexity",
    label: "Regulatory Burden",
    category: "External Factors",
    unit: "bar (0–10)",
    min: 0,
    max: 10,
    step: 1,
    defaultValue: 3,
    description: "Compliance scrutiny level (GDPR, HIPAA, SOC2, financial governance).",
  },

  // 4. Process Factors
  {
    key: "technicalDebtLevel",
    label: "Technical Debt",
    category: "Process Factors",
    unit: "severity (0–10)",
    min: 0,
    max: 10,
    step: 1,
    defaultValue: 4,
    description: "Legacy code friction and refactoring burden in target modules.",
  },
  {
    key: "scopeVolatility",
    label: "Scope Volatility",
    category: "Process Factors",
    unit: "% change",
    min: 0,
    max: 100,
    step: 5,
    defaultValue: 15,
    description: "Anticipated requirement churn or mid-project pivot frequency.",
  },
  {
    key: "distributedTeamOverhead",
    label: "Distributed Sites",
    category: "Process Factors",
    unit: "locations",
    min: 1,
    max: 10,
    step: 1,
    defaultValue: 1,
    description: "Distinct geographic time zones or office locations (1 = co-located).",
  },
  {
    key: "qualityRigor",
    label: "Quality & Testing Bar",
    category: "Process Factors",
    unit: "rigor (0–10)",
    min: 0,
    max: 10,
    step: 1,
    defaultValue: 6,
    description: "Required test coverage, security scans, and formal QA verification stages.",
  },
  {
    key: "stakeholderCount",
    label: "Stakeholder Groups",
    category: "Process Factors",
    unit: "groups",
    min: 1,
    max: 25,
    step: 1,
    defaultValue: 4,
    description: "Number of sign-off gatekeepers, executive reviewers, or client sponsors.",
  },
];

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Core Resourcing": <Layers className="w-4 h-4 text-[#3a5a6b]" />,
  "Team Factors": <Users className="w-4 h-4 text-[#3d5a45]" />,
  "External Factors": <Globe className="w-4 h-4 text-[#6e4e2e]" />,
  "Process Factors": <ShieldAlert className="w-4 h-4 text-[#5e3d6e]" />,
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Core Resourcing": { bg: "bg-[#edf3f6]", text: "text-[#244252]", border: "border-[#3a5a6b]/20" },
  "Team Factors": { bg: "bg-[#eaf1ec]", text: "text-[#27422e]", border: "border-[#3d5a45]/20" },
  "External Factors": { bg: "bg-[#f4eee6]", text: "text-[#4d331a]", border: "border-[#6e4e2e]/20" },
  "Process Factors": { bg: "bg-[#f3edf5]", text: "text-[#442852]", border: "border-[#5e3d6e]/20" },
};

interface ConstraintCatalogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConstraints: Partial<Record<ConstraintKey, ConstraintSetting>>;
  onApply: (updated: Partial<Record<ConstraintKey, ConstraintSetting>>) => void;
}

export function ConstraintCatalogueModal({
  isOpen,
  onClose,
  currentConstraints,
  onApply,
}: ConstraintCatalogueModalProps) {
  const [draft, setDraft] = useState<Partial<Record<ConstraintKey, ConstraintSetting>>>({});

  useEffect(() => {
    if (isOpen) {
      // Seed draft with existing constraints or defaults
      const initial: Partial<Record<ConstraintKey, ConstraintSetting>> = {};
      for (const meta of CONSTRAINT_CATALOGUE) {
        const existing = currentConstraints[meta.key];
        initial[meta.key] = {
          enabled: meta.isMandatory ? true : (existing?.enabled ?? false),
          value: existing?.value ?? meta.defaultValue,
        };
      }
      setDraft(initial);
    }
  }, [isOpen, currentConstraints]);

  if (!isOpen) return null;

  const activeCount = Object.values(draft).filter((s) => s?.enabled).length;
  const categories = [
    "Core Resourcing",
    "Team Factors",
    "External Factors",
    "Process Factors",
  ] as const;

  const toggleConstraint = (key: ConstraintKey) => {
    const meta = CONSTRAINT_CATALOGUE.find((m) => m.key === key);
    if (meta?.isMandatory) return; // Scope Effort is mandatory and cannot be disabled
    setDraft((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: {
          enabled: !current?.enabled,
          value: current?.value ?? meta?.defaultValue ?? 0,
        },
      };
    });
  };

  const updateValue = (key: ConstraintKey, value: number) => {
    setDraft((prev) => ({
      ...prev,
      [key]: {
        enabled: prev[key]?.enabled ?? true,
        value,
      },
    }));
  };

  const handleApply = () => {
    if (activeCount >= 1) {
      onApply(draft);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f4] border border-neutral rounded-2xl shadow-modal w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-ink">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink">Configure Scenario Constraints</h2>
              <p className="text-xs text-ink/60">
                Toggle and calibrate the 15 uniform levers that govern simulation computation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-neutral transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {categories.map((cat) => {
            const items = CONSTRAINT_CATALOGUE.filter((m) => m.category === cat);
            const style = CATEGORY_COLORS[cat] || { bg: "bg-[#edf3f6]", text: "text-[#244252]", border: "border-neutral" };

            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 ${style.bg} ${style.text} border ${style.border}`}>
                    {CATEGORY_ICONS[cat]}
                    {cat}
                  </span>
                  <div className="h-px bg-neutral/80 flex-1" />
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {items.map((meta) => {
                    const setting = draft[meta.key] || { enabled: false, value: meta.defaultValue };
                    const isEnabled = setting.enabled;

                    return (
                      <div
                        key={meta.key}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isEnabled
                            ? "bg-white border-accent/30 shadow-xs"
                            : "bg-[#f5f2ec]/60 border-neutral/60 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Toggle & Label */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {meta.isMandatory ? (
                              <div
                                className="mt-1 w-4 h-4 rounded bg-[#2c4356] text-white flex items-center justify-center shrink-0 shadow-2xs"
                                title="Mandatory Core Workload Anchor"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            ) : (
                              <input
                                type="checkbox"
                                id={`toggle-${meta.key}`}
                                checked={isEnabled}
                                onChange={() => toggleConstraint(meta.key)}
                                className="mt-1 w-4 h-4 rounded border-neutral text-accent focus:ring-accent accent-accent cursor-pointer"
                              />
                            )}
                            <div className="min-w-0">
                              <label
                                htmlFor={`toggle-${meta.key}`}
                                className="text-sm font-semibold text-ink cursor-pointer hover:underline flex items-center gap-1.5"
                              >
                                {meta.label}
                                {meta.isMandatory && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2c4356]/10 text-[#2c4356] font-bold">
                                    Mandatory Anchor
                                  </span>
                                )}
                                <span className="text-[11px] font-mono font-normal text-ink/50">
                                  ({meta.unit})
                                </span>
                              </label>
                              <p className="text-xs text-ink/65 leading-relaxed mt-0.5">
                                {meta.description}
                              </p>
                            </div>
                          </div>

                          {/* Inline Slider / Value when enabled */}
                          {isEnabled && (
                            <div className="flex flex-col items-end gap-1.5 min-w-[170px]">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={meta.min}
                                  max={meta.max}
                                  step={meta.step}
                                  value={setting.value}
                                  onChange={(e) => updateValue(meta.key, parseFloat(e.target.value) || meta.min)}
                                  className="w-20 px-2 py-1 text-right font-mono text-xs font-semibold bg-[#faf8f4] border border-neutral rounded-md focus:border-accent focus:outline-none"
                                />
                                <span className="text-xs text-ink/50 font-mono w-10 truncate">
                                  {meta.unit}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={meta.min}
                                max={meta.max}
                                step={meta.step}
                                value={setting.value}
                                onChange={(e) => updateValue(meta.key, parseFloat(e.target.value))}
                                className="w-full accent-accent h-1.5 bg-neutral rounded-lg cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
                activeCount > 0
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {activeCount} of 15 constraints active
            </span>
            {activeCount === 0 && (
              <span className="text-xs text-red-600 font-medium">
                At least 1 constraint must be enabled to simulate
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-ink/70 hover:text-ink rounded-xl border border-neutral hover:bg-[#f5f2ec] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={activeCount === 0}
              className={`px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-all flex items-center gap-1.5 ${
                activeCount > 0
                  ? "bg-accent hover:bg-accent/90 cursor-pointer"
                  : "bg-neutral/70 text-ink/30 cursor-not-allowed"
              }`}
            >
              Apply Constraints
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
