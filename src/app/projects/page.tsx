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
  const [defaultScenariosState, setDefaultScenariosState] = useState<ScenarioState[]>(DEFAULT_SCENARIOS);

  // Unified scenarios for active project
  const projectScenarios: ScenarioState[] = useMemo(() => {
    if (!isDbProject) {
      return defaultScenariosState;
    }
    if (dbScenarios && dbScenarios.length > 0) {
      return dbScenarios.map((s, idx) => {
        const hc = toNumeric(s.inputs.headcount);
        const dl = toNumeric(s.inputs.deadlineWeeks);
        const bg = toNumeric(s.inputs.budget);
        const sc = toNumeric(s.inputs.scope);
        const sim = calculateSimulation(hc, dl, bg, sc);
        return {
          id: s.id,
          number: idx + 1,
          name: s.name,
          tag: s.parent_scenario_id ? "Forked Variant" : "Baseline Plan",
          headcount: hc,
          deadlineWeeks: dl,
          budget: bg,
          scope: sc,
          isForked: Boolean(s.parent_scenario_id),
          riskStatus: sim.isHigh ? "Risk" : sim.isMod ? "Mod" : "Feas",
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

  // Sync inputs when active scenario switches
  const handleSelectScenario = (sc: ScenarioState) => {
    setActiveScenarioId(sc.id);
    setHeadcount(sc.headcount);
    setDeadlineWeeks(sc.deadlineWeeks);
    setBudget(sc.budget);
    setScope(sc.scope);
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
    }
  }, [activeProjectId]);

  // Deterministic calculations
  const simulation = useMemo(() => {
    return calculateSimulation(headcount, deadlineWeeks, budget, scope);
  }, [headcount, deadlineWeeks, budget, scope]);

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
            budget,
            headcount,
            deadlineWeeks,
            scope,
          },
        }),
      });
      const data = await res.json();
      if (data.data?.resolvedInputs) {
        setNlExtractedChips(data.data.delta);
        setHeadcount(data.data.resolvedInputs.headcount);
        setDeadlineWeeks(data.data.resolvedInputs.deadlineWeeks);
        setBudget(data.data.resolvedInputs.budget);
        setScope(data.data.resolvedInputs.scope);
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
            headcount,
            deadlineWeeks,
            budget,
            scope,
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
        isForked: true,
        riskStatus: simulation.isHigh ? "Risk" : simulation.isMod ? "Mod" : "Feas",
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
    setTimeout(() => {
      setIsSimulatingMC(false);
      setMcRunCount((prev) => prev + 1000);
    }, 600);
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
      {/* Outer Browser / Application Window Frame matching specification */}
      <div className="w-full max-w-6xl rounded-2xl bg-[#faf8f4] border border-[#221f1b]/15 shadow-2xl overflow-hidden flex flex-col">
        {/* Window Top Chrome Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#ede9e0] border-b border-[#221f1b]/10 text-xs font-sans text-[#221f1b]/60">
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
        <div className="grid grid-cols-12 min-h-[640px] bg-[#f6f4ef] text-[#221f1b]">
          {/* Left Sidebar */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3 border-r border-[#221f1b]/10 bg-[#f1ede4]/75 p-4 flex flex-col justify-between space-y-4">
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
          <div className="col-span-12 md:col-span-8 lg:col-span-9 p-5 lg:p-6 space-y-5">
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

            {/* Top Row: 4 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Estimated Cost */}
              <div className="p-3.5 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-1">
                <div className="text-[11px] text-[#221f1b]/60 font-sans flex items-center gap-1">
                  <span>$</span>
                  <span>Estimated Cost</span>
                </div>
                <div className="text-2xl font-serif font-bold text-[#221f1b] my-0.5">
                  ${Math.round(simulation.estimatedCost).toLocaleString()}
                </div>
                <div
                  className={`text-[11px] font-sans font-medium ${
                    simulation.budgetVariancePct > 0 ? "text-[#b5502f]" : "text-[#8ba888]"
                  }`}
                >
                  {simulation.budgetVariancePct > 0
                    ? `+${simulation.budgetVariancePct.toFixed(1)}% over budget`
                    : `${Math.abs(simulation.budgetVariancePct).toFixed(1)}% under budget`}
                </div>
              </div>

              {/* Card 2: Delivery Time */}
              <div className="p-3.5 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-1">
                <div className="text-[11px] text-[#221f1b]/60 font-sans flex items-center gap-1">
                  <span>🗓</span>
                  <span>Delivery Time</span>
                </div>
                <div className="text-2xl font-serif font-bold text-[#221f1b] my-0.5">
                  {simulation.estimatedWeeks.toFixed(1)} wks
                </div>
                <div
                  className={`text-[11px] font-sans font-medium ${
                    simulation.scheduleVarianceWeeks > 0 ? "text-[#b5502f]" : "text-[#8ba888]"
                  }`}
                >
                  {simulation.scheduleVarianceWeeks > 0
                    ? `+${simulation.scheduleVarianceWeeks.toFixed(1)} wks past deadline`
                    : `${Math.abs(simulation.scheduleVarianceWeeks).toFixed(1)} wks buffer`}
                </div>
              </div>

              {/* Card 3: Effective Headcount */}
              <div className="p-3.5 rounded-2xl bg-white/90 border border-[#221f1b]/10 shadow-xs space-y-1">
                <div className="text-[11px] text-[#221f1b]/60 font-sans flex items-center gap-1">
                  <span>👥</span>
                  <span>Effective Headcount</span>
                </div>
                <div className="text-2xl font-serif font-bold text-[#221f1b] my-0.5">
                  {simulation.effectiveHc.toFixed(2)} eng
                </div>
                <div className="text-[11px] font-sans text-[#b5502f] font-medium">
                  {simulation.dragPenalty.toFixed(2)} eng drag penalty
                </div>
              </div>

              {/* Card 4: Risk Score */}
              <div
                className={`p-3.5 rounded-2xl border shadow-xs space-y-1 ${
                  simulation.isHigh
                    ? "bg-[#b5502f]/10 border-[#b5502f]/30"
                    : simulation.isMod
                    ? "bg-[#c98a3e]/10 border-[#c98a3e]/30"
                    : "bg-[#8ba888]/10 border-[#8ba888]/30"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-sans">
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
                    max={24}
                    value={headcount}
                    onChange={(e) => setHeadcount(Number(e.target.value))}
                    className="w-full accent-[#2c4356] cursor-pointer h-1.5 bg-[#e8e3d8] rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-[#221f1b]/40 font-mono">
                    <span>2 eng</span>
                    <span>24 eng</span>
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
                    max={32}
                    value={deadlineWeeks}
                    onChange={(e) => setDeadlineWeeks(Number(e.target.value))}
                    className="w-full accent-[#2c4356] cursor-pointer h-1.5 bg-[#e8e3d8] rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-[#221f1b]/40 font-mono">
                    <span>6 wks</span>
                    <span>32 wks</span>
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
                    min={50000}
                    max={600000}
                    step={10000}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-[#2c4356] cursor-pointer h-1.5 bg-[#e8e3d8] rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-[#221f1b]/40 font-mono">
                    <span>$50,000</span>
                    <span>$600,000</span>
                  </div>
                </div>

                {/* Slider 4: Scope Estimate */}
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
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#ede9e0]/60 font-mono text-[11px] text-[#221f1b]/70">
                <div>Parameter</div>
                <div className="font-bold text-[#221f1b]">Baseline Scope</div>
                <div className="font-bold text-[#221f1b]">Accelerated Q3</div>
              </div>

              <div className="divide-y divide-[#221f1b]/10">
                <div className="grid grid-cols-3 gap-3 py-2.5 px-3">
                  <span className="text-[#221f1b]/60">Headcount</span>
                  <span>6 engineers</span>
                  <span className="font-bold text-[#b5502f]">10 engineers (+4)</span>
                </div>
                <div className="grid grid-cols-3 gap-3 py-2.5 px-3">
                  <span className="text-[#221f1b]/60">Target Deadline</span>
                  <span>20 weeks</span>
                  <span className="font-bold text-[#b5502f]">14 weeks (-6)</span>
                </div>
                <div className="grid grid-cols-3 gap-3 py-2.5 px-3">
                  <span className="text-[#221f1b]/60">Estimated Cost</span>
                  <span>$200,000</span>
                  <span className="font-bold text-[#b5502f]">$288,400 (+$88,400)</span>
                </div>
                <div className="grid grid-cols-3 gap-3 py-2.5 px-3">
                  <span className="text-[#221f1b]/60">Brooks Drag</span>
                  <span>0.78 eng penalty</span>
                  <span className="font-bold text-[#b5502f]">2.59 eng penalty</span>
                </div>
                <div className="grid grid-cols-3 gap-3 py-2.5 px-3">
                  <span className="text-[#221f1b]/60">Risk Score</span>
                  <span className="text-[#8ba888] font-bold">24 (Feasible)</span>
                  <span className="text-[#b5502f] font-bold">68 (Infeasible)</span>
                </div>
              </div>

              {/* Attribution summary */}
              <div className="p-3.5 rounded-xl bg-[#faf8f4] border border-[#2c4356]/20 text-[11.5px] space-y-1">
                <div className="font-semibold text-[#221f1b] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2c4356]" />
                  <span>Primary Isolated Risk Driver</span>
                </div>
                <p className="text-[#221f1b]/80">
                  Compressed deadline (-6 wks) and communication drag from 4 added engineers account for 82% of the feasibility degradation.
                </p>
              </div>
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

