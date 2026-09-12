"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  Star,
  Archive,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useUiStore } from "../../stores/uiStore.js";
import { useProjects } from "../../hooks/useProjects.js";
import { useScenarios } from "../../hooks/useScenarios.js";
import { cn } from "../../lib/utils.js";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { sidebarCollapsed, activeProjectId } = useUiStore();
  const { data: projects = [] } = useProjects();
  const { data: scenarios = [] } = useScenarios(activeProjectId);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeScenarios = scenarios.filter((s) => !s.is_archived);
  const favoriteScenarios = scenarios.filter((s) => s.is_favorite && !s.is_archived);
  const archivedScenarios = scenarios.filter((s) => s.is_archived);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-neutral bg-[#faf8f4] transition-all duration-300 z-20 select-none",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center h-16 px-5 border-b border-neutral gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-base shadow-sm">
          <Sparkles className="w-4 h-4 text-base" />
        </div>
        {!sidebarCollapsed && (
          <Link href="/projects" className="flex flex-col">
            <span className="font-serif font-bold text-lg text-ink tracking-tight">
              Kairos
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-ink/50">
              Decision Simulation
            </span>
          </Link>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Workspace Home */}
        <div className="space-y-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-accent/10 text-accent font-semibold"
                : "text-ink hover:bg-neutral"
            )}
          >
            <FolderKanban className="w-4 h-4 text-accent shrink-0" />
            {!sidebarCollapsed && <span>All Projects</span>}
          </Link>
        </div>

        {/* Active Project Section */}
        {activeProject && (
          <div className="space-y-2">
            {!sidebarCollapsed && (
              <div className="px-3 text-xs font-semibold uppercase tracking-wider text-ink/40">
                Current Project
              </div>
            )}

            <div className="space-y-0.5">
              <Link
                href={`/projects/${activeProject.id}`}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === `/projects/${activeProject.id}`
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-ink hover:bg-neutral"
                )}
              >
                <div className="flex items-center gap-3 truncate">
                  <Layers className="w-4 h-4 text-accent shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate">{activeProject.name}</span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-neutral text-ink/70">
                    {activeScenarios.length}
                  </span>
                )}
              </Link>

              {/* Favorites filter shortcut */}
              <Link
                href={`/projects/${activeProject.id}?favoritesOnly=true`}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-ink/80 hover:bg-neutral transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-3.5 h-3.5 text-[#d6ad76] shrink-0 fill-[#d6ad76]" />
                  {!sidebarCollapsed && <span>Favorites</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-xs text-ink/50">{favoriteScenarios.length}</span>
                )}
              </Link>

              {/* Archived shortcut */}
              <Link
                href={`/projects/${activeProject.id}?showArchived=true`}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-ink/80 hover:bg-neutral transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Archive className="w-3.5 h-3.5 text-ink/50 shrink-0" />
                  {!sidebarCollapsed && <span>Archived</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-xs text-ink/50">{archivedScenarios.length}</span>
                )}
              </Link>
            </div>
          </div>
        )}

        {/* Active Scenarios Mini-List */}
        {activeProject && !sidebarCollapsed && activeScenarios.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-neutral">
            <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink/40">
              Scenarios
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {activeScenarios.slice(0, 8).map((s) => (
                <Link
                  key={s.id}
                  href={`/projects/${activeProject.id}/scenarios/${s.id}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs truncate transition-colors",
                    pathname.includes(s.id)
                      ? "bg-neutral font-semibold text-accent"
                      : "text-ink/70 hover:bg-neutral hover:text-ink"
                  )}
                >
                  <ChevronRight className="w-3 h-3 text-ink/40 shrink-0" />
                  <span className="truncate">{s.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer System Status */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-neutral text-xs text-ink/50 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-risk-low border border-[#2a4225]/40" />
            <span className="font-medium text-ink/80">Simulation Core v1.0</span>
          </div>
          <span className="text-[10px] text-ink/40">Pure Deterministic + AI</span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
