"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Sliders, ShieldAlert, Users, Layers, Globe, Info, Sparkles } from "lucide-react";
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

export const CONSTRAINT_PURPOSES: Record<ConstraintKey, {
  use: string;
  impact: string;
  mechanism: string;
  guidance: string;
}> = {
  scope: {
    use: "Foundational technical effort anchor required to compute calendar duration and team burn.",
    impact: "Delivery timeline, team burn, actual cost, and utilization curves.",
    mechanism: "Estimated Duration = Scope / (Effective Headcount × Velocity Factor).",
    guidance: "Calibrate via story points or person-weeks. Baseline standard is 140 points.",
  },
  headcount: {
    use: "Team size capacity lever balancing raw engineering throughput against quadratic communication tax.",
    impact: "Effective Headcount, Delivery Duration, Staffing Risk, and Actual Burn Rate.",
    mechanism: "Applies Brooks's Law: Overhead = 1 + 0.05 × max(0, n - 3); Effective Headcount = n / Overhead Factor.",
    guidance: "Ideal autonomous pod size is 5–8 engineers. Above 12 introduces severe communication drag.",
  },
  budget: {
    use: "Financial authorization ceiling that penalizes cost overruns and enforces resource discipline.",
    impact: "Budget Risk, Financial Feasibility, and Cost Overrun Penalties.",
    mechanism: "Actual Cost = Headcount × Duration × $1,758.50/person-week. Compares actual burn vs cap.",
    guidance: "Ensure budget includes contractor margins, tooling, and cloud infrastructure.",
  },
  deadlineWeeks: {
    use: "Target calendar milestone boundary that establishes schedule feasibility and delivery pressure.",
    impact: "Schedule Risk, Project Feasibility status, and Delivery Slip warnings.",
    mechanism: "Schedule Utilization = Estimated Duration / Target Deadline. Non-linear risk penalty past deadline.",
    guidance: "Maintain a 15–20% schedule buffer to absorb discovery and unexpected integration cycles.",
  },
  teamSeniorityMix: {
    use: "Ratio of senior/lead engineers to model architectural problem-solving speed and defect prevention.",
    impact: "Team Seniority Risk, Code Quality, and Supervisory Drag.",
    mechanism: "Lower seniority (<0.3) increases bug rework and slows critical path resolution.",
    guidance: "Target 30–50% senior density for core architecture to balance mentorship and execution velocity.",
  },
  attritionRisk: {
    use: "Turnover expectation modeling context loss, vacancy gaps, and onboarding drag from departures.",
    impact: "Team Attrition Risk and Capacity Degradation.",
    mechanism: "Turnover triggers 1.5x compounding risk multiplier due to knowledge drainage.",
    guidance: "Historical software team attrition runs 10–18% annually. Mitigate with documentation.",
  },
  teamFamiliarity: {
    use: "Proficiency ratio with target technology stack, API contracts, and domain codebase.",
    impact: "Domain Familiarity Risk and Initial Sprint Velocity.",
    mechanism: "New stacks require conceptual exploration spikes, introducing 20–40% early-phase drag.",
    guidance: "If adopting a new framework, budget 2–3 weeks of initial prototyping.",
  },
  externalDependencyCount: {
    use: "Count of upstream teams, third-party APIs, or vendor services on the critical path.",
    impact: "External Dependency Risk and Blocking Probability.",
    mechanism: "Each external dependency introduces coordination friction and handoff latency.",
    guidance: "Keep hard external blockers below 3 per autonomous stream.",
  },
  vendorLeadTimeWeeks: {
    use: "Procurement, security review, and vendor provisioning lead time in calendar weeks.",
    impact: "Vendor Lead Time Risk and Upstream Schedule Gating.",
    mechanism: "Delays milestone kick-off and gates integration testing until vendor delivery.",
    guidance: "Account for 4–6 weeks for enterprise procurement and legal compliance reviews.",
  },
  regulatoryComplexity: {
    use: "Scrutiny bar for compliance regimes (SOC2, GDPR, HIPAA, PCI, financial governance).",
    impact: "Regulatory Compliance Risk and Audit Gate Deadlines.",
    mechanism: "Mandates rigorous verification checkpoints, slowing release velocity by 15–30%.",
    guidance: "Involve compliance officers at sprint planning rather than at release gate.",
  },
  technicalDebtLevel: {
    use: "Legacy code friction, missing test coverage, and refactoring burden in target modules.",
    impact: "Technical Debt Risk, Regression Rate, and Bug Backlog.",
    mechanism: "High debt creates unexpected regressions during feature development, requiring extra rework.",
    guidance: "Allocate 20% of sprint capacity to debt remediation if severity is 5 or above.",
  },
  scopeVolatility: {
    use: "Anticipated mid-project requirement churn, pivoting stakeholder priorities, or spec expansion.",
    impact: "Scope Volatility Risk and Stochastic Timeline Variance.",
    mechanism: "Increases Monte Carlo variance spread, expanding the p90 delivery tail.",
    guidance: "Lock scope at milestone freeze; high volatility projects require agile re-baselining.",
  },
  distributedTeamOverhead: {
    use: "Number of disparate time zones and geographical sites collaborating on delivery.",
    impact: "Multisite Overhead Risk and Asynchronous Handoff Latency.",
    mechanism: "Timezone gaps >4 hours reduce synchronous overlap, delaying pull-request reviews.",
    guidance: "Establish core overlapping collaboration hours (at least 3–4 hours daily).",
  },
  qualityRigor: {
    use: "Required test coverage, penetration tests, and security hardening verification standard.",
    impact: "Quality & Testing Risk and Release Certification Buffer.",
    mechanism: "High rigor (8+) increases validation duration but suppresses downstream production failures.",
    guidance: "High-rigor tier is recommended for payment processing and core authentication services.",
  },
  stakeholderCount: {
    use: "Number of sign-off gatekeepers, executive reviewers, or cross-functional sponsors.",
    impact: "Stakeholder Alignment Risk and Approval Delay Cycles.",
    mechanism: "Quadratic consensus overhead: each stakeholder adds alignment meetings and review cycles.",
    guidance: "Designate a single product decision-maker with final sign-off authority.",
  },
};

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Core Resourcing": <Layers className="w-4 h-4 text-[#3a5a6b]" />,
  "Team Factors": <Users className="w-4 h-4 text-[#3d5a45]" />,
  "External Factors": <Globe className="w-4 h-4 text-[#6e4e2e]" />,
  "Process Factors": <ShieldAlert className="w-4 h-4 text-[#5e3d6e]" />,
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Core Resourcing": { bg: "bg-[#1d3545]", text: "text-[#7ee787]", border: "border-[#388bfd]/60" },
  "Team Factors": { bg: "bg-[#193822]", text: "text-[#7ee787]", border: "border-[#2ea043]/60" },
  "External Factors": { bg: "bg-[#3f2b14]", text: "text-[#f2cc60]", border: "border-[#d29922]/60" },
  "Process Factors": { bg: "bg-[#3b1f42]", text: "text-[#f778ba]", border: "border-[#bc8cff]/60" },
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
  const [expandedKey, setExpandedKey] = useState<ConstraintKey | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#282c2d] border border-neutral rounded-2xl shadow-modal w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral flex items-center justify-between bg-[#222526]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-[#8ba888]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">Configure Scenario Constraints</h2>
              <p className="text-xs text-white/60">
                Toggle and calibrate the 15 uniform levers that govern simulation computation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-neutral transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {categories.map((cat) => {
            const items = CONSTRAINT_CATALOGUE.filter((m) => m.category === cat);
            const style = CATEGORY_COLORS[cat] || { bg: "bg-[#2c4356]/40", text: "text-[#8ba888]", border: "border-neutral" };

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
                            ? "bg-[#222526] border-accent/60 shadow-xs"
                            : "bg-[#1e2122]/70 border-neutral/60 text-white/70 hover:text-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Toggle & Label */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {meta.isMandatory ? (
                              <div
                                className="mt-1 w-4 h-4 rounded bg-[#3a5a6b] text-white flex items-center justify-center shrink-0 shadow-2xs"
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
                                className="text-sm font-semibold text-white cursor-pointer hover:underline flex items-center gap-1.5"
                              >
                                {meta.label}
                                {meta.isMandatory && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#3a5a6b]/30 text-[#8ba888] font-bold border border-[#3a5a6b]/50">
                                    Mandatory Anchor
                                  </span>
                                )}
                                <span className="text-[11px] font-mono font-normal text-white/50">
                                  ({meta.unit})
                                </span>
                              </label>
                              <p className="text-xs text-white/65 leading-relaxed mt-0.5">
                                {meta.description}
                              </p>

                              {/* Information about constraint: what's the use before even adding it */}
                              <div className="mt-2 pt-2 border-t border-neutral/40 text-[11px] space-y-1.5">
                                <div className="flex items-start gap-1.5 text-[#8ba888]">
                                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#8ba888]" />
                                  <div className="leading-snug">
                                    <span className="font-semibold text-[#8ba888]">Simulation Purpose: </span>
                                    <span className="text-white/80">
                                      {CONSTRAINT_PURPOSES[meta.key]?.use || meta.description}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-1 text-[10.5px] text-white/60 pt-0.5">
                                  <span>
                                    <strong className="text-white/80">Impacts:</strong>{" "}
                                    {CONSTRAINT_PURPOSES[meta.key]?.impact}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedKey(expandedKey === meta.key ? null : meta.key);
                                    }}
                                    className="text-[#8ba888] hover:underline font-semibold cursor-pointer shrink-0"
                                  >
                                    {expandedKey === meta.key ? "Hide formula & guidance ▲" : "What's the use? Details ▼"}
                                  </button>
                                </div>

                                {expandedKey === meta.key && (
                                  <div className="mt-1.5 p-2.5 rounded-lg bg-[#1e2122] border border-[#3a5a6b]/40 text-[11px] space-y-1.5 text-white/80 shadow-2xs animate-in fade-in duration-150">
                                    <div>
                                      <strong className="text-[#8ba888]">How Kairos Simulates This:</strong>{" "}
                                      <span>{CONSTRAINT_PURPOSES[meta.key]?.mechanism}</span>
                                    </div>
                                    <div>
                                      <strong className="text-[#8ba888]">Recommended Benchmark:</strong>{" "}
                                      <span>{CONSTRAINT_PURPOSES[meta.key]?.guidance}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
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
                                  className="w-20 px-2 py-1 text-right font-mono text-xs font-semibold bg-[#1e2122] border border-neutral text-white rounded-md focus:border-accent focus:outline-none"
                                />
                                <span className="text-xs text-white/50 font-mono w-10 truncate">
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
                                className="w-full accent-[#8ba888] h-1.5 bg-[#343839] rounded-lg cursor-pointer"
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
        <div className="px-6 py-4 border-t border-neutral bg-[#222526] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
                activeCount > 0
                  ? "bg-accent/20 text-[#8ba888] border border-accent/40"
                  : "bg-[#b5502f]/20 text-[#b5502f] border border-[#b5502f]/40"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {activeCount} of 15 constraints active
            </span>
            {activeCount === 0 && (
              <span className="text-xs text-[#b5502f] font-medium">
                At least 1 constraint must be enabled to simulate
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white rounded-xl border border-neutral hover:bg-[#343839] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={activeCount === 0}
              className={`px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-all flex items-center gap-1.5 ${
                activeCount > 0
                  ? "bg-accent hover:bg-accent/90 cursor-pointer"
                  : "bg-neutral/70 text-white/30 cursor-not-allowed"
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
