"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderPlus, ArrowRight, Layers, Clock, Tag } from "lucide-react";
import { useProjects, useCreateProject } from "@/hooks/useProjects.js";
import { AnimatedButton } from "@/components/ui/AnimatedButton.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog.js";
import { useUiStore } from "@/stores/uiStore.js";

export default function ProjectsDashboardPage() {
  const router = useRouter();
  const { data: projects = [], isLoading } = useProjects();
  const createProjectMutation = useCreateProject();
  const { setActiveProjectId } = useUiStore();

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

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">
            Decision Workspaces
          </h1>
          <p className="text-sm text-ink/70 mt-1">
            Evaluate engineering trade-offs, resourcing constraints, and uncertainty across projects.
          </p>
        </div>

        <AnimatedButton
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="self-start sm:self-auto"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Project</span>
        </AnimatedButton>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-xl border border-neutral bg-[#faf8f4]/60 animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral bg-[#faf8f4]/80 space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral mx-auto flex items-center justify-center text-ink/50">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-ink">No projects yet</h3>
            <p className="text-xs text-ink/60 mt-1">
              Create your first project workspace to start evaluating scenarios.
            </p>
          </div>
          <AnimatedButton variant="primary" onClick={() => setIsCreateOpen(true)}>
            <FolderPlus className="w-4 h-4" />
            <span>Create First Project</span>
          </AnimatedButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              onClick={() => setActiveProjectId(project.id)}
              className="group flex flex-col justify-between p-6 rounded-2xl border border-neutral bg-[#faf8f4] shadow-card hover:shadow-card-hover hover:border-accent/40 transition-all duration-200"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-lg font-bold text-ink group-hover:text-accent transition-colors">
                    {project.name}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-ink/40 group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>

                {project.description && (
                  <p className="text-xs text-ink/70 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}

                {project.suggested_tags && project.suggested_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {project.suggested_tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral text-ink/70"
                      >
                        <Tag className="w-2.5 h-2.5 opacity-40" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-6 border-t border-neutral/60 flex items-center justify-between text-xs text-ink/50">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
                <span className="font-medium text-accent">Open Scenarios →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              A project groups scenarios and resourcing trade-offs together.
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q3 Platform Re-architecture"
                className="w-full px-3 py-2 rounded-lg border border-neutral bg-[#faf8f4] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What strategic question is this project answering?"
                className="w-full px-3 py-2 rounded-lg border border-neutral bg-[#faf8f4] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Suggested Tags (Optional, comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. platform, infra, q3"
                className="w-full px-3 py-2 rounded-lg border border-neutral bg-[#faf8f4] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
}
