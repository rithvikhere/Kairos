"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  GitCompare,
  Trash2,
  Tag,
  Star,
  Archive,
  Layers,
  Search,
} from "lucide-react";
import { useProject, useDeleteProject, useUpdateProjectTags } from "../../../hooks/useProjects.js";
import { useScenarios } from "../../../hooks/useScenarios.js";
import { ScenarioCard } from "../../../components/scenario/ScenarioCard.js";
import { AnimatedButton } from "../../../components/ui/AnimatedButton.js";
import { useUiStore } from "../../../stores/uiStore.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/Dialog.js";

export default function ProjectScenariosPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: scenarios = [], isLoading: scenariosLoading } = useScenarios(projectId);
  const deleteProjectMutation = useDeleteProject();
  const updateTagsMutation = useUpdateProjectTags();
  const { setActiveProjectId, compareScenarioIds, clearCompare } = useUiStore();

  const [activeTab, setActiveTab] = useState<"all" | "favorites" | "archived">("all");
  const [filterQuery, setFilterQuery] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isEditTagsOpen, setIsEditTagsOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    setActiveProjectId(projectId);
  }, [projectId, setActiveProjectId]);

  useEffect(() => {
    if (searchParams.get("favoritesOnly")) {
      setActiveTab("favorites");
    } else if (searchParams.get("showArchived")) {
      setActiveTab("archived");
    }
    const q = searchParams.get("q");
    if (q) setFilterQuery(q);
  }, [searchParams]);

  useEffect(() => {
    if (project?.suggested_tags) {
      setTagsInput(project.suggested_tags.join(", "));
    }
  }, [project]);

  const [compareA, compareB] = compareScenarioIds;

  // Filter scenarios by active tab and search query
  const filteredScenarios = scenarios.filter((s) => {
    if (activeTab === "all" && s.is_archived) return false;
    if (activeTab === "favorites" && (!s.is_favorite || s.is_archived)) return false;
    if (activeTab === "archived" && !s.is_archived) return false;

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q);
      const matchTag = s.tags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchTag;
    }
    return true;
  });

  const handleDeleteProject = async () => {
    setDeleteError(null);
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      setIsDeleteOpen(false);
      router.push("/");
    } catch (err: any) {
      if (err.code === "PROJECT_NOT_EMPTY") {
        setDeleteError("This project still contains scenarios. Archive or delete them first.");
      } else {
        setDeleteError(err.message || "Failed to delete project.");
      }
    }
  };

  const handleUpdateTags = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await updateTagsMutation.mutateAsync({ id: projectId, suggestedTags: tags });
    setIsEditTagsOpen(false);
  };

  if (projectLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-neutral rounded" />
        <div className="h-6 w-96 bg-neutral/60 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-neutral/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center rounded-2xl border border-neutral bg-[#faf8f4]">
        <h3 className="font-serif text-lg font-bold text-ink">Project Not Found</h3>
        <p className="text-xs text-ink/60 mt-1">
          The requested project workspace does not exist or has been removed.
        </p>
        <Link href="/" className="inline-block mt-4">
          <AnimatedButton variant="primary">Return to Projects</AnimatedButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-neutral">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">
              {project.name}
            </h1>
            <button
              onClick={() => setIsEditTagsOpen(true)}
              className="p-1 rounded text-ink/40 hover:text-ink hover:bg-neutral"
              title="Edit project tags"
            >
              <Tag className="w-3.5 h-3.5" />
            </button>
          </div>

          {project.description && (
            <p className="text-sm text-ink/70 max-w-2xl leading-relaxed">
              {project.description}
            </p>
          )}

          {project.suggested_tags && project.suggested_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {project.suggested_tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs bg-neutral text-ink/70"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="p-2 rounded-lg border border-neutral hover:bg-risk-crit/20 hover:border-risk-crit text-ink/60 hover:text-[#4f1e14] transition-colors"
            title="Delete project"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <Link href={`/projects/${projectId}/scenarios/new`}>
            <AnimatedButton variant="primary">
              <Plus className="w-4 h-4" />
              <span>New Scenario</span>
            </AnimatedButton>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-neutral/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "all"
                ? "bg-[#faf8f4] text-ink shadow-sm"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active ({scenarios.filter((s) => !s.is_archived).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "favorites"
                ? "bg-[#faf8f4] text-ink shadow-sm"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            <Star className="w-3.5 h-3.5 text-[#d6ad76] fill-[#d6ad76]" />
            <span>Favorites ({scenarios.filter((s) => s.is_favorite && !s.is_archived).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("archived")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "archived"
                ? "bg-[#faf8f4] text-ink shadow-sm"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived ({scenarios.filter((s) => s.is_archived).length})</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink/40" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter scenarios..."
            className="w-64 pl-9 pr-3 py-1.5 rounded-xl border border-neutral bg-[#faf8f4] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Scenarios Grid */}
      {scenariosLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-neutral/40 animate-pulse" />
          ))}
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral bg-[#faf8f4]/60 space-y-4">
          <div className="w-10 h-10 rounded-full bg-neutral mx-auto flex items-center justify-center text-ink/40">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-ink">No scenarios found</h3>
            <p className="text-xs text-ink/60 mt-1">
              {filterQuery
                ? "No scenarios match your search criteria."
                : activeTab === "archived"
                ? "No scenarios have been archived."
                : "Build your first scenario to test project constraints."}
            </p>
          </div>
          {activeTab !== "archived" && !filterQuery && (
            <Link href={`/projects/${projectId}/scenarios/new`}>
              <AnimatedButton variant="primary" size="sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Build New Scenario</span>
              </AnimatedButton>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              projectId={projectId}
            />
          ))}
        </div>
      )}

      {/* Floating Pairwise Comparison Bar */}
      {(compareA || compareB) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-3 rounded-2xl border border-neutral bg-[#faf8f4] shadow-modal text-ink text-sm">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-accent" />
            <span className="font-semibold">
              Compare Mode ({[compareA, compareB].filter(Boolean).length}/2)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {compareA && compareB ? (
              <Link href={`/projects/${projectId}/compare?a=${compareA}&b=${compareB}`}>
                <AnimatedButton variant="primary" size="sm">
                  Run Pairwise Diff
                </AnimatedButton>
              </Link>
            ) : (
              <span className="text-xs text-ink/50 italic">
                Select one more scenario to compare
              </span>
            )}

            <button
              onClick={clearCompare}
              className="text-xs text-ink/60 hover:text-ink underline ml-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &apos;{project.name}&apos;?
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="p-3 rounded-lg bg-risk-crit/20 border border-[#bf7765] text-xs text-[#4f1e14]">
              {deleteError}
            </div>
          )}

          <p className="text-xs text-ink/70">
            Projects can only be deleted if they contain no scenarios. If scenarios exist,
            archive or delete them first.
          </p>

          <DialogFooter>
            <AnimatedButton
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              type="button"
              variant="destructive"
              isLoading={deleteProjectMutation.isPending}
              onClick={handleDeleteProject}
            >
              Delete Project
            </AnimatedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tags Modal */}
      <Dialog open={isEditTagsOpen} onOpenChange={setIsEditTagsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Tags</DialogTitle>
            <DialogDescription>
              Update suggested tag taxonomy for this workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateTags} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Suggested Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. platform, infra, core"
                className="w-full px-3 py-2 rounded-lg border border-neutral bg-[#faf8f4] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <DialogFooter>
              <AnimatedButton
                type="button"
                variant="secondary"
                onClick={() => setIsEditTagsOpen(false)}
              >
                Cancel
              </AnimatedButton>
              <AnimatedButton
                type="submit"
                variant="primary"
                isLoading={updateTagsMutation.isPending}
              >
                Save Tags
              </AnimatedButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
