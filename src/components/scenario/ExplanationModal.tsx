"use client";

import React, { useEffect } from "react";
import { X, Info, ShieldAlert, Sparkles, BookOpen, Layers, CheckCircle2 } from "lucide-react";
import type { ConstraintKey } from "../../domain/types.js";

export interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicKey: string | null;
  topicType: "constraint" | "risk" | null;
}

interface TopicDetail {
  title: string;
  category: string;
  tag: string;
  definition: string;
  mechanism: string;
  impact: string;
  guidance: string;
  mathFormula?: string;
}

const CONSTRAINT_EXPLANATIONS: Record<string, TopicDetail> = {
  headcount: {
    title: "Engineering Headcount",
    category: "Core Resourcing",
    tag: "Capacity Lever",
    definition:
      "The total number of full-time equivalent software engineers actively committed to the project scope.",
    mechanism:
      "Kairos applies Brooks's Law: communication overhead scales quadratically as n(n-1)/2. Adding engineers increases raw throughput but simultaneously induces communication drag. Beyond a critical team threshold, effective capacity plateaus or regresses.",
    impact:
      "Directly influences Effective Headcount, Delivery Duration, Staffing Risk, and Actual Burn Rate.",
    guidance:
      "Optimal team size is typically 5–8 engineers per autonomous service pod. Below 3 increases bus-factor risk; above 12 introduces severe communication tax.",
    mathFormula: "Overhead Factor = 1 + 0.05 × max(0, n - 3); Effective Headcount = n / Overhead Factor",
  },
  deadlineWeeks: {
    title: "Target Delivery Deadline",
    category: "Core Resourcing",
    tag: "Schedule Lever",
    definition:
      "The required calendar timeframe (in weeks) to achieve full deployment and operational milestone acceptance.",
    mechanism:
      "Estimated delivery duration is computed by dividing required technical effort by effective team capacity. Comparing this estimate against the deadline yields schedule variance and schedule utilization.",
    impact:
      "Compressing the deadline increases Schedule Risk non-linearly. If estimated duration exceeds the deadline, the scenario quickly crosses into Infeasible status.",
    guidance:
      "Maintain at least a 15–20% schedule buffer for complex integrations to absorb unexpected discovery and review cycles.",
    mathFormula: "Schedule Utilization = Estimated Duration / Target Deadline; Schedule Risk = clamp((Util - 1) × 100)",
  },
  budget: {
    title: "Project Budget Cap",
    category: "Core Resourcing",
    tag: "Financial Lever",
    definition:
      "The maximum allocated financial expenditure authorized for engineering salaries, contractor rates, and tooling.",
    mechanism:
      "Actual cost is calculated from engineering headcount, project duration, and fully-loaded labor rates ($1,758.50 per person-week). The ratio of actual cost to budget determines financial utilization.",
    impact:
      "Directly drives Budget Risk and project feasibility. Cost overruns above 100% budget trigger escalating risk penalties.",
    guidance:
      "Ensure the budget accounts for secondary costs including contractor markups, cloud sandbox costs, and QA environments.",
    mathFormula: "Actual Cost = Headcount × Duration × Labor Rate; Budget Risk = clamp((Actual Cost - Budget) / Budget × 100)",
  },
  scope: {
    title: "Total Scope Effort",
    category: "Core Resourcing",
    tag: "Effort Lever",
    definition:
      "The aggregate technical workload required to deliver the feature set, measured in story points or person-weeks of effort.",
    mechanism:
      "Scope is the foundational numerator of delivery scheduling. Without an active Scope estimate, delivery duration, actual cost, and utilization cannot be evaluated.",
    impact:
      "Directly dictates calendar duration and team burn. Disabling scope removes dependent schedule and cost calculations.",
    guidance:
      "Calibrate scope using historical story-point burn-up data. If requirements are uncertain, enable Scope Volatility.",
    mathFormula: "Estimated Duration = Scope / (Effective Headcount × Velocity Factor)",
  },
  teamSeniorityMix: {
    title: "Team Seniority Ratio",
    category: "Team Factors",
    tag: "Skill Density",
    definition:
      "The fraction (0.0 to 1.0) of team members with senior or lead-level architectural domain expertise.",
    mechanism:
      "Teams with low senior ratios require more supervisory overhead, take longer to resolve complex architectural bugs, and suffer higher rework rates.",
    impact:
      "Scaled inversely into Team Seniority Risk (0% seniors = 100 risk; 100% seniors = 0 risk).",
    guidance:
      "Target a 30–50% senior ratio for mission-critical core services to balance mentorship and execution velocity.",
    mathFormula: "Seniority Risk = clamp((1 - Senior Ratio) × 100)",
  },
  attritionRisk: {
    title: "Expected Team Attrition",
    category: "Team Factors",
    tag: "Turnover Expectation",
    definition:
      "The projected probability (0.0 to 1.0) of key engineers departing during the project lifecycle.",
    mechanism:
      "Unplanned departures cause sudden context loss, require emergency backfilling, and siphon senior capacity into onboarding new hires.",
    impact:
      "Scales with compounding factor into Team Attrition Risk (15% turnover generates 22.5 risk points).",
    guidance:
      "Mitigate turnover risks through robust documentation, pair programming, and proactive compensation reviews.",
    mathFormula: "Attrition Risk = clamp(Turnover Rate × 100 × 1.5)",
  },
  teamFamiliarity: {
    title: "Tech & Domain Familiarity",
    category: "Team Factors",
    tag: "Learning Curve",
    definition:
      "The proportion (0.0 to 1.0) of the team already proficient with the programming languages, frameworks, and architecture.",
    mechanism:
      "Adopting new technologies introduces exploration spikes, conceptual misunderstandings, and slower initial sprint velocity.",
    impact:
      "Inversely scales into Domain Familiarity Risk. 0.60 familiarity results in 40.0 risk points.",
    guidance:
      "Schedule dedicated research spikes prior to feature development when adopting novel libraries or cloud services.",
    mathFormula: "Familiarity Risk = clamp((1 - Familiarity) × 100)",
  },
  externalDependencyCount: {
    title: "External Dependencies",
    category: "External Factors",
    tag: "Blocking Latency",
    definition:
      "The count of third-party APIs, vendor platforms, or upstream internal teams required for project completion.",
    mechanism:
      "Each external dependency introduces asynchronous hand-off latency, API contract mismatches, and scheduling synchronization friction.",
    impact:
      "Follows an exponential saturation curve: 3 dependencies yield ~45 risk; 8+ dependencies saturate past 80 risk points.",
    guidance:
      "De-couple dependencies using mock servers, contracts, and async event queues wherever possible.",
    mathFormula: "Dependency Risk = clamp(100 × (1 - exp(-Dependencies / 5)))",
  },
  vendorLeadTimeWeeks: {
    title: "Vendor Procurement Lead Time",
    category: "External Factors",
    tag: "Critical Path Lag",
    definition:
      "The estimated lag in weeks for commercial contract signing, hardware delivery, or security vendor onboarding.",
    mechanism:
      "Protracted vendor cycles force team idle time or risky development against speculative interface mocks.",
    impact:
      "Exponentially scales Vendor Lead Time Risk. A 4-week delay generates ~48.7 risk points.",
    guidance:
      "Initiate legal, security, and procurement reviews in parallel with technical scoping.",
    mathFormula: "Vendor Lead Time Risk = clamp(100 × (1 - exp(-Weeks / 6)))",
  },
  regulatoryComplexity: {
    title: "Regulatory Compliance Burden",
    category: "External Factors",
    tag: "Governance Bar",
    definition:
      "The degree of formal scrutiny required for compliance standards (GDPR, HIPAA, SOC 2, FedRAMP, PCI-DSS).",
    mechanism:
      "High compliance burdens mandate independent external audits, extensive audit trail logging, and formal security reviews before release.",
    impact:
      "Linearly mapped from [0, 10] into Regulatory Compliance Risk (score = Level × 10).",
    guidance:
      "Engage compliance officers early to define acceptance criteria before building data schemas.",
    mathFormula: "Compliance Risk = clamp((Level / 10) × 100)",
  },
  technicalDebtLevel: {
    title: "Technical Debt Severity",
    category: "Process Factors",
    tag: "Friction & Rigidity",
    definition:
      "The extent of legacy code fragility, unmaintained dependencies, and absent test suites in the target repositories.",
    mechanism:
      "Working within high-debt codebases causes unexpected regression breaks, complex merge conflicts, and sluggish refactoring.",
    impact:
      "Linearly scaled to Technical Debt Risk (Level 4/10 produces 40.0 risk points).",
    guidance:
      "Dedicate 15–20% of sprint capacity to refactoring critical shared modules prior to major feature additions.",
    mathFormula: "Tech Debt Risk = clamp((Severity / 10) × 100)",
  },
  scopeVolatility: {
    title: "Scope Volatility Rate",
    category: "Process Factors",
    tag: "Requirement Churn",
    definition:
      "The anticipated frequency of mid-project requirement changes, scope creep, or pivot requests (0% to 100%).",
    mechanism:
      "Follows empirical NASA SWE-200 project models: moderate requirement volatility creates non-linear compounding rework loops.",
    impact:
      "Evaluated via piecewise convex curve: 10% volatility generates 25 risk; 20% volatility jumps to 55 risk.",
    guidance:
      "Establish a strict change-control process with product stakeholders once implementation begins.",
    mathFormula: "Piecewise curve: (0,0) -> (10,25) -> (20,55) -> (40,85) -> (100,100)",
  },
  distributedTeamOverhead: {
    title: "Distributed Sites / Time Zones",
    category: "Process Factors",
    tag: "Coordination Tax",
    definition:
      "The number of distinct geographic offices or disparate time zones collaborating on the deliverable (1 = co-located).",
    mechanism:
      "Disparate time zones reduce synchronous overlap hours, slow code review turnarounds, and cause communication silos.",
    impact:
      "Evaluated via site-saturation curve: 1 site = 0 risk; 2 sites = 50 risk; 4 sites = 75 risk.",
    guidance:
      "Structure work so that distributed teams own end-to-end decoupled vertical microservices rather than horizontal layers.",
    mathFormula: "Multisite Risk = clamp(100 × (1 - 1 / Sites))",
  },
  qualityRigor: {
    title: "Quality & Testing Bar",
    category: "Process Factors",
    tag: "Verification Bar",
    definition:
      "The thoroughness of automated test coverage, staging soak windows, and chaos engineering drills required before launch.",
    mechanism:
      "Rigorous quality standards prevent costly production incidents but increase upfront engineering verification time.",
    impact:
      "Dampened linear scaling: Level 6/10 produces 48.0 risk points.",
    guidance:
      "Automate end-to-end CI/CD pipelines so high quality rigor does not bottleneck release cadence.",
    mathFormula: "Quality Rigor Risk = clamp((Rigor / 10) × 100 × 0.8)",
  },
  stakeholderCount: {
    title: "Stakeholder Sign-Off Groups",
    category: "Process Factors",
    tag: "Consensus Latency",
    definition:
      "The number of executive sponsors, client bodies, or cross-functional departments whose approval is required.",
    mechanism:
      "Large numbers of stakeholders lead to conflicting priorities, lengthy consensus meetings, and approval paralysis.",
    impact:
      "Saturating exponential curve: 4 groups = ~39 risk; 8 groups = ~63 risk points.",
    guidance:
      "Appoint a single empowered Directly Responsible Individual (DRI) with final decision-making authority.",
    mathFormula: "Approval Risk = clamp(100 × (1 - exp(-Stakeholders / 8)))",
  },
};

const RISK_EXPLANATIONS: Record<string, TopicDetail> = {
  scheduleRisk: {
    title: "Schedule Risk",
    category: "Delivery Timeline",
    tag: "Timeline Variance",
    definition:
      "The likelihood and projected magnitude of failing to meet the target delivery deadline.",
    mechanism:
      "Computed by evaluating schedule utilization (Estimated Delivery Time divided by Target Deadline). When utilization exceeds 1.0 (overdue), risk escalates steeply.",
    impact:
      "Direct driver of overall project feasibility. Feasible scenarios require composite risk < 50.",
    guidance:
      "Reduce scope or extend the deadline to restore delivery buffer.",
    mathFormula: "Schedule Risk = clamp((Estimated Weeks - Deadline) / Deadline × 110 + 35)",
  },
  budgetRisk: {
    title: "Budget Risk",
    category: "Financial Feasibility",
    tag: "Cost Overrun",
    definition:
      "The probability and severity of project labor costs exceeding the approved budget cap.",
    mechanism:
      "Calculated from the delta between computed Actual Cost (Headcount × Weeks × Labor Rate) and Allocated Budget.",
    impact:
      "High budget risk signals fiscal insolvency or the need for emergency funding re-allocation.",
    guidance:
      "Control headcount or trim lower-priority scope items to align total labor cost with funding.",
    mathFormula: "Budget Risk = clamp((Actual Cost - Budget) / Budget × 100)",
  },
  staffingRisk: {
    title: "Staffing Headcount Drag",
    category: "Organizational Health",
    tag: "Brooks's Law Penalty",
    definition:
      "The efficiency loss caused by communication and synchronization friction as team size increases.",
    mechanism:
      "Brooks's Law dictates that communication channels grow quadratically. Effective headcount is reduced by communication drag.",
    impact:
      "A large team can produce less net work than a smaller, tightly aligned pod.",
    guidance:
      "Partition large teams into decoupled pods with clear service ownership boundaries.",
    mathFormula: "Staffing Risk = clamp((Drag Penalty / Headcount) × 100)",
  },
  teamSeniorityMixRisk: {
    title: "Team Seniority Risk",
    category: "Execution Quality",
    tag: "Mentorship Deficit",
    definition:
      "Risk of architectural dead-ends and delayed delivery due to insufficient senior engineering guidance.",
    mechanism:
      "Inversely driven by the fraction of senior engineers on the active team.",
    impact:
      "Contributes directly to composite risk when the Team Seniority constraint is enabled.",
    guidance:
      "Assign experienced tech leads to anchor architectural decisions.",
    mathFormula: "Risk = clamp((1 - Seniority Ratio) × 100)",
  },
  attritionRisk: {
    title: "Team Attrition Risk",
    category: "Team Stability",
    tag: "Turnover Drag",
    definition:
      "Risk of project derailment due to personnel departure and institutional knowledge loss.",
    mechanism:
      "Compounds expected turnover rate by 1.5x to reflect replacement hiring friction and ramp-up drag.",
    impact:
      "Elevates uncertainty in Monte Carlo simulations and increases delivery variability.",
    guidance:
      "Maintain thorough architecture decision records (ADRs) to minimize key-person dependencies.",
    mathFormula: "Risk = clamp(Attrition Rate × 100 × 1.5)",
  },
  teamFamiliarityRisk: {
    title: "Domain Familiarity Risk",
    category: "Execution Readiness",
    tag: "Stack Inexperience",
    definition:
      "Risk of underestimation and implementation rework caused by an unfamiliar tech stack.",
    mechanism:
      "Inversely proportional to the percentage of engineers already experienced with the codebase.",
    impact:
      "Reflects ramp-up lag during early development sprints.",
    guidance:
      "Pair inexperienced developers with domain specialists during initial milestone delivery.",
    mathFormula: "Risk = clamp((1 - Familiarity Ratio) × 100)",
  },
  dependencyRisk: {
    title: "External Dependency Risk",
    category: "External Exposure",
    tag: "Upstream Blocking",
    definition:
      "Risk of delays caused by third-party APIs, vendor tools, or partner team deliverables.",
    mechanism:
      "Exponentially saturates with the count of external blocking dependencies.",
    impact:
      "Increases schedule variance and reduces delivery predictability.",
    guidance:
      "Establish strict Service Level Agreements (SLAs) with external providers.",
    mathFormula: "Risk = clamp(100 × (1 - exp(-Dependencies / 5)))",
  },
  technicalDebtRisk: {
    title: "Technical Debt Risk",
    category: "Architecture Health",
    tag: "Systemic Friction",
    definition:
      "Risk of regressions, slow feature velocity, and fragile deployments caused by legacy code.",
    mechanism:
      "Linearly scaled from the Technical Debt constraint level.",
    impact:
      "Increases the likelihood of unplanned bug-fixing cycles late in the schedule.",
    guidance:
      "Invest in test coverage and refactor core bottlenecks before major feature rollouts.",
    mathFormula: "Risk = clamp((Severity / 10) × 100)",
  },
  scopeVolatilityRisk: {
    title: "Scope Volatility Risk",
    category: "Product Management",
    tag: "Requirement Churn",
    definition:
      "Risk of missing delivery dates due to expanding or constantly shifting requirements.",
    mechanism:
      "Evaluated via empirical convex NASA SWE-200 curve modeling requirement turbulence.",
    impact:
      "Even modest scope churn creates compounding schedule delays.",
    guidance:
      "Lock down milestone requirements and defer new features to subsequent releases.",
    mathFormula: "Piecewise convex trajectory: (0,0) -> (10,25) -> (20,55) -> (40,85)",
  },
  distributedTeamOverheadRisk: {
    title: "Multisite Coordination Risk",
    category: "Collaboration",
    tag: "Time Zone Asymmetry",
    definition:
      "Risk of communication friction and handoff delays across disparate geographic locations.",
    mechanism:
      "Scales with the number of office sites or asynchronous time zones.",
    impact:
      "Slows down PR reviews and cross-functional design decisions.",
    guidance:
      "Ensure sufficient core working hour overlap between teams.",
    mathFormula: "Risk = clamp(100 × (1 - 1 / Sites))",
  },
  vendorLeadTimeRisk: {
    title: "Vendor Lead Time Risk",
    category: "Procurement",
    tag: "Contractual Idle Time",
    definition:
      "Risk that delays in procuring third-party services block development momentum.",
    mechanism:
      "Exponential saturation curve based on required lead time in weeks.",
    impact:
      "Delays critical path progress during early milestone phases.",
    guidance:
      "Start security review and vendor onboarding well before sprint kickoff.",
    mathFormula: "Risk = clamp(100 × (1 - exp(-Weeks / 6)))",
  },
  regulatoryComplexityRisk: {
    title: "Regulatory Compliance Risk",
    category: "Compliance & Legal",
    tag: "Audit Scrutiny",
    definition:
      "Risk of audit failure, delayed compliance sign-off, or mandatory security fixes.",
    mechanism:
      "Direct linear scaling from the Regulatory Burden level.",
    impact:
      "Can completely block commercial release if compliance criteria are not satisfied.",
    guidance:
      "Incorporate compliance checklists into your Definition of Done.",
    mathFormula: "Risk = clamp((Complexity / 10) × 100)",
  },
  qualityRigorRisk: {
    title: "Quality & Testing Rigor Risk",
    category: "Quality Assurance",
    tag: "Verification Threshold",
    definition:
      "Risk that high quality bars extend testing windows or inadequate testing leads to escapes.",
    mechanism:
      "Dampened linear scaling representing verification overhead.",
    impact:
      "Influences the balance between speed of delivery and operational stability.",
    guidance:
      "Invest in automated regression suites to maintain high rigor without manual bottlenecks.",
    mathFormula: "Risk = clamp((Rigor / 10) × 100 × 0.8)",
  },
  stakeholderCountRisk: {
    title: "Stakeholder Alignment Risk",
    category: "Governance",
    tag: "Consensus Drag",
    definition:
      "Risk of decision paralysis and conflicting executive direction across multiple review bodies.",
    mechanism:
      "Exponential saturation curve modeling the difficulty of achieving multi-party consensus.",
    impact:
      "Creates mid-project pivot risks and delayed milestone sign-offs.",
    guidance:
      "Limit direct decision approvers to a designated project steering committee.",
    mathFormula: "Risk = clamp(100 × (1 - exp(-Stakeholders / 8)))",
  },
};

export function ExplanationModal({
  isOpen,
  onClose,
  topicKey,
  topicType,
}: ExplanationModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !topicKey) return null;

  const data: TopicDetail =
    topicType === "constraint"
      ? CONSTRAINT_EXPLANATIONS[topicKey] || {
          title: topicKey,
          category: "Scenario Constraint",
          tag: "Input Lever",
          definition: "An operational constraint influencing the project simulation model.",
          mechanism: "Kairos evaluates this parameter alongside active constraints in deterministic simulations.",
          impact: "Contributes to composite risk scoring and delivery schedule calculations.",
          guidance: "Adjust according to your project requirements.",
        }
      : RISK_EXPLANATIONS[topicKey] || {
          title: topicKey,
          category: "Evaluated Risk Dimension",
          tag: "Risk Output",
          definition: "An evaluated risk dimension contributing to the composite scenario risk score.",
          mechanism: "Derived from active constraint settings and normalized across evaluated dimensions.",
          impact: "Feasibility requires composite risk to remain below the 50.0 threshold.",
          guidance: "Examine baseline parameters to identify optimization levers.",
        };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#faf8f4] border border-[#221f1b]/20 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 text-[#221f1b]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#221f1b]/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#2c4356]/10 text-[#2c4356] border border-[#2c4356]/20">
                {data.category}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#ede9e0] text-[#221f1b]/70">
                {data.tag}
              </span>
            </div>
            <h2 className="font-serif text-xl font-bold tracking-tight text-[#221f1b] pt-1">
              {data.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#221f1b]/60 hover:text-[#221f1b] hover:bg-[#ede9e0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 text-xs font-sans leading-relaxed">
          {/* Section 1: Definition */}
          <div className="p-3 rounded-xl bg-white/80 border border-[#221f1b]/10 space-y-1 shadow-2xs">
            <div className="text-[11px] font-bold text-[#2c4356] flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Real-World Meaning</span>
            </div>
            <p className="text-[#221f1b]/80">{data.definition}</p>
          </div>

          {/* Section 2: Mechanism & Math */}
          <div className="p-3 rounded-xl bg-white/80 border border-[#221f1b]/10 space-y-1.5 shadow-2xs">
            <div className="text-[11px] font-bold text-[#2c4356] flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>How Kairos Simulates This</span>
            </div>
            <p className="text-[#221f1b]/80">{data.mechanism}</p>
            {data.mathFormula && (
              <div className="p-2 rounded-lg bg-[#ede9e0]/80 font-mono text-[10.5px] text-[#2c4356] border border-[#221f1b]/10">
                {data.mathFormula}
              </div>
            )}
          </div>

          {/* Section 3: Impact on Risk & Feasibility */}
          <div className="p-3 rounded-xl bg-white/80 border border-[#221f1b]/10 space-y-1 shadow-2xs">
            <div className="text-[11px] font-bold text-[#b5502f] flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Impact on Scenario Feasibility</span>
            </div>
            <p className="text-[#221f1b]/80">{data.impact}</p>
          </div>

          {/* Section 4: Best Practice Guidance */}
          <div className="p-3 rounded-xl bg-[#8ba888]/10 border border-[#8ba888]/30 space-y-1 shadow-2xs">
            <div className="text-[11px] font-bold text-[#2b5336] flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Engineering Recommendation</span>
            </div>
            <p className="text-[#2b5336]/90">{data.guidance}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#221f1b]/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#2c4356] hover:bg-[#1d2e3b] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
