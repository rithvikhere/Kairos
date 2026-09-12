"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, GitCompare, Menu } from "lucide-react";
import { ProjectSwitcher } from "./ProjectSwitcher.js";
import { AnimatedButton } from "../ui/AnimatedButton.js";
import { useUiStore } from "../../stores/uiStore.js";

export const TopBar: React.FC = () => {
  const router = useRouter();
  const { activeProjectId, toggleSidebar, compareScenarioIds, clearCompare } = useUiStore();
  const [searchQuery, setSearchQuery] = useState("");

  const [compareA, compareB] = compareScenarioIds;
  const canCompare = Boolean(compareA && compareB);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !activeProjectId) return;
    router.push(`/projects/${activeProjectId}?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-neutral bg-[#f5f2ec]/90 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg border border-neutral hover:bg-neutral text-ink transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <ProjectSwitcher />
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-ink/40" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scenarios..."
            className="w-56 pl-9 pr-3 py-1.5 rounded-lg border border-neutral bg-[#faf8f4] text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </form>

        {/* Comparison Indicator / Button */}
        {(compareA || compareB) && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-accent/30 bg-accent/10 text-xs">
            <GitCompare className="w-3.5 h-3.5 text-accent" />
            <span className="font-semibold text-accent">
              {compareA && compareB ? "2 selected" : "1 selected"}
            </span>
            {canCompare ? (
              <Link
                href={`/projects/${activeProjectId}/compare?a=${compareA}&b=${compareB}`}
                className="ml-1.5 font-bold text-accent underline hover:opacity-80"
              >
                Compare
              </Link>
            ) : null}
            <button
              onClick={clearCompare}
              className="ml-1 text-ink/50 hover:text-ink"
              title="Clear selection"
            >
              ✕
            </button>
          </div>
        )}

        {/* New Scenario button */}
        {activeProjectId && (
          <Link href={`/projects/${activeProjectId}/scenarios/new`}>
            <AnimatedButton size="sm" variant="primary">
              <Plus className="w-3.5 h-3.5" />
              <span>New Scenario</span>
            </AnimatedButton>
          </Link>
        )}
      </div>
    </header>
  );
};

export default TopBar;
