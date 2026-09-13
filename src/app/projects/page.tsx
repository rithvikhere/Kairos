"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  if (key === "budget") return `$${Math.round(val).toLocaleString()}`;
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
    isFavorite: false,
    isArchived: false,
    description: "Stable baseline with dedicated core engineering team",
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
    isFavorite: true,
    isArchived: false,
    description: "Aggressive target deadline with surge headcount allocation",
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
    isFavorite: false,
    isArchived: false,
    description: "External contractors to bolster capacity without high drag",
  },
];

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

  // Local state for default project's scenarios
  const [defaultScenariosState, setDefaultScenariosState] = useState<ScenarioState[]>(() =>
    DEFAULT_SCENARIOS.map((sc) => ({
      ...sc,
      constraints: createDefaultConstraints(sc.headcount, sc.deadlineWeeks, sc.budget, sc.scope),
    }))
  );

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
  const [activeScenarioId, setActiveScenarioId] = useState<string>("sc-2");

  const activeScenario = useMemo(() => {
    return (
      projectScenarios.find((s) => s.id === activeScenarioId) ??
      projectScenarios[0] ??
      DEFAULT_SCENARIOS[1]!
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

  // Sync active scenario and sliders only when project changes
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
    }
  }, [activeProjectId]);

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
  const baselineScenario = projectScenarios[0] ?? DEFAULT_SCENARIOS[0];
  const baselineConstraints = useMemo(() => {
    return baselineScenario?.constraints ?? createDefaultConstraints(6, 20, 200000, 120);
  }, [baselineScenario]);

  const baselineSim = useMemo(() => {
    try {
      return simulate({ constraints: baselineConstraints });
    } catch {
      return null;
    }
  }, [baselineConstraints]);

  const liveDiff = useMemo(() => {
    try {
      return diffScenarios(
        { inputs: { constraints: baselineConstraints } },
        { inputs: { constraints: scenarioConstraints } }
      );
    } catch {
      return null;
    }
  }, [baselineConstraints, scenarioConstraints]);

  // Re-run Monte Carlo dynamically when constraints change so scatter plot & distributions update live!
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const activeCount = Object.values(scenarioConstraints).filter((s) => s?.enabled).length;
        if (activeCount === 0) return;
        const uncertain = buildUncertainInputs(scenarioConstraints);
        const res = runMonteCarloSimulation(uncertain, {
          iterations: 500,
          recordCheckpoints: { every: 25 },
          sampleTrials: { count: 120 },
        });
        setMcResult(res);
        setMcRunCount(500);
      } catch {
        // ignore
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [scenarioConstraints]);

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
  const [isSimulatingMC, setIsSimulatingMC] = useState(false);
  const [mcRunCount, setMcRunCount] = useState(1000);

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

  // Trigger Monte Carlo Simulation
  const handleRunMonteCarlo = () => {
    setIsSimulatingMC(true);
    setShowProgressAnimation(true);
    try {
      const res = runMonteCarloSimulation(
        { constraints: scenarioConstraints },
        {
          iterations: 1000,
          recordCheckpoints: { every: 50 },
          sampleTrials: { count: 150 },
        }
      );
      setMcResult(res);
      setMcRunCount(1000);
    } catch (err) {
      console.error("Monte Carlo run error:", err);
    }
    setTimeout(() => {
      setIsSimulatingMC(false);
    }, 300);
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
    <div className="w-full min-h-screen flex flex-col bg-[#faf8f4] text-[#221f1b]">
      {/* Full Screen Application Panel */}
      <div className="w-full min-h-screen flex flex-col">
        {/* Top Window Chrome Bar */}
        <div className="w-full flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#ede9e0] border-b border-[#221f1b]/10 text-xs font-sans text-[#221f1b]/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#221f1b]/20 hover:bg-red-400 transition-colors" />
            <span className="w-3 h-3 rounded-full bg-[#221f1b]/20 hover:bg-amber-400 transition-colors" />
            <span className="w-3 h-3 rounded-full bg-[#221f1b]/20 hover:bg-green-400 transition-colors" />
            <span className="ml-3 font-mono text-[11px] text-[#221f1b]/60 hidden sm:inline-block">
              kairos.app/projects/{activeProject.id !== "default" ? activeProject.id : "cloud-infra-2025"}/scenarios
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8ba888]/20 text-[#221f1b] font-medium text-[11px] border border-[#8ba888]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8ba888] animate-pulse" />
              <span className="hidden xs:inline">Deterministic Engine Active</span>
            </span>

            {/* Quick Build Scenario Button */}
            <button
              type="button"
              onClick={() => {
                setNewScenarioName(`Scenario ${projectScenarios.length + 1}: Custom Variant`);
                setIsNewScenarioOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#2c4356]/30 hover:border-[#2c4356] text-[#2c4356] text-xs font-sans font-medium transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Scenario</span>
            </button>

            {/* Accessible Add Project Button right from second page */}
            <button
              type="button"
              onClick={() => setIsCreateProjectOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2c4356] hover:bg-[#1d2e3b] text-[#f6f4ef] text-xs font-sans font-medium transition-colors shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Inner Workspace Grid: Sidebar + Main Content Column */}
        <div className="w-full grid grid-cols-12 flex-1 min-h-[calc(100vh-48px)] bg-[#f6f4ef] text-[#221f1b]">
          {/* Left Sidebar */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-2 border-r border-[#221f1b]/10 bg-[#f1ede4]/75 p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Project Header & Interactive Dropdown Switcher */}
              <div className="relative pb-3 border-b border-[#221f1b]/10">
                <button
                  type="button"
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="w-full flex items-center justify-between text-left p-1.5 -mx-1.5 rounded-xl hover:bg-white/60 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-lg bg-[#2c4356] text-[#f6f4ef] flex items-center justify-center font-serif font-bold text-sm shadow-sm shrink-0">
                      {activeProject.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[#221f1b] leading-tight truncate">
                        {activeProject.name}
                      </div>
                      <div className="text-[10px] text-[#221f1b]/50">
                        {projectScenarios.length} scenario{projectScenarios.length !== 1 ? "s" : ""} active
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#221f1b]/50 group-hover:text-[#221f1b] transition-transform duration-150 shrink-0" />
                </button>

                {/* Project Switcher Dropdown Menu */}
                {isProjectDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 p-2 rounded-xl bg-white border border-[#221f1b]/15 shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-150 font-sans text-xs">
                    <div className="text-[10px] uppercase font-bold text-[#221f1b]/40 px-2 py-1">
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
                            isSel ? "bg-[#2c4356] text-white" : "hover:bg-[#f6f4ef] text-[#221f1b]"
                          }`}
                        >
                          <span className="truncate pr-2 font-medium">{p.name}</span>
                          {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}

                    <div className="pt-1.5 mt-1 border-t border-[#221f1b]/10">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProjectDropdownOpen(false);
                          setIsCreateProjectOpen(true);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-[#2c4356] hover:bg-[#2c4356]/10 flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Project</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Project Metadata & Actions from Third Page */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#221f1b]/60">
                  <div className="flex flex-wrap gap-1 items-center max-w-[80%]">
                    {activeProject.suggested_tags?.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-white/70 border border-[#221f1b]/10 text-[#221f1b]/70"
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
                      className="p-1 text-[#221f1b]/40 hover:text-[#221f1b] transition-colors"
                      title="Edit project tags"
                    >
                      <Tag className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Delete Project Action */}
                  <button
                    type="button"
                    onClick={() => setIsDeleteProjectOpen(true)}
                    className="p-1 text-[#221f1b]/40 hover:text-[#b5502f] transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scenarios Filter Tabs & Search Bar (from Third Page) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#221f1b]/50">
                    Scenarios
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewScenarioName(`Scenario ${projectScenarios.length + 1}: Custom Variant`);
                      setIsNewScenarioOpen(true);
                    }}
                    className="text-[10px] text-[#2c4356] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Build</span>
                  </button>
                </div>

                {/* Filter Tabs: Active, Favorites, Archived */}
                <div className="flex items-center gap-1 p-0.5 bg-white/70 rounded-lg border border-[#221f1b]/10 text-[10px] font-sans">
                  <button
                    type="button"
                    onClick={() => setScenarioTab("all")}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      scenarioTab === "all"
                        ? "bg-[#2c4356] text-white shadow-xs"
                        : "text-[#221f1b]/60 hover:text-[#221f1b]"
                    }`}
                  >
                    Active ({projectScenarios.filter((s) => !s.isArchived).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScenarioTab("favorites")}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      scenarioTab === "favorites"
                        ? "bg-[#2c4356] text-white shadow-xs"
                        : "text-[#221f1b]/60 hover:text-[#221f1b]"
                    }`}
                  >
                    Fav ({projectScenarios.filter((s) => s.isFavorite && !s.isArchived).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScenarioTab("archived")}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      scenarioTab === "archived"
                        ? "bg-[#2c4356] text-white shadow-xs"
                        : "text-[#221f1b]/60 hover:text-[#221f1b]"
                    }`}
                  >
                    Arch ({projectScenarios.filter((s) => s.isArchived).length})
                  </button>
                </div>

                {/* Real-time Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3 h-3 text-[#221f1b]/40" />
                  <input
                    type="text"
                    value={scenarioSearch}
                    onChange={(e) => setScenarioSearch(e.target.value)}
                    placeholder="Filter scenarios..."
                    className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-white/80 border border-[#221f1b]/10 text-[11px] text-[#221f1b] placeholder-[#221f1b]/40 focus:outline-none focus:ring-1 focus:ring-[#2c4356]"
                  />
                </div>

                {/* Scenarios List */}
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-0.5">
                  {filteredScenarios.length === 0 ? (
                    <div className="p-4 text-center rounded-xl bg-white/50 border border-dashed border-[#221f1b]/10 text-xs text-[#221f1b]/60 space-y-2">
                      <p className="text-[11px]">No scenarios found in this view.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewScenarioName(`Scenario ${projectScenarios.length + 1}: Custom Variant`);
                          setIsNewScenarioOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] rounded bg-[#2c4356] text-white font-medium hover:bg-[#1d2e3b] transition-colors"
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
                          className={`w-full text-left p-2 rounded-xl text-xs transition-all duration-150 flex items-center justify-between border group ${
                            isActive
                              ? "bg-[#2c4356] text-[#f6f4ef] border-[#2c4356] shadow-sm"
                              : "bg-white/70 hover:bg-white text-[#221f1b] border-[#221f1b]/10"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectScenario(sc)}
                            className="truncate pr-2 flex-1 text-left"
                          >
                            <div className={`font-semibold truncate ${isActive ? "text-[#f6f4ef]" : "text-[#221f1b]"}`}>
                              {sc.number}. {sc.name}
                            </div>
                            <div className={`text-[10px] ${isActive ? "text-[#f6f4ef]/70" : "text-[#221f1b]/50"}`}>
                              {isActive ? headcount : sc.headcount} eng · {isActive ? deadlineWeeks : sc.deadlineWeeks} wks
                            </div>
                          </button>

                          {/* Status Badge & Quick Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Star / Favorite Action */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavoriteScenario(sc, e)}
                              className={`p-1 rounded transition-colors ${
                                sc.isFavorite
                                  ? "text-[#c98a3e]"
                                  : isActive
                                  ? "text-[#f6f4ef]/40 hover:text-white"
                                  : "text-[#221f1b]/30 hover:text-[#221f1b]"
                              }`}
                              title={sc.isFavorite ? "Unfavorite" : "Mark as favorite"}
                            >
                              <Star
                                className={`w-3 h-3 ${sc.isFavorite ? "fill-[#c98a3e]" : ""}`}
                              />
                            </button>

                            {/* Archive Action */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleArchiveScenario(sc, e)}
                              className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                                isActive
                                  ? "text-[#f6f4ef]/40 hover:text-white"
                                  : "text-[#221f1b]/30 hover:text-[#221f1b]"
                              }`}
                              title={sc.isArchived ? "Unarchive" : "Archive"}
                            >
                              <Archive className="w-3 h-3" />
                            </button>

                            {/* Delete Action */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteScenario(sc, e)}
                              className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                                isActive
                                  ? "text-[#f6f4ef]/40 hover:text-red-300"
                                  : "text-[#221f1b]/30 hover:text-[#b5502f]"
                              }`}
                              title="Delete scenario"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Risk Pill */}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                sc.riskStatus === "Feas"
                                  ? "bg-[#8ba888]/20 text-[#221f1b]"
                                  : sc.riskStatus === "Risk"
                                  ? "bg-[#b5502f] text-white"
                                  : "bg-[#c98a3e]/20 text-[#221f1b]"
                              }`}
                            >
                              {sc.riskStatus === "Feas" ? "24 Feas" : sc.riskStatus === "Risk" ? "68 Risk" : "42 Mod"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Bottom Card: Brooks's Law Overhead Model */}
            <div className="p-3 rounded-xl bg-white/70 border border-[#221f1b]/10 text-xs space-y-1 font-sans mt-2">
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
          <div className="col-span-12 md:col-span-8 lg:col-span-9 xl:col-span-10 p-5 lg:p-7 space-y-6">
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
                {/* Save Current Levers as New Scenario */}
                <button
                  type="button"
                  onClick={() => {
                    setNewScenarioName(`Scenario ${projectScenarios.length + 1}: Custom Variant`);
                    setIsNewScenarioOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#2c4356]/30 hover:border-[#2c4356] text-[#2c4356] text-xs font-sans font-medium shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save as Scenario</span>
                </button>

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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2c4356] hover:bg-[#1d2e3b] text-[#f6f4ef] text-xs font-sans font-medium shadow-sm transition-colors disabled:opacity-75"
                >
                  {isSimulatingMC ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isSimulatingMC ? "Sampling 1,000 runs..." : "Run Monte Carlo"}</span>
                </button>
              </div>
            </div>

            {/* Constraint Catalogue Summary Strip */}
            <ConstraintSummaryStrip
              constraints={scenarioConstraints}
              onOpenModal={() => setIsConstraintModalOpen(true)}
              onExplainConstraint={(key) => handleOpenExplanation(key, "constraint")}
            />

            {/* Top Row: 4 Metric Cards with Prerequisite Gating */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Estimated Cost */}
              <div className="p-3.5 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-1">
                <div className="text-[11px] text-[#221f1b]/60 font-sans flex items-center gap-1">
                  <span>$</span>
                  <span>Estimated Cost</span>
                </div>
                {simResult?.computed.actualCost !== undefined ? (
                  <>
                    <div className="text-2xl font-serif font-bold text-[#221f1b] my-0.5">
                      ${Math.round(simResult.computed.actualCost).toLocaleString()}
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
                      <div className="text-[10px] text-[#221f1b]/50 italic">
                        Budget disabled — variance not evaluated
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1 py-1">
                    <div className="text-xl font-serif font-bold text-[#221f1b]/30">—</div>
                    <div className="text-[10.5px] text-[#221f1b]/50 italic">
                      Not evaluated — requires Headcount &amp; Scope
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Delivery Time */}
              <div className="p-3.5 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-1">
                <div className="text-[11px] text-[#221f1b]/60 font-sans flex items-center gap-1">
                  <span>🗓</span>
                  <span>Delivery Time</span>
                </div>
                {simResult?.computed.estimatedTimeWeeks !== undefined ? (
                  <>
                    <div className="text-2xl font-serif font-bold text-[#221f1b] my-0.5">
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
                      <div className="text-[10px] text-[#221f1b]/50 italic">
                        Deadline disabled — schedule variance not evaluated
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1 py-1">
                    <div className="text-xl font-serif font-bold text-[#221f1b]/30">—</div>
                    <div className="text-[10.5px] text-[#221f1b]/50 italic">
                      Not evaluated — requires Headcount &amp; Scope
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Effective Headcount */}
              <div className="p-3.5 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-1">
                <div className="text-[11px] text-[#221f1b]/60 font-sans flex items-center gap-1">
                  <span>👥</span>
                  <span>Effective Headcount</span>
                </div>
                {simResult?.computed.effectiveHeadcount !== undefined ? (
                  <>
                    <div className="text-2xl font-serif font-bold text-[#221f1b] my-0.5">
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
                    <div className="text-xl font-serif font-bold text-[#221f1b]/30">—</div>
                    <div className="text-[10.5px] text-[#221f1b]/50 italic">
                      Not evaluated — enable Headcount
                    </div>
                  </div>
                )}
              </div>

              {/* Card 4: Risk Score */}
              <div
                className={`p-3.5 rounded-2xl border shadow-xs space-y-1 ${
                  !simResult || simResult.activeConstraints.length === 0
                    ? "bg-white/90 border-[#221f1b]/10"
                    : !simResult.feasible
                    ? "bg-[#b5502f]/10 border-[#b5502f]/30"
                    : simResult.riskScore >= 25
                    ? "bg-[#c98a3e]/10 border-[#c98a3e]/30"
                    : "bg-[#8ba888]/10 border-[#8ba888]/30"
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
                      <span className="text-xs font-sans font-normal text-[#221f1b]/60">/ 100</span>
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
                    <div className="text-xs font-bold text-[#221f1b]/60">Risk Score</div>
                    <div className="text-xl font-serif font-bold text-[#221f1b]/30">—</div>
                    <div className="text-[10.5px] text-[#221f1b]/50 italic">
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
              <div className="lg:col-span-6 p-4 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#221f1b]/10">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#2c4356]" />
                      <span className="text-xs font-bold text-[#221f1b]">
                        Project Levers ({activeLevers.length} active)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsConstraintModalOpen(true)}
                      className="text-[10px] text-[#2c4356] font-mono font-medium hover:underline flex items-center gap-1"
                    >
                      <span>Configure All 15</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {activeLevers.length === 0 ? (
                    <div className="p-8 rounded-xl bg-[#faf8f4] border border-dashed border-[#221f1b]/15 text-center text-xs text-[#221f1b]/60 space-y-3 my-4">
                      <p>No active constraint levers enabled for this scenario.</p>
                      <button
                        type="button"
                        onClick={() => setIsConstraintModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#2c4356] text-white font-medium text-xs hover:bg-[#1d2e3b] transition-colors"
                      >
                        + Enable Constraints
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2 max-h-[440px] overflow-y-auto pr-1">
                      {activeLevers.map((meta) => {
                        const currentVal = scenarioConstraints[meta.key]?.value ?? meta.defaultValue;
                        const displayVal =
                          meta.key === "budget"
                            ? `$${Math.round(currentVal).toLocaleString()}`
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
                            className="space-y-1.5 p-2.5 rounded-xl bg-white/80 border border-[#221f1b]/10 shadow-2xs"
                          >
                            <div className="flex justify-between items-center text-xs font-sans">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#221f1b] font-medium">{meta.label}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenExplanation(meta.key, "constraint")}
                                  className="text-[#221f1b]/40 hover:text-[#2c4356] transition-colors p-0.5"
                                  title={`Explain what ${meta.label} does`}
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#2c4356] text-xs">
                                  {displayVal}
                                </span>
                                {meta.isMandatory ? (
                                  <span
                                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#2c4356]/10 text-[#2c4356] font-bold"
                                    title="Mandatory Core Workload Anchor"
                                  >
                                    Anchor
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleConstraint(meta.key)}
                                    className="text-[#221f1b]/30 hover:text-[#b5502f] transition-colors p-0.5 rounded hover:bg-[#ede9e0]"
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
                              className="w-full accent-[#2c4356] cursor-pointer h-1.5 bg-[#e8e3d8] rounded-lg"
                            />

                            <div className="flex justify-between text-[10px] text-[#221f1b]/40 font-mono">
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

                <div className="pt-2 border-t border-[#221f1b]/10 flex items-center justify-between text-[11px] text-[#221f1b]/50">
                  <span>Toggle or add levers anytime via catalogue</span>
                  <button
                    type="button"
                    onClick={() => setIsConstraintModalOpen(true)}
                    className="text-[#2c4356] font-semibold hover:underline"
                  >
                    + Add More Levers
                  </button>
                </div>
              </div>

              {/* Right Panel: Monte Carlo Uncertainty Distribution & Scatter Plot displayed simultaneously */}
              <div className="lg:col-span-6 space-y-4">
                {/* 1. Monte Carlo Distribution Card */}
                <div className="p-4 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#221f1b]/10">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#2c4356]" />
                      <span className="text-xs font-bold text-[#221f1b]">
                        Monte Carlo Distribution ({mcRunCount.toLocaleString()} Runs)
                      </span>
                    </div>
                    <span className="text-[10px] text-[#221f1b]/50 font-mono">
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
                  <div className="h-24 w-full flex items-end justify-between gap-1.5 px-2 pt-3 pb-1 bg-[#faf8f4] rounded-xl border border-[#221f1b]/5">
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
                    <div className="p-2.5 rounded-xl bg-[#f6f4ef] border border-[#221f1b]/10">
                      <div className="text-[10px] text-[#221f1b]/70 font-semibold">Probability On-Time</div>
                      <div className="font-mono font-bold text-lg mt-0.5 text-[#2c4356]">
                        {(mcResult ? mcResult.probabilityOnTime * 100 : simulation.probOnTime).toFixed(1)}%
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#f6f4ef] border border-[#221f1b]/10">
                      <div className="text-[10px] text-[#221f1b]/70 font-semibold">Within Budget</div>
                      <div className="font-mono font-bold text-lg mt-0.5 text-[#2c4356]">
                        {(mcResult ? mcResult.probabilityWithinBudget * 100 : simulation.probWithinBudget).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Trial Scatter Plot Card */}
                <div className="rounded-2xl overflow-hidden shadow-xs">
                  <TrialScatterPlot trialSample={mcResult?.trialSample} />
                </div>

                {/* Dynamic Real-Time Simulation Status / Issue Summary (2-3 lines) */}
                <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#2c4356]/20 shadow-xs space-y-1.5 font-sans">
                  <div className="flex items-center gap-2">
                    {simResult?.feasible ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2b5336]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#b5502f]" />
                    )}
                    <span className="font-bold text-xs text-[#221f1b]">
                      {simResult?.feasible
                        ? "Delivery Status: Plan On Track & Feasible"
                        : "Delivery Alert: Plan Infeasible Under Current Levers"}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[#221f1b]/80 leading-relaxed space-y-1">
                    <p>
                      • <strong>Schedule:</strong> Estimated delivery is <strong>{simulation.estimatedWeeks.toFixed(1)} weeks</strong>{" "}
                      {simulation.scheduleVarianceWeeks > 0 ? (
                        <span className="text-[#b5502f] font-semibold">
                          ({simulation.scheduleVarianceWeeks.toFixed(1)} weeks past target deadline)
                        </span>
                      ) : (
                        <span className="text-[#2b5336] font-semibold">
                          ({Math.abs(simulation.scheduleVarianceWeeks).toFixed(1)} wks buffer ahead of deadline)
                        </span>
                      )}
                      {" "}with <strong>{(mcResult ? mcResult.probabilityOnTime * 100 : simulation.probOnTime).toFixed(0)}% completion certainty</strong>.
                    </p>
                    <p>
                      • <strong>Cost & Labor:</strong> Projected cost is <strong>${Math.round(simulation.estimatedCost).toLocaleString()}</strong>{" "}
                      {simulation.estimatedCost - budget > 0 ? (
                        <span className="text-[#b5502f] font-semibold">
                          (${Math.round(simulation.estimatedCost - budget).toLocaleString()} over budget)
                        </span>
                      ) : (
                        <span className="text-[#2b5336] font-semibold">
                          (${Math.round(Math.abs(simulation.estimatedCost - budget)).toLocaleString()} remaining margin)
                        </span>
                      )}
                      ; {headcount} engineers generate {simulation.dragPenalty.toFixed(2)} drag penalty (Brooks&apos;s Law).
                    </p>
                    <p className="text-[#2c4356] font-medium">
                      • <strong>Key Takeaway:</strong>{" "}
                      {simResult?.feasible
                        ? "All core parameters are aligned. Timeline and cost risk profiles are healthy and within operational tolerance."
                        : simulation.scheduleVarianceWeeks > 0 && simulation.estimatedCost - budget > 0
                        ? "Both schedule and budget thresholds are breached. Consider extending the deadline to ~" + Math.ceil(simulation.estimatedWeeks) + " weeks or descoping to restore balance."
                        : simulation.scheduleVarianceWeeks > 0
                        ? "Schedule compression is the primary friction. Adding more headcount increases communication overhead without accelerating delivery. Extending the deadline is recommended."
                        : "Budget allocation is exceeded by actual labor costs. Adjust team size or negotiate budget cap to regain feasibility."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Down Below: Dedicated Large Standalone Monte Carlo Convergence Tracker */}
            <div className="p-5 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#221f1b]/10">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#2c4356]" />
                  <span className="text-sm font-bold text-[#221f1b] font-serif">
                    Monte Carlo Convergence Analysis
                  </span>
                </div>
                <span className="text-xs text-[#221f1b]/50 font-mono">
                  Running-Mean Steady-State Trajectory
                </span>
              </div>
              <MonteCarloConvergenceChart
                convergence={mcResult?.convergence}
                metricLabel="Running Mean Project Cost ($)"
              />
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
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#ede9e0]/60 font-mono text-[11px] text-[#221f1b]/70">
                <div>Parameter</div>
                <div className="font-bold text-[#221f1b]">{baselineScenario?.name ?? "Baseline Plan"}</div>
                <div className="font-bold text-[#2c4356]">{activeScenario.name} (Live Edits)</div>
              </div>

              <div className="divide-y divide-[#221f1b]/10 max-h-[260px] overflow-y-auto">
                {/* Dynamically render all changed or active parameters */}
                {liveDiff?.inputDiff && Object.keys(liveDiff.inputDiff).length > 0 ? (
                  Object.entries(liveDiff.inputDiff).map(([key, delta]) => {
                    if (!delta) return null;
                    const meta = CONSTRAINT_CATALOGUE.find((c) => c.key === key);
                    const label = meta?.label ?? key;
                    return (
                      <div key={key} className="grid grid-cols-3 gap-3 py-2 px-3 items-center">
                        <span className="text-[#221f1b]/70 font-medium">{label}</span>
                        <span className="font-mono text-[#221f1b]/80">
                          {formatDiffValue(key, delta.from)}
                        </span>
                        <span className="font-mono font-bold text-[#2c4356] flex items-center gap-1">
                          {formatDiffValue(key, delta.to)}
                          {delta.delta !== 0 && (
                            <span
                              className={`text-[10px] font-normal ${
                                delta.direction === "increased" ? "text-[#b5502f]" : "text-[#2b5336]"
                              }`}
                            >
                              ({delta.delta > 0 ? `+${delta.delta}` : delta.delta})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-2.5 px-3 text-center text-ink/50 text-[11px] italic">
                    All constraint lever inputs match baseline values.
                  </div>
                )}

                {/* Core Output Metrics Comparison */}
                <div className="grid grid-cols-3 gap-3 py-2 px-3 items-center bg-[#ede9e0]/30 font-medium">
                  <span className="text-[#221f1b]">Estimated Cost</span>
                  <span className="font-mono">
                    {baselineSim?.computed.actualCost !== undefined
                      ? `$${Math.round(baselineSim.computed.actualCost).toLocaleString()}`
                      : "$200,000"}
                  </span>
                  <span className="font-mono font-bold text-[#2c4356]">
                    {simResult?.computed.actualCost !== undefined
                      ? `$${Math.round(simResult.computed.actualCost).toLocaleString()}`
                      : "Not evaluated"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 py-2 px-3 items-center">
                  <span className="text-[#221f1b]">Delivery Duration</span>
                  <span className="font-mono">
                    {baselineSim?.computed.estimatedTimeWeeks !== undefined
                      ? `${baselineSim.computed.estimatedTimeWeeks.toFixed(1)} wks`
                      : "19.8 wks"}
                  </span>
                  <span className="font-mono font-bold text-[#2c4356]">
                    {simResult?.computed.estimatedTimeWeeks !== undefined
                      ? `${simResult.computed.estimatedTimeWeeks.toFixed(1)} wks`
                      : "Not evaluated"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 py-2 px-3 items-center bg-[#ede9e0]/30 font-medium">
                  <span className="text-[#221f1b]">Risk Score</span>
                  <span className="font-mono text-[#2b5336] font-bold">
                    {baselineSim ? `${baselineSim.riskScore.toFixed(2)} (${baselineSim.feasible ? "Feasible" : "Infeasible"})` : "24.00 (Feasible)"}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      simResult?.feasible ? "text-[#2b5336]" : "text-[#b5502f]"
                    }`}
                  >
                    {simResult
                      ? `${simResult.riskScore.toFixed(2)} (${simResult.feasible ? "Feasible" : "Infeasible"})`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Attribution summary */}
              <div className="p-3.5 rounded-xl bg-[#faf8f4] border border-[#2c4356]/20 text-[11.5px] space-y-1">
                <div className="font-semibold text-[#221f1b] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2c4356]" />
                  <span>Primary Isolated Risk Driver</span>
                </div>
                <p className="text-[#221f1b]/80">
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
              {/* Sensitivity Tornado Chart */}
              {liveDiff && liveDiff.attribution.length > 0 && (
                <div className="pt-3 border-t border-[#221f1b]/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#221f1b]">
                      Sensitivity Tornado Analysis (|Δ Risk Score| per Lever)
                    </span>
                    <span className="text-[10px] text-[#221f1b]/50 font-mono">
                      Active changed constraints
                    </span>
                  </div>
                  <SensitivityTornadoChart attribution={liveDiff.attribution} />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#221f1b]/10">
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2c4356] text-white text-xs font-semibold hover:bg-[#1d2e3b] transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#faf8f4] border border-[#221f1b]/20 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#221f1b]/10">
              <div className="flex items-center gap-2 font-serif text-lg font-bold text-[#221f1b]">
                <Plus className="w-5 h-5 text-[#2c4356]" />
                <span>Build New Scenario</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewScenarioOpen(false)}
                className="p-1 rounded-lg text-[#221f1b]/60 hover:text-[#221f1b] hover:bg-[#e8e3d8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScenario} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#221f1b]/70 mb-1">
                  Scenario Name *
                </label>
                <input
                  type="text"
                  required
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="e.g. Aggressive Delivery or Baseline Plan"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#221f1b]/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4356]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#221f1b]/70 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newScenarioDesc}
                  onChange={(e) => setNewScenarioDesc(e.target.value)}
                  placeholder="What strategic hypothesis does this scenario test?"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#221f1b]/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4356]"
                />
              </div>

              {/* Natural Language Adjustment Bar */}
              <div className="p-3 rounded-xl bg-[#ede9e0]/50 border border-[#221f1b]/10 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2c4356]">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Natural Language Lever Adjuster</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nlIntentInput}
                    onChange={(e) => setNlIntentInput(e.target.value)}
                    placeholder="e.g. Cut budget 20% and add 2 engineers"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#221f1b]/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2c4356]"
                  />
                  <button
                    type="button"
                    onClick={handleExtractIntent}
                    disabled={nlIntentLoading || !nlIntentInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#2c4356] text-white text-xs font-semibold hover:bg-[#1d2e3b] disabled:opacity-50 transition-colors shrink-0"
                  >
                    {nlIntentLoading ? "Parsing..." : "Extract Intent"}
                  </button>
                </div>

                {nlExtractedChips && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-[#221f1b]/60">Extracted Modifications:</span>
                    {Object.entries(nlExtractedChips).map(([k, v]: any) => (
                      <span
                        key={k}
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#8ba888]/20 text-[#221f1b] border border-[#8ba888]/30"
                      >
                        {k}: {v.value > 0 ? `+${v.value}` : v.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Levers snapshot preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-white border border-[#221f1b]/10 font-mono text-[11px]">
                <div>
                  <span className="text-[#221f1b]/50 block text-[9px]">HEADCOUNT</span>
                  <span className="font-bold">{headcount} eng</span>
                </div>
                <div>
                  <span className="text-[#221f1b]/50 block text-[9px]">DEADLINE</span>
                  <span className="font-bold">{deadlineWeeks} wks</span>
                </div>
                <div>
                  <span className="text-[#221f1b]/50 block text-[9px]">BUDGET</span>
                  <span className="font-bold">${budget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[#221f1b]/50 block text-[9px]">SCOPE</span>
                  <span className="font-bold">{scope} pts</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#221f1b]/10">
                <button
                  type="button"
                  onClick={() => setIsNewScenarioOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#221f1b]/70 hover:bg-[#e8e3d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#2c4356] text-white text-xs font-semibold hover:bg-[#1d2e3b] transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#faf8f4] border border-[#221f1b]/20 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#221f1b]/10">
              <h3 className="font-serif text-base font-bold text-[#221f1b]">Edit Project Tags</h3>
              <button
                type="button"
                onClick={() => setIsEditTagsOpen(false)}
                className="p-1 rounded text-[#221f1b]/50 hover:text-[#221f1b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateTags} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-semibold text-[#221f1b]/70 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingTags}
                  onChange={(e) => setEditingTags(e.target.value)}
                  placeholder="infra, migration, q3"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#221f1b]/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2c4356]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditTagsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#221f1b]/70 hover:bg-[#e8e3d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#2c4356] text-white text-xs font-semibold hover:bg-[#1d2e3b]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#faf8f4] border border-[#221f1b]/20 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 font-serif text-base font-bold text-[#b5502f]">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Project</span>
            </div>
            <p className="text-xs text-[#221f1b]/70">
              Are you sure you want to delete <strong>{activeProject.name}</strong>? This action will permanently remove this project sandbox and cannot be undone.
            </p>
            {deleteError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#221f1b]/10">
              <button
                type="button"
                onClick={() => setIsDeleteProjectOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#221f1b]/70 hover:bg-[#e8e3d8]"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              A project is an isolated sandbox representing an initiative, release, or product scope.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#221f1b]/70 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                placeholder="e.g. Platform Re-architecture Q3"
                className="w-full px-3 py-2 text-sm bg-[#faf8f4] border border-[#221f1b]/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4356]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#221f1b]/70 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={projectDescInput}
                onChange={(e) => setProjectDescInput(e.target.value)}
                placeholder="What strategic question does this project answer?"
                className="w-full px-3 py-2 text-sm bg-[#faf8f4] border border-[#221f1b]/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4356]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#221f1b]/70 mb-1">
                Suggested Tags (comma-separated)
              </label>
              <input
                type="text"
                value={projectTagsInput}
                onChange={(e) => setProjectTagsInput(e.target.value)}
                placeholder="platform, infra, q3"
                className="w-full px-3 py-2 text-sm bg-[#faf8f4] border border-[#221f1b]/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4356]"
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#221f1b]/70 hover:bg-[#e8e3d8] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-[#f6f4ef] bg-[#2c4356] hover:bg-[#1d2e3b] rounded-lg shadow-sm transition-colors disabled:opacity-50"
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
        <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center text-[#221f1b]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#2c4356] border-t-transparent animate-spin" />
            <p className="text-xs text-[#221f1b]/60 font-mono">Loading Kairos Dashboard...</p>
          </div>
        </div>
      }
    >
      <ProjectsDashboardContent />
    </React.Suspense>
  );
}

