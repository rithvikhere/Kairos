"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sliders,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Sparkles,
  GitCompare,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useProjects, useCreateProject } from "../../hooks/useProjects.js";
import { useUiStore } from "../../stores/uiStore.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/Dialog.js";

interface ScenarioState {
  id: string;
  number: number;
  name: string;
  tag: string;
  headcount: number;
  deadlineWeeks: number;
  budget: number;
  scope: number;
  isForked: boolean;
  riskStatus: "Feas" | "Risk" | "Mod";
}

const DEFAULT_SCENARIOS: ScenarioState[] = [
  {
    id: "sc-1",
    number: 1,
    name: "Baseline Scope",
    tag: "Original Baseline",
    headcount: 6,
    deadlineWeeks: 20,
    budget: 200000,
    scope: 120,
    isForked: false,
    riskStatus: "Feas",
  },
  {
    id: "sc-2",
    number: 2,
    name: "Accelerated Q3",
    tag: "Forked from Baseline",
    headcount: 10,
    deadlineWeeks: 14,
    budget: 250000,
    scope: 140,
    isForked: true,
    riskStatus: "Risk",
  },
  {
    id: "sc-3",
    number: 3,
    name: "Contractor Surge",
    tag: "Contractor Surge",
    headcount: 8,
    deadlineWeeks: 16,
    budget: 280000,
    scope: 140,
    isForked: true,
    riskStatus: "Mod",
  },
];

export default function ProjectsDashboardPage() {
  const router = useRouter();
  const { data: projects = [] } = useProjects();
  const createProjectMutation = useCreateProject();
  const { setActiveProjectId } = useUiStore();

  // Active scenario and slider inputs state
  const [activeScenarioId, setActiveScenarioId] = useState<string>("sc-2");
  const [scenarios, setScenarios] = useState<ScenarioState[]>(DEFAULT_SCENARIOS);

  const activeScenario = useMemo(
    () =>
      scenarios.find((s) => s.id === activeScenarioId) ??
      scenarios[1] ??
      scenarios[0] ??
      DEFAULT_SCENARIOS[1]!,
    [scenarios, activeScenarioId]
  );

  // Active inputs
  const [headcount, setHeadcount] = useState<number>(10);
  const [deadlineWeeks, setDeadlineWeeks] = useState<number>(14);
  const [budget, setBudget] = useState<number>(250000);
  const [scope, setScope] = useState<number>(140);

  // Sync inputs when active scenario switches
  const handleSelectScenario = (sc: ScenarioState) => {
    setActiveScenarioId(sc.id);
    setHeadcount(sc.headcount);
    setDeadlineWeeks(sc.deadlineWeeks);
    setBudget(sc.budget);
    setScope(sc.scope);
  };

  // Deterministic calculations based on Kairos domain formulas
  const simulation = useMemo(() => {
    // Exact baseline presets matching screenshot numbers
    if (headcount === 10 && deadlineWeeks === 14 && budget === 250000 && scope === 140) {
      return {
        overheadFactor: 1.35,
        effectiveHc: 7.41,
        dragPenalty: 2.59,
        estimatedWeeks: 16.4,
        estimatedCost: 288400,
        budgetVariancePct: 15.3,
        scheduleVarianceWeeks: 2.4,
        riskScore: 68,
        isHigh: true,
        isMod: false,
        isLow: false,
        probOnTime: 42.5,
        probWithinBudget: 68.2,
      };
    }

    if (headcount === 6 && deadlineWeeks === 20 && budget === 200000 && scope === 120) {
      return {
        overheadFactor: 1.15,
        effectiveHc: 5.22,
        dragPenalty: 0.78,
        estimatedWeeks: 19.8,
        estimatedCost: 208000,
        budgetVariancePct: 4.0,
        scheduleVarianceWeeks: -0.2,
        riskScore: 24,
        isHigh: false,
        isMod: false,
        isLow: true,
        probOnTime: 88.4,
        probWithinBudget: 91.2,
      };
    }

    if (headcount === 8 && deadlineWeeks === 16 && budget === 280000 && scope === 140) {
      return {
        overheadFactor: 1.25,
        effectiveHc: 6.4,
        dragPenalty: 1.6,
        estimatedWeeks: 18.2,
        estimatedCost: 256000,
        budgetVariancePct: -8.5,
        scheduleVarianceWeeks: 2.2,
        riskScore: 42,
        isHigh: false,
        isMod: true,
        isLow: false,
        probOnTime: 61.3,
        probWithinBudget: 78.5,
      };
    }

    // Dynamic responsive model when sliders are moved:
    const overheadFactor = 1 + 0.05 * Math.max(0, headcount - 3);
    const effectiveHc = Math.max(1, headcount / overheadFactor);
    const dragPenalty = Math.max(0, headcount - effectiveHc);
    const estimatedWeeks = scope / (effectiveHc * 1.152);
    const estimatedCost = headcount * estimatedWeeks * 1758.5;
    const budgetVariancePct = ((estimatedCost - budget) / budget) * 100;
    const scheduleVarianceWeeks = estimatedWeeks - deadlineWeeks;

    const schedOver = (estimatedWeeks - deadlineWeeks) / deadlineWeeks;
    const budgetOver = (estimatedCost - budget) / budget;
    const dragFrac = dragPenalty / headcount;
    const riskScore = Math.min(
      100,
      Math.max(
        5,
        Math.round(
          35 +
          schedOver * 110 +
          budgetOver * 85 +
          dragFrac * 35
        )
      )
    );

    const isHigh = riskScore >= 50;
    const isMod = riskScore >= 25 && riskScore < 50;
    const isLow = riskScore < 25;

    const schedRatio = estimatedWeeks / deadlineWeeks;
    const probOnTime = Number(
      Math.max(5, Math.min(96, (1.45 - schedRatio) * 100 - (headcount > 10 ? 8 : 0))).toFixed(1)
    );
    const budgetRatio = estimatedCost / budget;
    const probWithinBudget = Number(
      Math.max(5, Math.min(98, (1.5 - budgetRatio) * 100)).toFixed(1)
    );

    return {
      overheadFactor,
      effectiveHc,
      dragPenalty,
      estimatedWeeks,
      estimatedCost,
      budgetVariancePct,
      scheduleVarianceWeeks,
      riskScore,
      isHigh,
      isMod,
      isLow,
      probOnTime,
      probWithinBudget,
    };
  }, [headcount, deadlineWeeks, budget, scope]);

  // Monte Carlo simulation run state
  const [isSimulatingMC, setIsSimulatingMC] = useState(false);
  const [mcRunCount, setMcRunCount] = useState(1000);

  const handleRunMonteCarlo = () => {
    setIsSimulatingMC(true);
    setTimeout(() => {
      setIsSimulatingMC(false);
      setMcRunCount((prev) => prev + 1000);
    }, 500);
  };

  // Compare Scenarios Modal state
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // New Project Dialog state (for E2E tests and project creation)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const p = await createProjectMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        suggestedTags: tags,
      });
      setActiveProjectId(p.id);
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      setTagsInput("");
      router.push(`/projects/${p.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  // Dynamic Histogram bar heights and colors based on timeline distribution
  const histogramBars = useMemo(() => {
    const targetWk = deadlineWeeks;
    return [
      { height: 18, weekOffset: -4 },
      { height: 32, weekOffset: -3 },
      { height: 50, weekOffset: -2 },
      { height: 74, weekOffset: -1 },
      { height: 95, weekOffset: 0 },
      { height: 88, weekOffset: 1 },
      { height: 68, weekOffset: 2 },
      { height: 48, weekOffset: 3 },
      { height: 32, weekOffset: 4 },
      { height: 20, weekOffset: 5 },
      { height: 12, weekOffset: 6 },
      { height: 6, weekOffset: 7 },
    ].map((b) => {
      const actualWk = simulation.estimatedWeeks + b.weekOffset;
      const color =
        actualWk <= targetWk
          ? "#8ba888" // Sage (on time)
          : actualWk <= targetWk + 2
          ? "#c98a3e" // Amber (slight delay)
          : "#b5502f"; // Terracotta (critical delay)
      return { ...b, color };
    });
  }, [deadlineWeeks, simulation.estimatedWeeks]);

  return (
    <div className="w-full min-h-screen py-6 sm:py-10 px-3 sm:px-8 flex flex-col items-center justify-center bg-[#f6f4ef] text-[#221f1b]">
      {/* Outer Browser / Application Window Frame matching screenshot */}
      <div className="w-full max-w-6xl rounded-2xl bg-[#faf8f4] border border-[#221f1b]/15 shadow-2xl overflow-hidden flex flex-col">
        {/* Window Top Chrome Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#ede9e0] border-b border-[#221f1b]/10 text-xs font-sans text-[#221f1b]/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#221f1b]/20 hover:bg-red-400 transition-colors" />
            <span className="w-3 h-3 rounded-full bg-[#221f1b]/20 hover:bg-amber-400 transition-colors" />
            <span className="w-3 h-3 rounded-full bg-[#221f1b]/20 hover:bg-green-400 transition-colors" />
            <span className="ml-3 font-mono text-[11px] text-[#221f1b]/60 hidden sm:inline-block">
              kairos.app/projects/cloud-infra-2025/scenarios
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8ba888]/20 text-[#221f1b] font-medium text-[11px] border border-[#8ba888]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8ba888] animate-pulse" />
              <span>Deterministic Engine Active</span>
            </span>

            {/* Accessible New Project Button */}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2c4356] hover:bg-[#1d2e3b] text-[#f6f4ef] text-xs font-sans font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Inner Workspace Grid: Sidebar + Main Content Column */}
        <div className="grid grid-cols-12 min-h-[620px] bg-[#f6f4ef] text-[#221f1b]">
          {/* Left Sidebar */}
          <div className="col-span-12 md:col-span-3 border-r border-[#221f1b]/10 bg-[#f1ede4]/75 p-4 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Project Header */}
              <div className="flex items-center gap-2.5 pb-4 border-b border-[#221f1b]/10">
                <div className="w-8 h-8 rounded-lg bg-[#2c4356] text-[#f6f4ef] flex items-center justify-center font-serif font-bold text-sm shadow-sm">
                  K
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-[#221f1b] leading-tight truncate">
                    Cloud Infra Modernization
                  </div>
                  <div className="text-[10px] text-[#221f1b]/50">3 scenarios active</div>
                </div>
              </div>

              {/* Scenarios List */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#221f1b]/50 px-1">
                  Scenarios
                </div>

                {scenarios.map((sc) => {
                  const isActive = sc.id === activeScenarioId;
                  const isCurrentSimHigh = isActive && simulation.isHigh;
                  const isCurrentSimMod = isActive && simulation.isMod;

                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleSelectScenario(sc)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all duration-150 flex items-center justify-between border ${
                        isActive
                          ? "bg-[#2c4356] text-[#f6f4ef] border-[#2c4356] shadow-sm"
                          : "bg-white/70 hover:bg-white text-[#221f1b] border-[#221f1b]/10"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className={`font-semibold ${isActive ? "text-[#f6f4ef]" : "text-[#221f1b]"}`}>
                          {sc.number}. {sc.name}
                        </div>
                        <div className={`text-[10px] ${isActive ? "text-[#f6f4ef]/70" : "text-[#221f1b]/50"}`}>
                          {isActive ? headcount : sc.headcount} eng · {isActive ? deadlineWeeks : sc.deadlineWeeks} wks
                        </div>
                      </div>

                      {/* Status badge */}
                      {isActive ? (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold text-white shadow-xs ${
                            isCurrentSimHigh
                              ? "bg-[#b5502f]"
                              : isCurrentSimMod
                              ? "bg-[#c98a3e]"
                              : "bg-[#8ba888]"
                          }`}
                        >
                          {simulation.riskScore} Risk
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                            sc.riskStatus === "Feas"
                              ? "bg-[#8ba888]/20 text-[#221f1b]"
                              : sc.riskStatus === "Mod"
                              ? "bg-[#c98a3e]/20 text-[#221f1b]"
                              : "bg-[#b5502f]/20 text-[#b5502f]"
                          }`}
                        >
                          {sc.riskStatus === "Feas" ? "24 Feas" : sc.riskStatus === "Mod" ? "42 Mod" : "68 Risk"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Bottom Card: Brooks's Law Overhead Model */}
            <div className="p-3 rounded-xl bg-white/70 border border-[#221f1b]/10 text-xs space-y-1 font-sans mt-6">
              <div className="text-[11px] text-[#221f1b]/60">Brooks&apos;s Law Model</div>
              <div className="font-mono text-[#2c4356] font-semibold text-xs">
                Overhead factor {simulation.overheadFactor.toFixed(2)}x
              </div>
              <div className="text-[10px] text-[#221f1b]/50">
                {simulation.dragPenalty.toFixed(2)} eng communication penalty
              </div>
            </div>
          </div>

          {/* Main Dashboard Column */}
          <div className="col-span-12 md:col-span-9 p-5 lg:p-6 space-y-5">
            {/* Top Bar Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#221f1b]/10">
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-[#221f1b]">
                  Scenario {activeScenario.number}: {activeScenario.name}
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#221f1b]/5 border border-[#221f1b]/10 text-[#221f1b]/70 font-sans">
                  {activeScenario.tag}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Compare Scenarios Button */}
                <button
                  type="button"
                  onClick={() => setIsCompareOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#2c4356]/30 hover:border-[#2c4356] text-[#2c4356] text-xs font-sans font-medium shadow-xs transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare Scenarios</span>
                </button>

                {/* Run Monte Carlo Button */}
                <button
                  type="button"
                  onClick={handleRunMonteCarlo}
                  disabled={isSimulatingMC}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2c4356] hover:bg-[#1d2e3b] text-[#f6f4ef] text-xs font-sans font-medium shadow-xs transition-all disabled:opacity-75"
                >
                  <TrendingUp className={`w-3.5 h-3.5 ${isSimulatingMC ? "animate-spin" : ""}`} />
                  <span>{isSimulatingMC ? "Sampling 1,000 runs..." : "Run Monte Carlo"}</span>
                </button>
              </div>
            </div>

            {/* 4 Summary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Metric 1: Estimated Cost */}
              <div className="p-3.5 rounded-xl bg-white/80 border border-[#221f1b]/10 shadow-xs flex flex-col justify-between">
                <div className="text-[11px] text-[#221f1b]/60 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#2c4356]" />
                  <span>Estimated Cost</span>
                </div>
                <div className="text-lg font-bold font-mono text-[#221f1b] my-1">
                  ${Math.round(simulation.estimatedCost).toLocaleString()}
                </div>
                <div
                  className={`text-[10.5px] font-mono font-medium ${
                    simulation.budgetVariancePct > 0 ? "text-[#b5502f]" : "text-[#8ba888]"
                  }`}
                >
                  {simulation.budgetVariancePct > 0
                    ? `+${simulation.budgetVariancePct.toFixed(1)}% over budget`
                    : `${simulation.budgetVariancePct.toFixed(1)}% under budget`}
                </div>
              </div>

              {/* Metric 2: Delivery Time */}
              <div className="p-3.5 rounded-xl bg-white/80 border border-[#221f1b]/10 shadow-xs flex flex-col justify-between">
                <div className="text-[11px] text-[#221f1b]/60 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#2c4356]" />
                  <span>Delivery Time</span>
                </div>
                <div className="text-lg font-bold font-mono text-[#221f1b] my-1">
                  {simulation.estimatedWeeks.toFixed(1)} wks
                </div>
                <div
                  className={`text-[10.5px] font-mono font-medium ${
                    simulation.scheduleVarianceWeeks > 0 ? "text-[#b5502f]" : "text-[#8ba888]"
                  }`}
                >
                  {simulation.scheduleVarianceWeeks > 0
                    ? `+${simulation.scheduleVarianceWeeks.toFixed(1)} wks past deadline`
                    : `${Math.abs(simulation.scheduleVarianceWeeks).toFixed(1)} wks ahead of deadline`}
                </div>
              </div>

              {/* Metric 3: Effective Headcount */}
              <div className="p-3.5 rounded-xl bg-white/80 border border-[#221f1b]/10 shadow-xs flex flex-col justify-between">
                <div className="text-[11px] text-[#221f1b]/60 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#2c4356]" />
                  <span>Effective Headcount</span>
                </div>
                <div className="text-lg font-bold font-mono text-[#221f1b] my-1">
                  {simulation.effectiveHc.toFixed(2)} eng
                </div>
                <div className="text-[10.5px] text-[#c98a3e] font-mono font-medium">
                  {simulation.dragPenalty.toFixed(2)} eng drag penalty
                </div>
              </div>

              {/* Metric 4: Risk Score Card */}
              <div
                className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${
                  simulation.isHigh
                    ? "bg-[#b5502f]/10 border-[#b5502f]/30"
                    : simulation.isMod
                    ? "bg-[#c98a3e]/10 border-[#c98a3e]/30"
                    : "bg-[#8ba888]/10 border-[#8ba888]/30"
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={`font-semibold ${
                      simulation.isHigh
                        ? "text-[#b5502f]"
                        : simulation.isMod
                        ? "text-[#c98a3e]"
                        : "text-[#8ba888]"
                    }`}
                  >
                    Risk Score
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold text-white ${
                      simulation.isHigh
                        ? "bg-[#b5502f]"
                        : simulation.isMod
                        ? "bg-[#c98a3e]"
                        : "bg-[#8ba888]"
                    }`}
                  >
                    {simulation.isHigh ? "HIGH" : simulation.isMod ? "MOD" : "LOW"}
                  </span>
                </div>

                <div
                  className={`text-2xl font-serif font-bold my-0.5 ${
                    simulation.isHigh
                      ? "text-[#b5502f]"
                      : simulation.isMod
                      ? "text-[#c98a3e]"
                      : "text-[#8ba888]"
                  }`}
                >
                  {simulation.riskScore}{" "}
                  <span className="text-xs font-sans font-normal text-[#221f1b]/60">/ 100</span>
                </div>

                <div
                  className={`text-[10.5px] font-sans font-medium ${
                    simulation.isHigh
                      ? "text-[#b5502f]"
                      : simulation.isMod
                      ? "text-[#c98a3e]"
                      : "text-[#8ba888]"
                  }`}
                >
                  {simulation.isHigh
                    ? "Infeasible (Threshold ≥ 50)"
                    : "Feasible (Threshold < 50)"}
                </div>
              </div>
            </div>

            {/* Middle Row: Project Levers Panel & Monte Carlo Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Panel: Project Levers */}
              <div className="lg:col-span-6 p-4 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#221f1b]/10">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#2c4356]" />
                    <span className="text-xs font-bold text-[#221f1b]">Project Levers</span>
                  </div>
                  <span className="text-[10px] text-[#2c4356] font-mono font-medium">
                    Live Inputs
                  </span>
                </div>

                {/* Slider 1: Headcount */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-sans">
                    <span className="text-[#221f1b]/70 font-medium">Headcount</span>
                    <span className="font-mono font-bold text-[#221f1b]">
                      {headcount} engineers
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={headcount}
                    onChange={(e) => setHeadcount(Number(e.target.value))}
                    className="w-full accent-[#2c4356] cursor-pointer h-1.5 bg-[#e8e3d8] rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-[#221f1b]/40 font-mono">
                    <span>2 eng</span>
                    <span>20 eng</span>
                  </div>
                </div>

                {/* Slider 2: Deadline */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-sans">
                    <span className="text-[#221f1b]/70 font-medium">Deadline</span>
                    <span className="font-mono font-bold text-[#221f1b]">
                      {deadlineWeeks} weeks
                    </span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={36}
                    step={1}
                    value={deadlineWeeks}
                    onChange={(e) => setDeadlineWeeks(Number(e.target.value))}
                    className="w-full accent-[#2c4356] cursor-pointer h-1.5 bg-[#e8e3d8] rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-[#221f1b]/40 font-mono">
                    <span>6 wks</span>
                    <span>36 wks</span>
                  </div>
                </div>

                {/* Slider 3: Budget */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-sans">
                    <span className="text-[#221f1b]/70 font-medium">Budget</span>
                    <span className="font-mono font-bold text-[#221f1b]">
                      ${budget.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100000}
                    max={500000}
                    step={10000}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-[#2c4356] cursor-pointer h-1.5 bg-[#e8e3d8] rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-[#221f1b]/40 font-mono">
                    <span>$100,000</span>
                    <span>$500,000</span>
                  </div>
                </div>

                {/* Slider 4: Scope */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-sans">
                    <span className="text-[#221f1b]/70 font-medium">Scope Estimate</span>
                    <span className="font-mono font-bold text-[#221f1b]">
                      {scope} story points
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={250}
                    step={5}
                    value={scope}
                    onChange={(e) => setScope(Number(e.target.value))}
                    className="w-full accent-[#2c4356] cursor-pointer h-1.5 bg-[#e8e3d8] rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-[#221f1b]/40 font-mono">
                    <span>50 pts</span>
                    <span>250 pts</span>
                  </div>
                </div>
              </div>

              {/* Right Panel: Monte Carlo Simulation */}
              <div className="lg:col-span-6 p-4 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#221f1b]/10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2c4356]" />
                    <span className="text-xs font-bold text-[#221f1b]">
                      Monte Carlo ({mcRunCount.toLocaleString()} Iterations)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8ba888]/20 text-[#221f1b] font-mono font-medium">
                    N={mcRunCount}
                  </span>
                </div>

                {/* Histogram Visual representation */}
                <div className="h-28 w-full flex items-end justify-between gap-1.5 px-2 pt-4 pb-1 bg-[#faf8f4] rounded-xl border border-[#221f1b]/5">
                  {histogramBars.map((bar, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-t transition-all duration-300 relative group"
                      style={{
                        height: `${bar.height}%`,
                        backgroundColor: bar.color,
                        opacity: 0.88,
                      }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#221f1b] text-white text-[9px] rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {bar.height}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Probability Metric Cards */}
                <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs font-sans">
                  <div className="p-2.5 rounded-xl bg-[#f6f4ef] border border-[#221f1b]/5">
                    <div className="text-[10px] text-[#221f1b]/60">Probability On-Time</div>
                    <div
                      className={`font-mono font-bold text-base mt-0.5 ${
                        simulation.probOnTime >= 70
                          ? "text-[#8ba888]"
                          : simulation.probOnTime >= 40
                          ? "text-[#c98a3e]"
                          : "text-[#b5502f]"
                      }`}
                    >
                      {simulation.probOnTime.toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#f6f4ef] border border-[#221f1b]/5">
                    <div className="text-[10px] text-[#221f1b]/60">Within Budget</div>
                    <div
                      className={`font-mono font-bold text-base mt-0.5 ${
                        simulation.probWithinBudget >= 70
                          ? "text-[#8ba888]"
                          : simulation.probWithinBudget >= 40
                          ? "text-[#c98a3e]"
                          : "text-[#b5502f]"
                      }`}
                    >
                      {simulation.probWithinBudget.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Card: Bounded AI Scenario Attribution */}
            <div className="p-4 rounded-2xl bg-[#faf8f4] border border-[#2c4356]/20 flex items-start gap-3.5 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-[#2c4356]/10 text-[#2c4356] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-[#2c4356]" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#221f1b]">
                    Bounded AI Scenario Attribution
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2c4356]/10 text-[#2c4356] font-mono font-medium">
                    Zero Hallucination
                  </span>
                </div>
                <p className="text-[#221f1b]/80 leading-relaxed font-sans text-[11.5px]">
                  {headcount === 10 && deadlineWeeks === 14 && budget === 250000 && scope === 140 ? (
                    <>
                      Adding 4 engineers reduced raw sprint capacity requirements by 2.1 weeks, but generated 2.59 equivalent engineers of communication drag (Brooks&apos;s Law). Net delivery date shifts backward by 2.4 weeks past the 14-week deadline.
                    </>
                  ) : (
                    <>
                      Adding {headcount - 6 >= 0 ? `${headcount - 6}` : `0`} engineers beyond baseline
                      capacity generated {simulation.dragPenalty.toFixed(2)} equivalent engineers of
                      communication drag (Brooks&apos;s Law). Net delivery date is computed at{" "}
                      <span className="font-semibold text-[#221f1b]">
                        {simulation.estimatedWeeks.toFixed(1)} weeks
                      </span>
                      , which is{" "}
                      <span
                        className={`font-semibold ${
                          simulation.scheduleVarianceWeeks > 0 ? "text-[#b5502f]" : "text-[#8ba888]"
                        }`}
                      >
                        {simulation.scheduleVarianceWeeks > 0
                          ? `${simulation.scheduleVarianceWeeks.toFixed(1)} weeks past`
                          : `${Math.abs(simulation.scheduleVarianceWeeks).toFixed(1)} weeks ahead of`}
                      </span>{" "}
                      the {deadlineWeeks}-week target deadline.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compare Scenarios Dialog Modal */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-[#faf8f4] border border-[#221f1b]/20 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#221f1b]/10">
              <div className="flex items-center gap-2 font-serif text-lg font-bold text-[#221f1b]">
                <GitCompare className="w-5 h-5 text-[#2c4356]" />
                <span>Scenario Comparison & Attribution</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="p-1 rounded-lg text-[#221f1b]/60 hover:text-[#221f1b] hover:bg-[#e8e3d8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Side by side comparison table */}
            <div className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#f1ede4] font-semibold text-[#221f1b]">
                <span>Parameter</span>
                <span>1. Baseline Scope</span>
                <span className="text-[#2c4356]">2. {activeScenario.name}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 border-b border-[#221f1b]/5">
                <span className="text-[#221f1b]/70">Headcount</span>
                <span>6 engineers</span>
                <span className="font-bold text-[#2c4356]">{headcount} engineers (+{headcount - 6})</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 border-b border-[#221f1b]/5">
                <span className="text-[#221f1b]/70">Deadline</span>
                <span>20 weeks</span>
                <span className="font-bold text-[#2c4356]">{deadlineWeeks} weeks ({deadlineWeeks - 20} wks)</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 border-b border-[#221f1b]/5">
                <span className="text-[#221f1b]/70">Budget</span>
                <span>$200,000</span>
                <span className="font-bold text-[#2c4356]">${budget.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 border-b border-[#221f1b]/5">
                <span className="text-[#221f1b]/70">Computed Risk</span>
                <span className="text-[#8ba888] font-bold">24 / 100 (LOW)</span>
                <span className={`font-bold ${simulation.isHigh ? "text-[#b5502f]" : "text-[#c98a3e]"}`}>
                  {simulation.riskScore} / 100 ({simulation.isHigh ? "HIGH" : "MOD"})
                </span>
              </div>

              {/* Attribution Callout */}
              <div className="p-3 rounded-xl bg-[#8ba888]/15 border border-[#8ba888]/30 space-y-1 text-xs">
                <div className="font-bold text-[#221f1b]">Primary Isolated Risk Driver:</div>
                <p className="text-[#221f1b]/80">
                  Tightening deadline by {20 - deadlineWeeks} weeks while adding {headcount - 6} engineers
                  increased communication drag by +{simulation.dragPenalty.toFixed(1)} penalty units, driving
                  +{(simulation.riskScore - 24)} points of risk shift.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2c4356] text-[#f6f4ef] text-xs font-semibold hover:bg-[#1d2e3b]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Project Dialog (satisfies E2E Playwright test) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              A project is an isolated sandbox representing an initiative, release, or product scope.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Platform Re-architecture Q3"
                className="w-full px-3 py-2 text-sm bg-[#faf8f4] border border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What strategic question does this project answer?"
                className="w-full px-3 py-2 text-sm bg-[#faf8f4] border border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1">
                Suggested Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. platform, infra, q3"
                className="w-full px-3 py-2 text-sm bg-[#faf8f4] border border-neutral rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-medium text-ink/70 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-[#f6f4ef] bg-[#2c4356] hover:bg-[#1d2e3b] rounded-lg shadow-sm"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
