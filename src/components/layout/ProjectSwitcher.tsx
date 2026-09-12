"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Folder, Plus, ChevronDown, Check } from "lucide-react";
import { useProjects, useCreateProject } from "../../hooks/useProjects.js";
import { useUiStore } from "../../stores/uiStore.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/Dialog.js";
import { AnimatedButton } from "../ui/AnimatedButton.js";

export const ProjectSwitcher: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: projects = [], isLoading } = useProjects();
  const { activeProjectId, setActiveProjectId } = useUiStore();
  const createProjectMutation = useCreateProject();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleSelect = (id: string) => {
    setActiveProjectId(id);
    setIsOpen(false);
    router.push(`/projects/${id}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const project = await createProjectMutation.mutateAsync({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || null,
      });
      setActiveProjectId(project.id);
      setIsCreateOpen(false);
      setNewProjectName("");
      setNewProjectDesc("");
      router.push(`/projects/${project.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral bg-[#faf8f4] hover:bg-neutral/60 text-ink text-sm font-medium transition-colors"
      >
        <Folder className="w-4 h-4 text-accent" />
        <span className="max-w-[140px] truncate font-serif font-semibold">
          {activeProject ? activeProject.name : "Select Project"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink/60" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-1 w-64 rounded-xl border border-neutral bg-[#faf8f4] shadow-card-hover p-1.5 z-50 text-sm">
            <div className="px-2 py-1.5 text-xs font-semibold text-ink/50 uppercase tracking-wider">
              Projects
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md hover:bg-neutral text-left text-ink transition-colors"
                >
                  <span className="truncate font-medium">{p.name}</span>
                  {p.id === activeProjectId && (
                    <Check className="w-3.5 h-3.5 text-accent" />
                  )}
                </button>
              ))}

              {projects.length === 0 && !isLoading && (
                <div className="px-2.5 py-2 text-xs text-ink/60">
                  No projects yet.
                </div>
              )}
            </div>

            <div className="pt-1 mt-1 border-t border-neutral">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateOpen(true);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-accent hover:bg-neutral font-medium text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Project
              </button>
            </div>
          </div>
        </>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Projects group scenarios and resourcing trade-offs together.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Project Name <span className="text-risk-crit">*</span>
              </label>
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., Q3 Platform Migration"
                className="w-full px-3 py-2 rounded-lg border border-neutral bg-[#faf8f4] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="What strategic initiative does this project evaluate?"
                className="w-full px-3 py-2 rounded-lg border border-neutral bg-[#faf8f4] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            <DialogFooter>
              <AnimatedButton
                type="button"
                variant="secondary"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </AnimatedButton>
              <AnimatedButton
                type="submit"
                variant="primary"
                isLoading={createProjectMutation.isPending}
              >
                Create Project
              </AnimatedButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectSwitcher;
