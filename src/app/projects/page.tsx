"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Play,
  TrendingUp,
  Sliders,
  GitCompare,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  Layers,
  ArrowRight,
  Trash2,
  Tag,
  Star,
  Archive,
  Search,
  ChevronDown,
  Check,
  Edit3,
  Bot,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  useProjects,
  useCreateProject,
  useUpdateProjectTags,
  useDeleteProject,
} from "../../hooks/useProjects.js";
import {
  useScenarios,
  useCreateScenario,
  useDeleteScenario,
  useToggleFavorite,
  useSetArchived,
} from "../../hooks/useScenarios.js";
import { useUiStore } from "../../stores/uiStore.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/Dialog.js";
import {
  ConstraintCatalogueModal,
  CONSTRAINT_CATALOGUE,
} from "../../components/scenario/ConstraintCatalogueModal.js";
import { ConstraintSummaryStrip } from "../../components/scenario/ConstraintSummaryStrip.js";
import { RiskCompositionBarChart } from "../../components/scenario/RiskCompositionBarChart.js";
import { SensitivityTornadoChart } from "../../components/scenario/SensitivityTornadoChart.js";
import { MonteCarloConvergenceChart } from "../../components/scenario/MonteCarloConvergenceChart.js";
import { TrialScatterPlot } from "../../components/scenario/TrialScatterPlot.js";
import { IterationProgressIndicator } from "../../components/scenario/IterationProgressIndicator.js";
import { ExplanationModal } from "../../components/scenario/ExplanationModal.js";
import { simulate } from "../../domain/simulation.js";
import { runMonteCarloSimulation, type MonteCarloResult } from "../../domain/monteCarlo.js";
import { diffScenarios } from "../../domain/diff.js";
import type {
  ConstraintKey,
  ConstraintSetting,
  ScenarioInputs,
  SimulationResult,
} from "../../domain/types.js";

function createDefaultConstraints(
  hc: number = 10,
  dl: number = 14,
  bg: number = 250000,
  sc: number = 140
): Partial<Record<ConstraintKey, ConstraintSetting>> {
  return {
    scope: { enabled: true, value: sc },
    headcount: { enabled: true, value: hc },
    deadlineWeeks: { enabled: true, value: dl },
    budget: { enabled: true, value: bg },
    teamSeniorityMix: { enabled: false, value: 0.4 },
    attritionRisk: { enabled: false, value: 0.15 },
    teamFamiliarity: { enabled: false, value: 0.6 },
    externalDependencyCount: { enabled: false, value: 3 },
    vendorLeadTimeWeeks: { enabled: false, value: 2 },
    regulatoryComplexity: { enabled: false, value: 4 },
    technicalDebtLevel: { enabled: false, value: 3 },
    scopeVolatility: { enabled: false, value: 15 },
    distributedTeamOverhead: { enabled: false, value: 1 },
    qualityRigor: { enabled: false, value: 6 },
    stakeholderCount: { enabled: false, value: 4 },
  };
}

function buildUncertainInputs(
  constraints: Partial<Record<ConstraintKey, ConstraintSetting>>
): any {
  const result: any = { constraints: {} };
  for (const [key, setting] of Object.entries(constraints)) {
    if (!setting) continue;
    if (setting.enabled) {
      const val = setting.value;
      let stddev = Math.max(0.1, val * 0.08);
      if (key === "scope") stddev = Math.max(2, val * 0.12);
      if (key === "headcount") stddev = Math.max(0.4, val * 0.07);
      if (key === "budget") stddev = Math.max(2500, val * 0.06);
      if (key === "deadlineWeeks") stddev = Math.max(0.5, val * 0.05);

      result.constraints[key] = {
        enabled: true,
        value: { kind: "normal", mean: val, stddev },
      };
    } else {
      result.constraints[key] = { enabled: false, value: setting.value };
    }
  }
  return result;
}

function formatDiffValue(key: string, val: number | undefined): string {
  if (val === undefined || isNaN(val)) return "—";
  if (key === "budget") return `$${Math.round(val).toLocaleString("en-US")}`;
  if (key === "headcount") return `${val} eng`;
  if (key === "deadlineWeeks") return `${val} wks`;
  if (key === "scope") return `${val} pts`;
  if (key.includes("Rate") || key.includes("Mix") || key.includes("Familiarity")) {
    return Number(val).toFixed(2);
  }
  return String(val);
}

interface ScenarioState {
  id: string;
  number: number;
  name: string;
  tag: string;
  headcount: number;
  deadlineWeeks: number;
  budget: number;
  scope: number;
  constraints?: Partial<Record<ConstraintKey, ConstraintSetting>>;
  isForked: boolean;
  riskStatus: "Feas" | "Risk" | "Mod";
  isFavorite: boolean;
  isArchived: boolean;
  description?: string | null;
}

const DEFAULT_PROJECT = {
  id: "default",
  name: "Cloud Infra Modernization",
  description: "Strategic infrastructure migration & microservices capacity modeling",
  suggested_tags: ["infra", "cloud", "q3"],
};

const DEFAULT_SCENARIOS: ScenarioState[] = [];

function toNumeric(val: number | any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  if (typeof val === "object") {
    if ("value" in val) return Number(val.value);
    if ("mean" in val) return Number(val.mean);
    if ("mode" in val) return Number(val.mode);
    if ("min" in val && "max" in val) return (Number(val.min) + Number(val.max)) / 2;
  }
  return Number(val) || 0;
}

function calculateSimulation(
  headcount: number,
  deadlineWeeks: number,
  budget: number,
  scope: number
) {
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

  // Reactive simulation formula
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
      Math.round(35 + schedOver * 110 + budgetOver * 85 + dragFrac * 35)
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
}

function ProjectsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data fetching hooks
  const { data: dbProjects = [] } = useProjects();
  const createProjectMutation = useCreateProject();
  const updateProjectTagsMutation = useUpdateProjectTags();
  const deleteProjectMutation = useDeleteProject();

  const { setActiveProjectId } = useUiStore();

  // Unified projects list (built-in demo preset + DB projects)
  const allProjects = useMemo(() => {
    return [DEFAULT_PROJECT, ...(dbProjects || [])];
  }, [dbProjects]);

  // Active project selection
  const urlProjectId = searchParams ? searchParams.get("projectId") : null;
  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => urlProjectId || "default");

  // Keep active project synced with URL parameter if present
  useEffect(() => {
    if (urlProjectId && urlProjectId !== activeProjectId) {
      setActiveProjectIdState(urlProjectId);
      setActiveProjectId(urlProjectId);
    }
  }, [urlProjectId, activeProjectId, setActiveProjectId]);

  const activeProject = useMemo(() => {
    return allProjects.find((p) => p.id === activeProjectId) ?? DEFAULT_PROJECT;
  }, [allProjects, activeProjectId]);

  // DB scenarios query for selected project
  const isDbProject = activeProjectId !== "default";
  const { data: dbScenarios = [] } = useScenarios(isDbProject ? activeProjectId : undefined);
  const createScenarioMutation = useCreateScenario();
  const deleteScenarioMutation = useDeleteScenario();
  const toggleFavoriteMutation = useToggleFavorite();
  const setArchivedMutation = useSetArchived();

  // Local state for default project's scenarios - starts empty as blank page
  const [defaultScenariosState, setDefaultScenariosState] = useState<ScenarioState[]>([]);

  // Unified scenarios for active project
  const projectScenarios: ScenarioState[] = useMemo(() => {
    if (!isDbProject) {
      return defaultScenariosState;
    }
    if (dbScenarios && dbScenarios.length > 0) {
      return dbScenarios.map((s, idx) => {
        const rawInputs = s.inputs as any;
        const hc = toNumeric(rawInputs.headcount ?? rawInputs.constraints?.headcount?.value) || 8;
        const dl = toNumeric(rawInputs.deadlineWeeks ?? rawInputs.constraints?.deadlineWeeks?.value) || 16;
        const bg = toNumeric(rawInputs.budget ?? rawInputs.constraints?.budget?.value) || 250000;
        const sc = toNumeric(rawInputs.scope ?? rawInputs.constraints?.scope?.value) || 140;

        const constraints: Partial<Record<ConstraintKey, ConstraintSetting>> = {};
        if (s.inputs.constraints) {
          for (const [k, v] of Object.entries(s.inputs.constraints)) {
            if (v) {
              constraints[k as ConstraintKey] = {
                enabled: v.enabled,
                value: toNumeric(v.value),
              };
            }
          }
        } else {
          Object.assign(constraints, createDefaultConstraints(hc, dl, bg, sc));
        }

        let riskStatus: "Feas" | "Risk" | "Mod" = "Feas";
        try {
          const sim = simulate({ constraints });
          riskStatus = sim.riskScore >= 50 ? "Risk" : sim.riskScore >= 25 ? "Mod" : "Feas";
        } catch {
          const sim = calculateSimulation(hc, dl, bg, sc);
          riskStatus = sim.isHigh ? "Risk" : sim.isMod ? "Mod" : "Feas";
        }

        return {
          id: s.id,
          number: idx + 1,
          name: s.name,
          tag: s.parent_scenario_id ? "Forked Variant" : "Baseline Plan",
          headcount: hc,
          deadlineWeeks: dl,
          budget: bg,
          scope: sc,
          constraints,
          isForked: Boolean(s.parent_scenario_id),
          riskStatus,
          isFavorite: Boolean(s.is_favorite),
          isArchived: Boolean(s.is_archived),
          description: s.description,
        };
      });
    }
    return [];
  }, [isDbProject, defaultScenariosState, dbScenarios]);

  // Active scenario and slider inputs state
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const activeScenario = useMemo(() => {
    if (projectScenarios.length === 0) return null;
    return (
      projectScenarios.find((s) => s.id === activeScenarioId) ??
      projectScenarios[0] ??
      null
    );
  }, [projectScenarios, activeScenarioId]);

  // Active inputs
  const [headcount, setHeadcount] = useState<number>(10);
  const [deadlineWeeks, setDeadlineWeeks] = useState<number>(14);
  const [budget, setBudget] = useState<number>(250000);
  const [scope, setScope] = useState<number>(140);

  // 15 Uniform Constraints state
  const [scenarioConstraints, setScenarioConstraints] = useState<
    Partial<Record<ConstraintKey, ConstraintSetting>>
  >(() => createDefaultConstraints(10, 14, 250000, 140));
  const [isConstraintModalOpen, setIsConstraintModalOpen] = useState(false);

  // Monte Carlo & Deep Visualizations state
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [mcActiveTab, setMcActiveTab] = useState<"distribution" | "convergence" | "scatter">("distribution");
  const [showProgressAnimation, setShowProgressAnimation] = useState(false);

  // Sync inputs when active scenario switches
  const handleSelectScenario = (sc: ScenarioState) => {
    setActiveScenarioId(sc.id);
    setHeadcount(sc.headcount);
    setDeadlineWeeks(sc.deadlineWeeks);
    setBudget(sc.budget);
    setScope(sc.scope);
    const updated = sc.constraints ?? createDefaultConstraints(sc.headcount, sc.deadlineWeeks, sc.budget, sc.scope);
    setScenarioConstraints(updated);
  };

  const handleCreateBlankScenario = () => {
    const newSc: ScenarioState = {
      id: `sc-${Date.now()}`,
      number: defaultScenariosState.length + 1,
      name: `Scenario ${defaultScenariosState.length + 1}: Baseline Plan`,
      tag: "Baseline Plan",
      headcount: 8,
      deadlineWeeks: 16,
      budget: 250000,
      scope: 140,
      constraints: createDefaultConstraints(8, 16, 250000, 140),
      isForked: false,
      riskStatus: "Feas",
      isFavorite: false,
      isArchived: false,
      description: "Initial baseline scenario",
    };
    setDefaultScenariosState((prev) => [...prev, newSc]);
    setActiveScenarioId(newSc.id);
    handleSelectScenario(newSc);
  };

  const handleApplyConstraints = (updated: Partial<Record<ConstraintKey, ConstraintSetting>>) => {
    // Enforce scope as mandatory core workload anchor
    const enforced: Partial<Record<ConstraintKey, ConstraintSetting>> = {
      ...updated,
      scope: {
        enabled: true,
        value: updated.scope?.value ?? scenarioConstraints.scope?.value ?? 140,
      },
    };
    setScenarioConstraints(enforced);
    if (enforced.headcount?.value !== undefined) setHeadcount(enforced.headcount.value);
    if (enforced.deadlineWeeks?.value !== undefined) setDeadlineWeeks(enforced.deadlineWeeks.value);
    if (enforced.budget?.value !== undefined) setBudget(enforced.budget.value);
    if (enforced.scope?.value !== undefined) setScope(enforced.scope.value);
  };

  // Sync active scenario and sliders when project or scenarios list changes
  useEffect(() => {
    if (projectScenarios.length > 0) {
      const selected = projectScenarios.find((s) => s.id === activeScenarioId) ?? projectScenarios[0]!;
      setActiveScenarioId(selected.id);
      setHeadcount(selected.headcount);
      setDeadlineWeeks(selected.deadlineWeeks);
      setBudget(selected.budget);
      setScope(selected.scope);
      const updated = selected.constraints ?? createDefaultConstraints(selected.headcount, selected.deadlineWeeks, selected.budget, selected.scope);
      setScenarioConstraints(updated);
    } else {
      setActiveScenarioId(null);
    }
  }, [activeProjectId, projectScenarios.length]);

  // Pure domain simulation results across 15 uniform constraints
  const simResult = useMemo(() => {
    try {
      return simulate({ constraints: scenarioConstraints });
    } catch (err) {
      return null;
    }
  }, [scenarioConstraints]);

  // Active levers dynamically filtered from 15-constraint catalogue
  const activeLevers = useMemo(() => {
    return CONSTRAINT_CATALOGUE.filter((meta) => scenarioConstraints[meta.key]?.enabled === true);
  }, [scenarioConstraints]);

  const handleUpdateConstraintValue = (key: ConstraintKey, val: number) => {
    setScenarioConstraints((prev) => ({
      ...prev,
      [key]: { enabled: true, value: val },
    }));
    if (key === "headcount") setHeadcount(val);
    if (key === "deadlineWeeks") setDeadlineWeeks(val);
    if (key === "budget") setBudget(val);
    if (key === "scope") setScope(val);
  };

  const handleToggleConstraint = (key: ConstraintKey) => {
    if (key === "scope") return; // Scope Effort is mandatory and cannot be disabled
    setScenarioConstraints((prev) => {
      const current = prev[key];
      const isEnabled = current?.enabled ?? false;
      return {
        ...prev,
        [key]: {
          enabled: !isEnabled,
          value: current?.value ?? 0,
        },
      };
    });
  };

  // Explanation Modal state for constraints and risk composition
  const [explanationTopic, setExplanationTopic] = useState<{
    key: string;
    type: "constraint" | "risk";
  } | null>(null);

  const handleOpenExplanation = (key: string, type: "constraint" | "risk") => {
    setExplanationTopic({ key, type });
  };

  // Deterministic fallback calculations for UI compatibility
  const simulation = useMemo(() => {
    const base = calculateSimulation(headcount, deadlineWeeks, budget, scope);
    if (simResult) {
      return {
        ...base,
        estimatedWeeks: simResult.computed.estimatedTimeWeeks ?? 0,
        estimatedCost: simResult.computed.actualCost ?? 0,
        effectiveHc: simResult.computed.effectiveHeadcount ?? 0,
        riskScore: simResult.riskScore,
        isHigh: !simResult.feasible,
        isMod: simResult.riskScore >= 25 && simResult.riskScore < 50,
        isLow: simResult.riskScore < 25,
      };
    }
    return base;
  }, [headcount, deadlineWeeks, budget, scope, simResult]);

  // Attribution diff against baseline scenario for comparison and sensitivity
  const baselineScenario = projectScenarios[0] ?? null;
  const baselineConstraints = useMemo(() => {
    return baselineScenario?.constraints ?? createDefaultConstraints(8, 16, 250000, 140);
  }, [baselineScenario]);

  const baselineSim = useMemo(() => {
    try {
      return simulate({ constraints: baselineConstraints });
    } catch {
      return null;
    }
  }, [baselineConstraints]);

  const liveDiff = useMemo(() => {
    if (!activeScenario) return null;
    try {
      return diffScenarios(
        {
          id: baselineScenario?.id ?? "baseline",
          name: baselineScenario?.name ?? "Baseline Plan",
          inputs: { constraints: baselineConstraints },
          deterministic_output: baselineSim,
        },
        {
          id: activeScenario.id,
          name: activeScenario.name,
          inputs: { constraints: scenarioConstraints },
          deterministic_output: simResult,
        }
      );
    } catch (err) {
      console.error("Live diff error:", err);
      return null;
    }
  }, [baselineScenario, baselineConstraints, baselineSim, activeScenario, scenarioConstraints, simResult]);

  // Monte Carlo execution state (base at 100 runs, increments by 100 on each run up to 2,500 cap)
  const [mcRunCount, setMcRunCount] = useState(100);
  const [isSimulatingMC, setIsSimulatingMC] = useState(false);

  // Re-run Monte Carlo dynamically when constraints change so scatter plot & distributions update live!
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const activeCount = Object.values(scenarioConstraints).filter((s) => s?.enabled).length;
        if (activeCount === 0) return;
        const uncertain = buildUncertainInputs(scenarioConstraints);
        const res = runMonteCarloSimulation(uncertain, {
          iterations: mcRunCount,
          recordCheckpoints: { every: 25 },
          sampleTrials: { count: 120 },
        });
        setMcResult(res);
      } catch {
        // ignore
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [scenarioConstraints, mcRunCount]);

  // Scenario tabs and search filter state (from third page)
  const [scenarioTab, setScenarioTab] = useState<"all" | "favorites" | "archived">("all");
  const [scenarioSearch, setScenarioSearch] = useState<string>("");

  const filteredScenarios = useMemo(() => {
    return projectScenarios.filter((sc) => {
      if (scenarioTab === "all" && sc.isArchived) return false;
      if (scenarioTab === "favorites" && (!sc.isFavorite || sc.isArchived)) return false;
      if (scenarioTab === "archived" && !sc.isArchived) return false;

      if (scenarioSearch.trim()) {
        const q = scenarioSearch.toLowerCase();
        const matchName = sc.name.toLowerCase().includes(q);
        const matchTag = sc.tag?.toLowerCase().includes(q);
        const matchDesc = sc.description?.toLowerCase().includes(q);
        return matchName || matchTag || matchDesc;
      }
      return true;
    });
  }, [projectScenarios, scenarioTab, scenarioSearch]);

  // Project Switcher Dropdown Open State
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  // Modals state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [projectDescInput, setProjectDescInput] = useState("");
  const [projectTagsInput, setProjectTagsInput] = useState("");

  const [isEditTagsOpen, setIsEditTagsOpen] = useState(false);
  const [editingTags, setEditingTags] = useState("");

  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isNewScenarioOpen, setIsNewScenarioOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioDesc, setNewScenarioDesc] = useState("");
  const [nlIntentInput, setNlIntentInput] = useState("");
  const [nlIntentLoading, setNlIntentLoading] = useState(false);
  const [nlExtractedChips, setNlExtractedChips] = useState<{ [k: string]: any } | null>(null);

  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Handle Project Creation directly on Second Page without redirecting away
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectNameInput.trim()) return;

    const tags = projectTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const p = await createProjectMutation.mutateAsync({
        name: projectNameInput.trim(),
        description: projectDescInput.trim() || null,
        suggestedTags: tags,
      });

      // Switch to the new project right here on the dashboard!
      setActiveProjectIdState(p.id);
      setActiveProjectId(p.id);
      setIsCreateProjectOpen(false);
      setProjectNameInput("");
      setProjectDescInput("");
      setProjectTagsInput("");

      // Update URL query param so user stays on the second page!
      router.replace(`/projects?projectId=${p.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  // Handle Project Tag Updates
  const handleUpdateTags = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = editingTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (isDbProject) {
      await updateProjectTagsMutation.mutateAsync({ id: activeProjectId, suggestedTags: tags });
    }
    setIsEditTagsOpen(false);
  };

  // Handle Project Deletion
  const handleDeleteProject = async () => {
    setDeleteError(null);
    try {
      if (isDbProject) {
        await deleteProjectMutation.mutateAsync(activeProjectId);
      }
      setIsDeleteProjectOpen(false);
      setActiveProjectIdState("default");
      setActiveProjectId("default");
      router.replace("/projects");
    } catch (err: any) {
      if (err.code === "PROJECT_NOT_EMPTY") {
        setDeleteError("This project still contains scenarios. Delete them first.");
      } else {
        setDeleteError(err.message || "Failed to delete project.");
      }
    }
  };

  // Handle Natural Language Intent in Scenario Builder
  const handleExtractIntent = async () => {
    if (!nlIntentInput.trim()) return;
    setNlIntentLoading(true);
    setNlExtractedChips(null);
    try {
      const res = await fetch("/api/ai/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: nlIntentInput,
          baselineInputs: {
            constraints: scenarioConstraints,
          },
        }),
      });
      const data = await res.json();
      if (data.data?.resolvedInputs) {
        setNlExtractedChips(data.data.delta);
        if (data.data.resolvedInputs.constraints) {
          handleApplyConstraints(data.data.resolvedInputs.constraints);
        }
      }
    } catch (err) {
      console.error("AI intent error:", err);
    } finally {
      setNlIntentLoading(false);
    }
  };

  // Handle Scenario Creation / Saving
  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newScenarioName.trim() || `Scenario ${projectScenarios.length + 1}: Custom Variant`;

    if (isDbProject) {
      try {
        const created = await createScenarioMutation.mutateAsync({
          projectId: activeProjectId,
          name,
          description: newScenarioDesc.trim() || null,
          inputs: {
            constraints: scenarioConstraints,
          },
        });
        setActiveScenarioId(created.id);
      } catch (err) {
        console.error("Failed to save scenario:", err);
      }
    } else {
      const newSc: ScenarioState = {
        id: `sc-${Date.now()}`,
        number: defaultScenariosState.length + 1,
        name,
        tag: "Custom Variant",
        headcount,
        deadlineWeeks,
        budget,
        scope,
        constraints: scenarioConstraints,
        isForked: true,
        riskStatus: simResult ? (simResult.riskScore >= 50 ? "Risk" : simResult.riskScore >= 25 ? "Mod" : "Feas") : "Feas",
        isFavorite: false,
        isArchived: false,
        description: newScenarioDesc.trim() || null,
      };
      setDefaultScenariosState((prev) => [...prev, newSc]);
      setActiveScenarioId(newSc.id);
    }

    setIsNewScenarioOpen(false);
    setNewScenarioName("");
    setNewScenarioDesc("");
    setNlIntentInput("");
    setNlExtractedChips(null);
  };

  // Handle Scenario Quick Actions (Favorite, Archive, Delete)
  const handleToggleFavoriteScenario = (sc: ScenarioState, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDbProject) {
      toggleFavoriteMutation.mutate(sc.id);
    } else {
      setDefaultScenariosState((prev) =>
        prev.map((s) => (s.id === sc.id ? { ...s, isFavorite: !s.isFavorite } : s))
      );
    }
  };

  const handleToggleArchiveScenario = (sc: ScenarioState, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDbProject) {
      setArchivedMutation.mutate({ id: sc.id, archived: !sc.isArchived });
    } else {
      setDefaultScenariosState((prev) =>
        prev.map((s) => (s.id === sc.id ? { ...s, isArchived: !s.isArchived } : s))
      );
    }
  };

  const handleDeleteScenario = (sc: ScenarioState, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDbProject) {
      deleteScenarioMutation.mutate({ id: sc.id, projectId: activeProjectId });
    } else {
      setDefaultScenariosState((prev) => prev.filter((s) => s.id !== sc.id));
    }
  };

  // Trigger Monte Carlo Simulation (starts at base 1,000, increments by 100 per run up to cap of 2,500)
  const handleRunMonteCarlo = () => {
    setIsSimulatingMC(true);
    setShowProgressAnimation(true);
    const nextCount = Math.min(2500, mcRunCount + 100);
    setMcRunCount(nextCount);
    try {
      const activeCount = Object.values(scenarioConstraints).filter((s) => s?.enabled).length;
      if (activeCount > 0) {
        const uncertain = buildUncertainInputs(scenarioConstraints);
        const res = runMonteCarloSimulation(uncertain, {
          iterations: nextCount,
          recordCheckpoints: { every: 25 },
          sampleTrials: { count: 200 },
        });
        setMcResult(res);
      }
    } catch (err) {
      console.error("Monte Carlo run error:", err);
    }
    setTimeout(() => {
      setIsSimulatingMC(false);
    }, 350);
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
    <div className="w-full min-h-screen flex flex-col bg-[#282c2d] text-white">
      {/* Full Screen Application Panel */}
      <div className="w-full min-h-screen flex flex-col">
        {/* Top Window Chrome Bar */}
        <div className="w-full flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#222526] border-b border-[#454d4b] text-xs font-sans text-white/60">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="font-serif italic font-black tracking-widest text-base sm:text-lg text-white hover:opacity-80 transition-opacity cursor-pointer flex items-center"
              title="Return to Home Page"
            >
              KAIROS
            </Link>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick Build Scenario Button */}
            <button
              type="button"
              onClick={() => {
                setNewScenarioName(`Scenario ${projectScenarios.length + 1}: Custom Variant`);
                setIsNewScenarioOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#282c2d] border border-[#454d4b] hover:border-white/40 text-white text-xs font-sans font-medium transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Scenario</span>
            </button>

            {/* Accessible Add Project Button right from second page */}
            <button
              type="button"
              onClick={() => setIsCreateProjectOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3a5a6b] hover:bg-[#2c4356] text-white text-xs font-sans font-medium transition-colors shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>        {/* Inner Workspace Grid: Sidebar + Main Content Column */}
        <div className="w-full grid grid-cols-12 flex-1 min-h-[calc(100vh-48px)] bg-[#282c2d] text-white">
          {/* Left Sidebar */}
          <div className="col-span-12 md:col-span-5 lg:col-span-4 xl:col-span-3 min-w-0 md:min-w-[280px] lg:min-w-[320px] border-r border-[#454d4b] bg-[#222526] p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Project Header & Interactive Dropdown Switcher */}
              <div className="relative pb-3 border-b border-[#454d4b]">
                <button
                  type="button"
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="w-full flex items-center justify-between text-left p-1.5 -mx-1.5 rounded-xl hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-lg bg-[#3a5a6b] text-white flex items-center justify-center font-serif font-bold text-sm shadow-sm shrink-0">
                      {activeProject.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white leading-tight truncate">
                        {activeProject.name}
                      </div>
                      <div className="text-[10px] text-white/50">
                        {projectScenarios.length} scenario{projectScenarios.length !== 1 ? "s" : ""} active
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/50 group-hover:text-white transition-transform duration-150 shrink-0" />
                </button>

                {/* Project Switcher Dropdown Menu */}
                {isProjectDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 p-2 rounded-xl bg-[#1e2122] border border-[#454d4b] shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150 font-sans text-xs">
                    <div className="text-[10px] uppercase font-bold text-white/40 px-2 py-1">
                      Switch Project
                    </div>
                    {allProjects.map((p) => {
                      const isSel = p.id === activeProjectId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setActiveProjectIdState(p.id);
                            setActiveProjectId(p.id);
                            setIsProjectDropdownOpen(false);
                            if (p.id !== "default") {
                              router.replace(`/projects?projectId=${p.id}`);
                            } else {
                              router.replace("/projects");
                            }
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                            isSel ? "bg-[#3a5a6b] text-white" : "hover:bg-[#282c2d] text-white/80 hover:text-white"
                          }`}
                        >
                          <span className="truncate pr-2 font-medium">{p.name}</span>
                          {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}

                    <div className="pt-1.5 mt-1 border-t border-[#454d4b]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProjectDropdownOpen(false);
                          setIsCreateProjectOpen(true);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-[#8ba888] hover:bg-white/5 flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Project</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Project Metadata & Actions from Third Page */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
                  <div className="flex flex-wrap gap-1 items-center max-w-[80%]">
                    {activeProject.suggested_tags?.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-[#1e2122] border border-[#454d4b] text-white/70"
                      >
                        #{t}
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTags(activeProject.suggested_tags?.join(", ") || "");
                        setIsEditTagsOpen(true);
                      }}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Edit project tags"
                    >
                      <Tag className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Delete Project Action */}
                  <button
                    type="button"
                    onClick={() => setIsDeleteProjectOpen(true)}
                    className="p-1 text-white/40 hover:text-[#b5502f] transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scenarios Filter Tabs & Search Bar (from Third Page) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-white/50">
                    Scenarios
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewScenarioName(`Scenario ${projectScenarios.length + 1}: Custom Variant`);
                      setIsNewScenarioOpen(true);
                    }}
                    className="text-[10px] text-[#8ba888] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Build</span>
                  </button>
                </div>

                {/* Filter Tabs: Active, Favorites, Archived */}
                <div className="flex items-center gap-1 p-0.5 bg-[#1e2122] rounded-lg border border-[#454d4b] text-[10px] font-sans">
                  <button
                    type="button"
                    onClick={() => setScenarioTab("all")}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      scenarioTab === "all"
                        ? "bg-[#3a5a6b] text-white shadow-xs"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Active ({projectScenarios.filter((s) => !s.isArchived).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScenarioTab("favorites")}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      scenarioTab === "favorites"
                        ? "bg-[#3a5a6b] text-white shadow-xs"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Fav ({projectScenarios.filter((s) => s.isFavorite && !s.isArchived).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScenarioTab("archived")}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      scenarioTab === "archived"
                        ? "bg-[#3a5a6b] text-white shadow-xs"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Arch ({projectScenarios.filter((s) => s.isArchived).length})
                  </button>
                </div>

                {/* Real-time Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3 h-3 text-white/40" />
                  <input
                    type="text"
                    value={scenarioSearch}
                    onChange={(e) => setScenarioSearch(e.target.value)}
                    placeholder="Filter scenarios..."
                    className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-[#1e2122] border border-[#454d4b] text-[11px] text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#3a5a6b]"
                  />
                </div>

                {/* Scenarios List */}
                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                  {filteredScenarios.length === 0 ? (
                    <div className="p-4 text-center rounded-xl bg-[#1e2122]/50 border border-dashed border-[#454d4b] text-xs text-white/50 space-y-2">
                      <p className="text-[11px]">No scenarios found in this view.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewScenarioName(`Scenario ${projectScenarios.length + 1}: Custom Variant`);
                          setIsNewScenarioOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] rounded bg-[#3a5a6b] text-white font-medium hover:bg-[#2c4356] transition-colors"
                      >
                        + Build Scenario
                      </button>
                    </div>
                  ) : (
                    filteredScenarios.map((sc) => {
                      const isActive = sc.id === activeScenarioId;
                      return (
                        <div
                          key={sc.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectScenario(sc)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelectScenario(sc);
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer border group select-none shadow-xs ${
                            isActive
                              ? "bg-[#3a5a6b] text-white border-[#3a5a6b] shadow-md ring-1 ring-white/20"
                              : "bg-[#1e2122]/80 hover:bg-[#1e2122] hover:border-[#8ba888]/50 text-white/90 border-[#454d4b]"
                          }`}
                        >
                          {/* Main Row: Title & Badges/Actions */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div
                                className={`font-semibold leading-snug transition-colors ${
                                  isActive ? "text-white" : "text-white/90 group-hover:text-white"
                                } line-clamp-1 group-hover:line-clamp-none`}
                                title={`${sc.number}. ${sc.name}`}
                              >
                                {sc.number}. {sc.name}
                              </div>
                              <div className={`text-[10px] mt-0.5 ${isActive ? "text-white/70" : "text-white/50"}`}>
                                {isActive ? headcount : sc.headcount} eng · {isActive ? deadlineWeeks : sc.deadlineWeeks} wks
                              </div>
                            </div>

                            {/* Status Badge & Quick Action Buttons */}
                            <div className="flex items-center gap-1 shrink-0 pt-0.5">
                              {/* Star / Favorite Action */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleFavoriteScenario(sc, e)}
                                className={`p-1 rounded transition-colors ${
                                  sc.isFavorite
                                    ? "text-[#c98a3e]"
                                    : isActive
                                    ? "text-white/50 hover:text-white"
                                    : "text-white/30 hover:text-white"
                                }`}
                                title={sc.isFavorite ? "Unfavorite" : "Mark as favorite"}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${sc.isFavorite ? "fill-[#c98a3e]" : ""}`}
                                />
                              </button>

                              {/* Archive Action */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleArchiveScenario(sc, e)}
                                className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                                  isActive
                                    ? "text-white/50 hover:text-white"
                                    : "text-white/30 hover:text-white"
                                }`}
                                title={sc.isArchived ? "Unarchive" : "Archive"}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Action */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteScenario(sc, e)}
                                className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                                  isActive
                                    ? "text-white/50 hover:text-red-300"
                                    : "text-white/30 hover:text-[#b5502f]"
                                }`}
                                title="Delete scenario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Risk Pill */}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                  sc.riskStatus === "Feas"
                                    ? "bg-[#8ba888]/20 text-[#8ba888] border border-[#8ba888]/30"
                                    : sc.riskStatus === "Risk"
                                    ? "bg-[#b5502f] text-white"
                                    : "bg-[#c98a3e]/20 text-[#c98a3e] border border-[#c98a3e]/30"
                                }`}
                              >
                                {sc.riskStatus === "Feas" ? "24 Feas" : sc.riskStatus === "Risk" ? "68 Risk" : "42 Mod"}
                              </span>
                            </div>
                          </div>

                          {/* Hover Expansion Section: Details & Metrics */}
                          <div className="max-h-0 opacity-0 overflow-hidden group-hover:max-h-60 group-hover:opacity-100 transition-all duration-300 ease-in-out">
                            <div className={`mt-2 pt-2 border-t text-[11px] space-y-1.5 ${isActive ? "border-white/20" : "border-[#454d4b]"}`}>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wider text-[#8ba888]">
                                  <Info className="w-3 h-3" />
                                  <span>Details</span>
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-white/70 font-mono">
                                  {sc.tag || "Custom"}
                                </span>
                              </div>

                              {sc.description ? (
                                <p className="text-[10.5px] text-white/75 leading-tight italic">
                                  "{sc.description}"
                                </p>
                              ) : null}

                              <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px]">
                                <div className={`px-2 py-1 rounded border ${isActive ? "bg-black/20 border-white/10" : "bg-[#282c2d] border-[#454d4b]"}`}>
                                  <span className="text-white/40 block text-[9px]">Budget</span>
                                  <span className="font-mono font-medium text-white">
                                    ${((isActive ? budget : sc.budget) / 1000).toFixed(0)}k
                                  </span>
                                </div>
                                <div className={`px-2 py-1 rounded border ${isActive ? "bg-black/20 border-white/10" : "bg-[#282c2d] border-[#454d4b]"}`}>
                                  <span className="text-white/40 block text-[9px]">Scope</span>
                                  <span className="font-mono font-medium text-white">
                                    {isActive ? scope : sc.scope} pts
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 text-[10px] text-white/60">
                                <span className="flex items-center gap-1 text-[#8ba888] font-medium">
                                  <span>Click box to select</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </span>
                                <span className="text-[9px] text-white/40">
                                  {isActive ? "Active Now" : "Switch Scenario"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Main Dashboard Column */}
          <div className="col-span-12 md:col-span-7 lg:col-span-8 xl:col-span-9 min-w-0 p-5 lg:p-7 space-y-6">
            {/* Top Bar Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#454d4b]">
              <div className="flex items-center gap-3">
                {activeScenario ? (
                  <>
                    <h1 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-white">
                      Scenario {activeScenario.number}: {activeScenario.name}
                    </h1>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#222526] border border-[#454d4b] text-white/70 font-sans">
                      {activeScenario.tag}
                    </span>
                  </>
                ) : (
                  <>
                    <h1 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-white">
                      Workspace Dashboard
                    </h1>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#222526] border border-[#454d4b] text-[#8ba888] font-sans font-medium">
                      Blank Page · 0 Scenarios
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {/* Save Current Levers as New Scenario */}
                <button
                  type="button"
                  onClick={() => {
                    setNewScenarioName(`Scenario ${projectScenarios.length + 1}: Custom Variant`);
                    setIsNewScenarioOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222526] border border-[#454d4b] hover:border-white/40 text-white text-xs font-sans font-medium shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{activeScenario ? "Save as Scenario" : "New Scenario"}</span>
                </button>

                {/* Compare Scenarios Button */}
                {activeScenario && (
                  <button
                    type="button"
                    onClick={() => setIsCompareOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222526] border border-[#454d4b] hover:border-white/40 text-white text-xs font-sans font-medium shadow-xs transition-colors"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Compare Scenarios</span>
                  </button>
                )}

                {/* Run Monte Carlo Button */}
                {activeScenario && (
                  <button
                    type="button"
                    onClick={handleRunMonteCarlo}
                    disabled={isSimulatingMC || mcRunCount >= 2500}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3a5a6b] hover:bg-[#2c4356] text-white text-xs font-sans font-medium shadow-sm transition-colors disabled:opacity-75"
                  >
                    {isSimulatingMC ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span suppressHydrationWarning>
                      {isSimulatingMC
                        ? `Sampling ${mcRunCount.toLocaleString("en-US")} runs...`
                        : mcRunCount >= 2500
                        ? "Run Monte Carlo (2,500 - Cap)"
                        : `Run Monte Carlo (${mcRunCount.toLocaleString("en-US")})`}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {activeScenario ? (
              <>
                {/* Constraint Catalogue Summary Strip */}
                <ConstraintSummaryStrip
                  constraints={scenarioConstraints}
                  onOpenModal={() => setIsConstraintModalOpen(true)}
                  onExplainConstraint={(key) => handleOpenExplanation(key, "constraint")}
                />

            {/* Top Row: 4 Metric Cards with Prerequisite Gating */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Estimated Cost */}
              <div className="p-3.5 rounded-2xl bg-[#222526] border border-[#454d4b] shadow-card space-y-1">
                <div className="text-[11px] text-white/60 font-sans flex items-center gap-1">
                  <span>$</span>
                  <span>Estimated Cost</span>
                </div>
                {simResult?.computed.actualCost !== undefined ? (
                  <>
                    <div className="text-2xl font-serif font-bold text-white my-0.5" suppressHydrationWarning>
                      ${Math.round(simResult.computed.actualCost).toLocaleString("en-US")}
                    </div>
                    {simResult.computed.budgetUtilization !== undefined ? (
                      (() => {
                        const bgVal = scenarioConstraints.budget?.value ?? budget;
                        const variance = ((simResult.computed.actualCost! - bgVal) / bgVal) * 100;
                        return (
                          <div
                            className={`text-[11px] font-sans font-medium ${
                              variance > 0 ? "text-[#b5502f]" : "text-[#8ba888]"
                            }`}
                          >
                            {variance > 0
                              ? `+${variance.toFixed(1)}% over budget`
                              : `${Math.abs(variance).toFixed(1)}% under budget`}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-[10px] text-white/40 italic">
                        Budget disabled — variance not evaluated
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1 py-1">
                    <div className="text-xl font-serif font-bold text-white/30">—</div>
                    <div className="text-[10.5px] text-white/40 italic">
                      Not evaluated — requires Headcount &amp; Scope
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Delivery Time */}
              <div className="p-3.5 rounded-2xl bg-[#222526] border border-[#454d4b] shadow-card space-y-1">
                <div className="text-[11px] text-white/60 font-sans flex items-center gap-1">
                  <span>🗓</span>
                  <span>Delivery Time</span>
                </div>
                {simResult?.computed.estimatedTimeWeeks !== undefined ? (
                  <>
                    <div className="text-2xl font-serif font-bold text-white my-0.5">
                      {simResult.computed.estimatedTimeWeeks.toFixed(1)} wks
                    </div>
                    {simResult.computed.scheduleUtilization !== undefined ? (
                      (() => {
                        const dlVal = scenarioConstraints.deadlineWeeks?.value ?? deadlineWeeks;
                        const variance = simResult.computed.estimatedTimeWeeks! - dlVal;
                        return (
                          <div
                            className={`text-[11px] font-sans font-medium ${
                              variance > 0 ? "text-[#b5502f]" : "text-[#8ba888]"
                            }`}
                          >
                            {variance > 0
                              ? `+${variance.toFixed(1)} wks past deadline`
                              : `${Math.abs(variance).toFixed(1)} wks buffer`}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-[10px] text-white/40 italic">
                        Deadline disabled — schedule variance not evaluated
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1 py-1">
                    <div className="text-xl font-serif font-bold text-white/30">—</div>
                    <div className="text-[10.5px] text-white/40 italic">
                      Not evaluated — requires Headcount &amp; Scope
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Effective Headcount */}
              <div className="p-3.5 rounded-2xl bg-[#222526] border border-[#454d4b] shadow-card space-y-1">
                <div className="text-[11px] text-white/60 font-sans flex items-center gap-1">
                  <span>👥</span>
                  <span>Effective Headcount</span>
                </div>
                {simResult?.computed.effectiveHeadcount !== undefined ? (
                  <>
                    <div className="text-2xl font-serif font-bold text-white my-0.5">
                      {simResult.computed.effectiveHeadcount.toFixed(2)} eng
                    </div>
                    {(() => {
                      const hcVal = scenarioConstraints.headcount?.value ?? headcount;
                      const drag = hcVal - simResult.computed.effectiveHeadcount!;
                      return (
                        <div className="text-[11px] font-sans text-[#b5502f] font-medium">
                          {drag.toFixed(2)} eng drag penalty
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="space-y-1 py-1">
                    <div className="text-xl font-serif font-bold text-white/30">—</div>
                    <div className="text-[10.5px] text-white/40 italic">
                      Not evaluated — enable Headcount
                    </div>
                  </div>
                )}
              </div>

              {/* Card 4: Risk Score */}
              <div
                className={`p-3.5 rounded-2xl border shadow-card space-y-1 ${
                  !simResult || simResult.activeConstraints.length === 0
                    ? "bg-[#222526] border-[#454d4b]"
                    : !simResult.feasible
                    ? "bg-[#b5502f]/15 border-[#b5502f]/40"
                    : simResult.riskScore >= 25
                    ? "bg-[#c98a3e]/15 border-[#c98a3e]/40"
                    : "bg-[#8ba888]/15 border-[#8ba888]/40"
                }`}
              >
                {simResult && simResult.activeConstraints.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-[11px] font-sans">
                      <span
                        className={`font-semibold ${
                          !simResult.feasible
                            ? "text-[#b5502f]"
                            : simResult.riskScore >= 25
                            ? "text-[#c98a3e]"
                            : "text-[#8ba888]"
                        }`}
                      >
                        Risk Score
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold text-white ${
                          !simResult.feasible
                            ? "bg-[#b5502f]"
                            : simResult.riskScore >= 25
                            ? "bg-[#c98a3e]"
                            : "bg-[#8ba888]"
                        }`}
                      >
                        {!simResult.feasible ? "HIGH" : simResult.riskScore >= 25 ? "MOD" : "LOW"}
                      </span>
                    </div>

                    <div
                      className={`text-2xl font-serif font-bold my-0.5 ${
                        !simResult.feasible
                          ? "text-[#b5502f]"
                          : simResult.riskScore >= 25
                          ? "text-[#c98a3e]"
                          : "text-[#8ba888]"
                      }`}
                    >
                      {simResult.riskScore.toFixed(2)}{" "}
                      <span className="text-xs font-sans font-normal text-white/60">/ 100</span>
                    </div>

                    <div
                      className={`text-[10.5px] font-sans font-medium ${
                        !simResult.feasible
                          ? "text-[#b5502f]"
                          : simResult.riskScore >= 25
                          ? "text-[#c98a3e]"
                          : "text-[#8ba888]"
                      }`}
                    >
                      {simResult.feasible ? "Feasible (Threshold < 50)" : "Infeasible (Threshold ≥ 50)"}
                    </div>

                    {scenarioConstraints.deadlineWeeks?.enabled === false && (
                      <div className="text-[10px] text-[#c98a3e] font-sans italic pt-0.5">
                        Schedule Risk not evaluated (enable Deadline)
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1 py-1">
                    <div className="text-xs font-bold text-white/60">Risk Score</div>
                    <div className="text-xl font-serif font-bold text-white/30">—</div>
                    <div className="text-[10.5px] text-white/40 italic">
                      Not evaluated — enable at least 1 constraint
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Risk Composition Bar Chart (Gated to evaluated dimensions) */}
            {simResult && (
              <div className="pt-1">
                <RiskCompositionBarChart
                  computed={simResult.computed}
                  riskScore={simResult.riskScore}
                  onExplainDimension={(key) => handleOpenExplanation(key, "risk")}
                />
              </div>
            )}

            {/* Middle Row: Project Levers Panel & Monte Carlo Uncertainty Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Panel: Project Levers (Dynamically displays ALL active/enabled constraints) */}
              <div className="lg:col-span-6 p-4 rounded-2xl bg-[#222526] border border-[#454d4b] shadow-card space-y-3 flex flex-col justify-between text-white">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#454d4b]">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#8ba888]" />
                      <span className="font-serif text-base sm:text-lg font-bold text-white">
                        Project Levers ({activeLevers.length} active)
                      </span>
                    </div>
                  </div>

                  {activeLevers.length === 0 ? (
                    <div className="p-8 rounded-xl bg-[#1e2122] border border-dashed border-[#454d4b] text-center text-xs text-white/50 space-y-3 my-4">
                      <p>No active constraint levers enabled for this scenario.</p>
                      <button
                        type="button"
                        onClick={() => setIsConstraintModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#3a5a6b] text-white font-medium text-xs hover:bg-[#2c4356] transition-colors"
                      >
                        + Enable Constraints
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2 pr-1">
                      {activeLevers.map((meta) => {
                        const currentVal = scenarioConstraints[meta.key]?.value ?? meta.defaultValue;
                        const displayVal =
                          meta.key === "budget"
                            ? `$${Math.round(currentVal).toLocaleString("en-US")}`
                            : meta.key === "headcount"
                            ? `${currentVal} engineers`
                            : meta.key === "deadlineWeeks"
                            ? `${currentVal} weeks`
                            : meta.key === "scope"
                            ? `${currentVal} story points`
                            : meta.unit.includes("ratio") || meta.unit.includes("rate")
                            ? Number(currentVal).toFixed(2)
                            : meta.unit.includes("%")
                            ? `${currentVal}%`
                            : `${currentVal} ${meta.unit.split(" ")[0]}`;

                        return (
                          <div
                            key={meta.key}
                            className="space-y-1.5 p-2.5 rounded-xl bg-[#1e2122] border border-[#454d4b] shadow-2xs"
                          >
                            <div className="flex justify-between items-center text-xs font-sans">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-medium">{meta.label}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenExplanation(meta.key, "constraint")}
                                  className="text-white/40 hover:text-white transition-colors p-0.5"
                                  title={`Explain what ${meta.label} does`}
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white text-xs">
                                  {displayVal}
                                </span>
                                {meta.isMandatory ? (
                                  <span
                                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#3a5a6b]/30 text-[#8ba888] font-bold border border-[#3a5a6b]/50"
                                    title="Mandatory Core Workload Anchor"
                                  >
                                    Anchor
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleConstraint(meta.key)}
                                    className="text-white/40 hover:text-[#b5502f] transition-colors p-0.5 rounded hover:bg-white/10"
                                    title={`Disable and remove ${meta.label} from levers`}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <input
                              type="range"
                              min={meta.min}
                              max={meta.max}
                              step={meta.step}
                              value={currentVal}
                              onChange={(e) =>
                                handleUpdateConstraintValue(meta.key, Number(e.target.value))
                              }
                              className="w-full accent-[#8ba888] cursor-pointer h-1.5 bg-[#343839] rounded-lg"
                            />

                            <div className="flex justify-between text-[10px] text-white/40 font-mono">
                              <span>
                                {meta.min} {meta.unit.split(" ")[0]}
                              </span>
                              <span>
                                {meta.max} {meta.unit.split(" ")[0]}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#454d4b] flex items-center justify-between text-[11px] text-white/50">
                  <span>Toggle or add levers anytime via catalogue</span>
                  <button
                    type="button"
                    onClick={() => setIsConstraintModalOpen(true)}
                    className="text-[#8ba888] font-semibold hover:underline"
                  >
                    + Add More Levers
                  </button>
                </div>
              </div>

              {/* Right Panel: Monte Carlo Uncertainty Distribution & Scatter Plot displayed simultaneously */}
              <div className="lg:col-span-6 space-y-4">
                {/* 1. Monte Carlo Distribution Card */}
                <div className="p-4 rounded-2xl bg-[#222526] border border-[#454d4b] shadow-card space-y-3 text-white">
                  <div className="flex items-center justify-between pb-2 border-b border-[#454d4b]">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#8ba888]" />
                      <span className="font-serif text-base sm:text-lg font-bold text-white" suppressHydrationWarning>
                        Monte Carlo Distribution ({mcRunCount.toLocaleString("en-US")} Runs)
                      </span>
                    </div>
                    <span className="text-[10px] text-white/50 font-mono">
                      Timeline Uncertainty
                    </span>
                  </div>

                  {showProgressAnimation && (
                    <div className="py-1">
                      <IterationProgressIndicator
                        totalIterations={mcRunCount}
                        isComplete={!isSimulatingMC}
                        onAnimationComplete={() => setShowProgressAnimation(false)}
                      />
                    </div>
                  )}

                  {/* Histogram */}
                  <div className="h-24 w-full flex items-end justify-between gap-1.5 px-2 pt-3 pb-1 bg-[#1e2122] rounded-xl border border-[#454d4b]">
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
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#1e2122] text-white text-[9px] rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-[#454d4b]">
                          {bar.height}%
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Probability Metric Cards */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs font-sans">
                    <div className="p-2.5 rounded-xl bg-[#1e2122] border border-[#454d4b]">
                      <div className="text-[10px] text-white/70 font-semibold">Probability On-Time</div>
                      <div className="font-mono font-bold text-lg mt-0.5 text-white">
                        {(mcResult ? mcResult.probabilityOnTime * 100 : simulation.probOnTime).toFixed(1)}%
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1e2122] border border-[#454d4b]">
                      <div className="text-[10px] text-white/70 font-semibold">Within Budget</div>
                      <div className="font-mono font-bold text-lg mt-0.5 text-white">
                        {(mcResult ? mcResult.probabilityWithinBudget * 100 : simulation.probWithinBudget).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Distribution Explanation & Dynamics */}
                  <div className="p-3 rounded-xl bg-[#1e2122] border border-[#454d4b] text-xs sm:text-[13px] font-sans text-white/80 space-y-1.5">
                    <p className="leading-relaxed">
                      <strong>Distribution Dynamics:</strong> Simulated trial outcomes are evaluated against the {deadlineWeeks}-week target deadline.
                      Histogram bars indicate timeline density (<span className="text-[#8ba888] font-semibold">green</span> = on-time completion, <span className="text-[#c98a3e] font-semibold">amber</span> = &le; 2 weeks slippage, and <span className="text-[#b5502f] font-semibold">terracotta</span> = critical schedule breach).
                    </p>
                    <p className="text-[11.5px] sm:text-xs text-white/60 italic">
                      90% confidence interval projects delivery between {(mcResult?.estimatedTimeWeeks?.percentiles?.p10 ?? (simulation.estimatedWeeks * 0.9)).toFixed(1)} wks (p10) and {(mcResult?.estimatedTimeWeeks?.percentiles?.p90 ?? (simulation.estimatedWeeks * 1.25)).toFixed(1)} wks (p90).
                    </p>
                  </div>
                </div>

                {/* 2. Trial Scatter Plot Card */}
                <div className="rounded-2xl overflow-hidden shadow-card">
                  <TrialScatterPlot trialSample={mcResult?.trialSample} />
                </div>

                {/* Dynamic Real-Time Simulation Status / Issue Summary (2-3 lines) */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#222526] border border-[#454d4b] shadow-card space-y-1.5 font-sans text-white">
                  <div className="flex items-center gap-1.5">
                    {simResult?.feasible ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#8ba888] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-[#b5502f] shrink-0" />
                    )}
                    <span className="font-serif text-sm sm:text-[15px] font-bold text-white leading-tight">
                      {simResult?.feasible
                        ? "Delivery Status: Plan On Track & Feasible"
                        : "Delivery Alert: Plan Infeasible Under Current Levers"}
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-white/80 leading-snug space-y-1" suppressHydrationWarning>
                    <p>
                      • <strong>Schedule:</strong> Estimated delivery is <strong className="text-white">{simulation.estimatedWeeks.toFixed(1)} weeks</strong>{" "}
                      {simulation.scheduleVarianceWeeks > 0 ? (
                        <span className="text-[#b5502f] font-semibold">
                          ({simulation.scheduleVarianceWeeks.toFixed(1)} wks past deadline)
                        </span>
                      ) : (
                        <span className="text-[#8ba888] font-semibold">
                          ({Math.abs(simulation.scheduleVarianceWeeks).toFixed(1)} wks buffer)
                        </span>
                      )}
                      {" "}with <strong className="text-white">{(mcResult ? mcResult.probabilityOnTime * 100 : simulation.probOnTime).toFixed(0)}% completion certainty</strong>.
                    </p>
                    <p>
                      • <strong>Cost &amp; Labor:</strong> Projected cost is <strong className="text-white">${Math.round(simulation.estimatedCost).toLocaleString("en-US")}</strong>{" "}
                      {simulation.estimatedCost - budget > 0 ? (
                        <span className="text-[#b5502f] font-semibold">
                          (${Math.round(simulation.estimatedCost - budget).toLocaleString("en-US")} over budget)
                        </span>
                      ) : (
                        <span className="text-[#8ba888] font-semibold">
                          (${Math.round(Math.abs(simulation.estimatedCost - budget)).toLocaleString("en-US")} margin)
                        </span>
                      )}
                      ; {headcount} engineers generate {simulation.dragPenalty.toFixed(2)} drag penalty (Brooks&apos;s Law).
                    </p>
                    <p className="text-[#8ba888] font-medium">
                      • <strong>Key Takeaway:</strong>{" "}
                      {simResult?.feasible
                        ? "All core parameters are aligned. Timeline and cost risk profiles are healthy and within operational tolerance."
                        : simulation.scheduleVarianceWeeks > 0 && simulation.estimatedCost - budget > 0
                        ? "Both schedule and budget thresholds are breached. Consider extending deadline to ~" + Math.ceil(simulation.estimatedWeeks) + " weeks or descoping."
                        : simulation.scheduleVarianceWeeks > 0
                        ? "Schedule compression is the primary friction. Adding headcount increases communication drag. Extending deadline is recommended."
                        : "Budget allocation is exceeded by actual labor costs. Adjust team size or negotiate budget cap."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Down Below: Dedicated Large Standalone Monte Carlo Convergence Tracker */}
            <div className="p-5 rounded-2xl bg-[#222526] border border-[#454d4b] shadow-card space-y-2 text-white">
              <div className="flex items-center justify-between pb-2 border-b border-[#454d4b]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#8ba888]" />
                  <span className="text-base sm:text-lg font-bold text-white font-serif">
                    Monte Carlo Convergence Analysis
                  </span>
                </div>
                <span className="text-xs text-white/50 font-mono">
                  Running-Mean Steady-State Trajectory
                </span>
              </div>
              <MonteCarloConvergenceChart
                convergence={mcResult?.convergence}
                metricLabel="Running Mean Project Cost ($)"
              />
            </div>

            {/* Bottom Calculations Row: Brooks's Law Overhead Model & Bounded AI Scenario Attribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Brooks's Law Overhead Model (Main Panel Calculation) */}
              <div className="md:col-span-1 p-4 rounded-2xl bg-[#222526] border border-[#454d4b] shadow-card space-y-2.5 font-sans flex flex-col justify-between text-white">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base sm:text-lg font-bold text-white">Brooks&apos;s Law Model</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3a5a6b]/30 text-[#8ba888] font-mono font-medium border border-[#3a5a6b]/40">
                      Overhead Calculation
                    </span>
                  </div>
                  <div className="text-2xl font-serif font-bold text-white">
                    {simulation.overheadFactor.toFixed(2)}x
                  </div>
                  <div className="text-xs sm:text-[13px] text-white/70 font-medium">
                    Communication &amp; Ramp Overhead Factor
                  </div>
                </div>
                <div className="pt-2 border-t border-[#454d4b] text-xs sm:text-[13px] text-white/80 space-y-1">
                  <div>
                    • <strong>{simulation.dragPenalty.toFixed(2)}</strong> effective eng communication drag
                  </div>
                  <div>
                    • Team size: <strong>{headcount}</strong> engineers ({simulation.effectiveHc.toFixed(1)} net effective capacity)
                  </div>
                </div>
              </div>

              {/* Bounded AI Scenario Attribution */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-[#222526] border border-[#454d4b] flex items-start gap-3.5 shadow-card text-white">
                <div className="w-8 h-8 rounded-lg bg-[#3a5a6b]/30 text-[#8ba888] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-[#8ba888]" />
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base sm:text-lg font-bold text-white">
                      Bounded AI Scenario Attribution
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3a5a6b]/30 text-[#8ba888] font-mono font-medium border border-[#3a5a6b]/40">
                      Zero Hallucination
                    </span>
                  </div>
                  <p className="text-white/85 leading-relaxed font-sans text-xs sm:text-[13px]">
                    {headcount === 10 && deadlineWeeks === 14 && budget === 250000 && scope === 140 ? (
                      <>
                        Adding 4 engineers reduced raw sprint capacity requirements by 2.1 weeks, but generated 2.59 equivalent engineers of communication drag (Brooks&apos;s Law). Net delivery date shifts backward by 2.4 weeks past the 14-week deadline.
                      </>
                    ) : (
                      <>
                        Adding {headcount - 6 >= 0 ? `${headcount - 6}` : `0`} engineers beyond baseline
                        capacity generated {simulation.dragPenalty.toFixed(2)} equivalent engineers of
                        communication drag (Brooks&apos;s Law). Net delivery date is computed at{" "}
                        <span className="font-semibold text-white">
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
          </>
        ) : (
          /* Blank Canvas State */
          <div className="rounded-2xl border border-[#454d4b] bg-[#222526] p-8 sm:p-12 text-center space-y-6 shadow-card my-auto">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#3a5a6b]/20 border border-[#3a5a6b]/40 flex items-center justify-center text-[#8ba888]">
              <Sliders className="w-8 h-8" />
            </div>
            <div className="max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                Start Your Decision Simulation
              </h2>
              <p className="text-sm text-white/70 leading-relaxed font-sans">
                No scenarios yet. Build a new scenario or start with a blank baseline to simulate resourcing levers, Brooks&apos;s Law communication drag, and Monte Carlo probability distributions.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNewScenarioName("Scenario 1: Custom Variant");
                  setIsNewScenarioOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3a5a6b] hover:bg-[#2c4356] text-white text-sm font-semibold shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Build New Scenario</span>
              </button>
              <button
                type="button"
                onClick={handleCreateBlankScenario}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e2122] border border-[#454d4b] hover:border-white/40 text-white text-sm font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#8ba888]" />
                <span>Quick Start Blank Baseline</span>
              </button>
            </div>

            {/* 3 Value Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left border-t border-[#454d4b]/60">
              <div className="p-4 rounded-xl bg-[#1e2122] border border-[#454d4b]/60 space-y-1.5">
                <div className="text-xs font-semibold text-[#8ba888] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>15 Uniform Levers</span>
                </div>
                <p className="text-xs text-white/60 leading-normal font-sans">
                  Calibrate story points, headcount, budget cap, deadline weeks, plus team and external factors.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#1e2122] border border-[#454d4b]/60 space-y-1.5">
                <div className="text-xs font-semibold text-[#c98a3e] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Deterministic Scoring</span>
                </div>
                <p className="text-xs text-white/60 leading-normal font-sans">
                  Real-time Brooks&apos;s Law quadratic overhead calculations, schedule feasibility, and burn rate.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#1e2122] border border-[#454d4b]/60 space-y-1.5">
                <div className="text-xs font-semibold text-[#d99a8a] flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5" />
                  <span>Monte Carlo Uncertainty</span>
                </div>
                <p className="text-xs text-white/60 leading-normal font-sans">
                  Run 100 to 2,500 stochastic trials to estimate confidence intervals across delivery timelines.
                </p>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Compare Scenarios Dialog Modal - Landscape Mode */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-5xl xl:max-w-6xl max-h-[88vh] rounded-2xl bg-[#282c2d] border border-[#454d4b] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-white">
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-[#454d4b] flex items-center justify-between bg-[#222526] shrink-0">
              <div className="flex items-center gap-2.5 font-serif text-xl sm:text-2xl font-bold text-white">
                <GitCompare className="w-5 h-5 text-[#8ba888]" />
                <span>Scenario Comparison & Attribution</span>
                <span className="hidden sm:inline-block text-[11px] font-sans font-medium px-2.5 py-0.5 rounded-full bg-[#3a5a6b]/30 text-[#8ba888] border border-[#3a5a6b]/40 ml-2">
                  Landscape Mode
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close comparison modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Landscape 2-Column Body: Values to the Left, Charts to the Right */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Values, Parameter Diffs, Core Metrics, Primary Driver */}
              <div className="lg:col-span-7 space-y-4 font-sans text-xs">
                {/* Table Header Pill */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#222526] font-mono text-[11px] text-white/70 border border-[#454d4b]">
                  <div className="font-semibold text-white">Parameter</div>
                  <div className="font-bold text-white">{baselineScenario?.name ?? "Baseline Plan"}</div>
                  <div className="font-bold text-[#8ba888]">{activeScenario?.name ?? "Active Scenario"} (Live Edits)</div>
                </div>

                {/* Diff rows list */}
                <div className="rounded-xl border border-[#454d4b] bg-[#1e2122] divide-y divide-[#454d4b] max-h-[260px] overflow-y-auto shadow-2xs">
                  {/* Dynamically render all changed or active parameters */}
                  {liveDiff?.inputDiff && Object.keys(liveDiff.inputDiff).length > 0 ? (
                    <>
                      {!Object.values(liveDiff.inputDiff).some((d) => d && d.delta !== 0) && (
                        <div className="py-2.5 px-3 text-center text-white/50 text-[11px] italic bg-[#222526]/50">
                          All constraint lever inputs match baseline values.
                        </div>
                      )}
                      {Object.entries(liveDiff.inputDiff).map(([key, delta]) => {
                        if (!delta) return null;
                        const meta = CONSTRAINT_CATALOGUE.find((c) => c.key === key);
                        const label = meta?.label ?? key;
                        return (
                          <div key={key} className="grid grid-cols-3 gap-3 py-2 px-3 items-center hover:bg-[#282c2d] transition-colors">
                            <span className="text-white/70 font-medium truncate">{label}</span>
                            <span className="font-mono text-white/80">
                              {formatDiffValue(key, delta.from)}
                            </span>
                            <span className="font-mono font-bold text-[#8ba888] flex items-center gap-1">
                              {formatDiffValue(key, delta.to)}
                              {delta.delta !== 0 && (
                                <span
                                  className={`text-[10px] font-normal ${
                                    delta.direction === "increased" ? "text-[#b5502f]" : "text-[#8ba888]"
                                  }`}
                                >
                                  ({delta.delta > 0 ? `+${delta.delta}` : delta.delta})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="py-2.5 px-3 text-center text-white/50 text-[11px] italic">
                      All constraint lever inputs match baseline values.
                    </div>
                  )}

                  {/* Core Output Metrics Comparison */}
                  <div className="grid grid-cols-3 gap-3 py-2 px-3 items-center bg-[#222526]/50 font-medium" suppressHydrationWarning>
                    <span className="text-white font-semibold">Estimated Cost</span>
                    <span className="font-mono text-white/90">
                      {baselineSim?.computed.actualCost !== undefined
                        ? `$${Math.round(baselineSim.computed.actualCost).toLocaleString("en-US")}`
                        : "$200,000"}
                    </span>
                    <span className="font-mono font-bold text-[#8ba888]">
                      {simResult?.computed.actualCost !== undefined
                        ? `$${Math.round(simResult.computed.actualCost).toLocaleString("en-US")}`
                        : "Not evaluated"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-2 px-3 items-center">
                    <span className="text-white font-semibold">Delivery Duration</span>
                    <span className="font-mono text-white/90">
                      {baselineSim?.computed.estimatedTimeWeeks !== undefined
                        ? `${baselineSim.computed.estimatedTimeWeeks.toFixed(1)} wks`
                        : "19.8 wks"}
                    </span>
                    <span className="font-mono font-bold text-[#8ba888]">
                      {simResult?.computed.estimatedTimeWeeks !== undefined
                        ? `${simResult.computed.estimatedTimeWeeks.toFixed(1)} wks`
                        : "Not evaluated"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-2 px-3 items-center bg-[#222526]/50 font-medium">
                    <span className="text-white font-semibold">Risk Score</span>
                    <span className="font-mono text-[#8ba888] font-bold">
                      {baselineSim ? `${baselineSim.riskScore.toFixed(2)} (${baselineSim.feasible ? "Feasible" : "Infeasible"})` : "24.00 (Feasible)"}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        simResult?.feasible ? "text-[#8ba888]" : "text-[#b5502f]"
                      }`}
                    >
                      {simResult
                        ? `${simResult.riskScore.toFixed(2)} (${simResult.feasible ? "Feasible" : "Infeasible"})`
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Primary Isolated Risk Driver summary */}
                <div className="p-3.5 rounded-xl bg-[#222526] border border-[#454d4b] text-[11.5px] space-y-1 shadow-2xs text-white">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8ba888]" />
                    <span>Primary Isolated Risk Driver</span>
                  </div>
                  <p className="text-white/80 leading-relaxed">
                    {liveDiff?.attribution && liveDiff.attribution.length > 0 ? (
                      (() => {
                        const top = liveDiff.attribution[0]!;
                        const meta = CONSTRAINT_CATALOGUE.find((c) => c.key === top.field);
                        const label = meta?.label ?? top.field;
                        const sign = top.isolatedRiskContribution > 0 ? "+" : "";
                        return `Isolated sensitivity analysis shows that changing ${label} drove ${sign}${top.isolatedRiskContribution.toFixed(1)} points of risk shift.`;
                      })()
                    ) : (
                      "No isolated risk driver identified — scenario parameters match baseline."
                    )}
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: Charts to the Right */}
              <div className="lg:col-span-5 space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#454d4b]">
                  <span className="font-bold text-sm text-white">
                    Sensitivity Tornado Analysis
                  </span>
                  <span className="text-[10px] text-white/50 font-mono">
                    (|Δ Risk Score| per Lever)
                  </span>
                </div>

                {/* Sensitivity Tornado Chart Card */}
                {liveDiff && liveDiff.attribution.length > 0 ? (
                  <div className="rounded-xl overflow-hidden shadow-2xs">
                    <SensitivityTornadoChart attribution={liveDiff.attribution} />
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#222526] border border-neutral text-center text-white/50 text-xs space-y-2">
                    <p className="font-semibold text-white">All constraint levers match baseline.</p>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Adjust any parameter (such as Headcount, Deadline, or Budget) on the dashboard to visualize real-time sensitivity and isolated risk shifts here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-[#454d4b] bg-[#222526] flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono text-white/60 hidden sm:inline">
                Deterministic comparison against baseline scenario
              </span>
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="px-5 py-2 rounded-lg bg-[#3a5a6b] text-white text-xs font-semibold hover:bg-[#2c4356] transition-colors shadow-xs ml-auto"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Constraint Catalogue Selection Modal */}
      <ConstraintCatalogueModal
        isOpen={isConstraintModalOpen}
        onClose={() => setIsConstraintModalOpen(false)}
        currentConstraints={scenarioConstraints}
        onApply={handleApplyConstraints}
      />

      {/* Explanation Dialog with Blurred Background */}
      <ExplanationModal
        isOpen={explanationTopic !== null}
        onClose={() => setExplanationTopic(null)}
        topicKey={explanationTopic?.key ?? null}
        topicType={explanationTopic?.type ?? null}
      />

      {/* Save / Build New Scenario Modal */}
      {isNewScenarioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#282c2d] border border-[#454d4b] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#454d4b]">
              <div className="flex items-center gap-2 font-serif text-xl sm:text-2xl font-bold text-white">
                <Plus className="w-5 h-5 text-[#8ba888]" />
                <span>Build New Scenario</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewScenarioOpen(false)}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScenario} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                  Scenario Name *
                </label>
                <input
                  type="text"
                  required
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="e.g. Aggressive Delivery or Baseline Plan"
                  className="w-full px-3 py-2 text-sm bg-[#1e2122] border border-[#454d4b] text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3a5a6b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newScenarioDesc}
                  onChange={(e) => setNewScenarioDesc(e.target.value)}
                  placeholder="What strategic hypothesis does this scenario test?"
                  className="w-full px-3 py-2 text-sm bg-[#1e2122] border border-[#454d4b] text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3a5a6b]"
                />
              </div>

              {/* Natural Language Adjustment Bar */}
              <div className="p-3 rounded-xl bg-[#222526] border border-[#454d4b] space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8ba888]">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Natural Language Lever Adjuster</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nlIntentInput}
                    onChange={(e) => setNlIntentInput(e.target.value)}
                    placeholder="e.g. Cut budget 20% and add 2 engineers"
                    className="flex-1 px-3 py-1.5 text-xs bg-[#1e2122] border border-[#454d4b] text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3a5a6b]"
                  />
                  <button
                    type="button"
                    onClick={handleExtractIntent}
                    disabled={nlIntentLoading || !nlIntentInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#3a5a6b] text-white text-xs font-semibold hover:bg-[#2c4356] disabled:opacity-50 transition-colors shrink-0"
                  >
                    {nlIntentLoading ? "Parsing..." : "Extract Intent"}
                  </button>
                </div>

                {nlExtractedChips && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-white/60">Extracted Modifications:</span>
                    {Object.entries(nlExtractedChips).map(([k, v]: any) => (
                      <span
                        key={k}
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#8ba888]/20 text-[#8ba888] border border-[#8ba888]/30"
                      >
                        {k}: {v.value > 0 ? `+${v.value}` : v.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Levers snapshot preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#1e2122] border border-[#454d4b] font-mono text-[11px] text-white">
                <div>
                  <span className="text-white/50 block text-[9px]">HEADCOUNT</span>
                  <span className="font-bold">{headcount} eng</span>
                </div>
                <div>
                  <span className="text-white/50 block text-[9px]">DEADLINE</span>
                  <span className="font-bold">{deadlineWeeks} wks</span>
                </div>
                <div>
                  <span className="text-white/50 block text-[9px]">BUDGET</span>
                  <span className="font-bold" suppressHydrationWarning>${budget.toLocaleString("en-US")}</span>
                </div>
                <div>
                  <span className="text-white/50 block text-[9px]">SCOPE</span>
                  <span className="font-bold">{scope} pts</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#454d4b]">
                <button
                  type="button"
                  onClick={() => setIsNewScenarioOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#3a5a6b] text-white text-xs font-semibold hover:bg-[#2c4356] transition-colors"
                >
                  Save Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tags Dialog */}
      {isEditTagsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#282c2d] border border-[#454d4b] shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-[#454d4b]">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white">Edit Project Tags</h3>
              <button
                type="button"
                onClick={() => setIsEditTagsOpen(false)}
                className="p-1 rounded text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateTags} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-semibold text-white/70 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingTags}
                  onChange={(e) => setEditingTags(e.target.value)}
                  placeholder="infra, migration, q3"
                  className="w-full px-3 py-2 text-sm bg-[#1e2122] border border-[#454d4b] text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3a5a6b]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditTagsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#3a5a6b] text-white text-xs font-semibold hover:bg-[#2c4356]"
                >
                  Save Tags
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Dialog */}
      {isDeleteProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#282c2d] border border-[#454d4b] shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center gap-2 font-serif text-lg sm:text-xl font-bold text-[#b5502f]">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Project</span>
            </div>
            <p className="text-xs text-white/70">
              Are you sure you want to delete <strong>{activeProject.name}</strong>? This action will permanently remove this project sandbox and cannot be undone.
            </p>
            {deleteError && (
              <div className="p-2.5 rounded-lg bg-[#b5502f]/20 border border-[#b5502f]/40 text-xs text-[#b5502f]">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#454d4b]">
              <button
                type="button"
                onClick={() => setIsDeleteProjectOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                className="px-3 py-1.5 rounded-lg bg-[#b5502f] text-white text-xs font-semibold hover:bg-[#8f3a1e]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Project Dialog (Directly on Second Page!) */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent className="max-w-md bg-[#282c2d] border border-[#454d4b] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Project</DialogTitle>
            <DialogDescription className="text-white/60">
              A project is an isolated sandbox representing an initiative, release, or product scope.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                placeholder="e.g. Platform Re-architecture Q3"
                className="w-full px-3 py-2 text-sm bg-[#1e2122] border border-[#454d4b] text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3a5a6b]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={projectDescInput}
                onChange={(e) => setProjectDescInput(e.target.value)}
                placeholder="What strategic question does this project answer?"
                className="w-full px-3 py-2 text-sm bg-[#1e2122] border border-[#454d4b] text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3a5a6b]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
                Suggested Tags (comma-separated)
              </label>
              <input
                type="text"
                value={projectTagsInput}
                onChange={(e) => setProjectTagsInput(e.target.value)}
                placeholder="platform, infra, q3"
                className="w-full px-3 py-2 text-sm bg-[#1e2122] border border-[#454d4b] text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3a5a6b]"
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#3a5a6b] hover:bg-[#2c4356] rounded-lg shadow-sm transition-colors disabled:opacity-50"
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

export default function ProjectsDashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#282c2d] flex items-center justify-center text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#3a5a6b] border-t-transparent animate-spin" />
            <p className="text-xs text-white/60 font-mono">Loading Kairos Dashboard...</p>
          </div>
        </div>
      }
    >
      <ProjectsDashboardContent />
    </React.Suspense>
  );
}

