import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runMonteCarloSimulation } from "../../domain/monteCarlo.js";
import { simulate } from "../../domain/simulation.js";
import type { UncertainScenarioInputs } from "../../domain/monteCarlo.js";
import {
  PG_RETRY_COOLDOWN_MS,
  _pgConnector,
  _resetInMemoryDb,
  _resetPgConnectionState,
  createProject,
  deleteProject,
  deleteScenario,
  ensureSchema,
  getChildren,
  getPgPool,
  getProject,
  getScenario,
  listProjects,
  listScenariosByProject,
  saveScenario,
  searchScenarios,
  setArchived,
  toggleFavorite,
  updateProjectTagSuggestions,
  updateScenario,
} from "../db.js";
import { ProjectNotEmptyError } from "../schema.js";

describe("Phase 3 Data Layer (db.ts in-memory mode)", () => {
  beforeEach(() => {
    _resetInMemoryDb();
  });

  const sampleInputs: UncertainScenarioInputs = {
    budget: 1_200_000,
    headcount: 10,
    deadlineWeeks: 48,
    scope: 480,
  };

  describe("ensureSchema", () => {
    it("is safe to call multiple times without error (idempotent)", async () => {
      await expect(ensureSchema()).resolves.toBeUndefined();
      await expect(ensureSchema()).resolves.toBeUndefined();
    });
  });

  describe("Projects CRUD", () => {
    it("creates, retrieves, and lists projects", async () => {
      const p1 = await createProject({
        name: "Alpha Migration",
        description: "Core platform migration",
        suggested_tags: ["infra", "q3"],
      });

      expect(p1.id).toBeDefined();
      expect(p1.name).toBe("Alpha Migration");
      expect(p1.suggested_tags).toEqual(["infra", "q3"]);

      const fetched = await getProject(p1.id);
      expect(fetched).toEqual(p1);

      const all = await listProjects();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(p1);
    });

    it("project delete is blocked on non-empty, succeeds when empty", async () => {
      const project = await createProject({ name: "Protected Project" });
      await saveScenario({
        projectId: project.id,
        name: "Scenario 1",
        inputs: sampleInputs,
      });

      // Blocked while scenario exists
      await expect(deleteProject(project.id)).rejects.toThrow(ProjectNotEmptyError);

      // Verify project still exists
      const stillThere = await getProject(project.id);
      expect(stillThere).not.toBeNull();

      // Delete scenario first, then delete project succeeds
      const scenarios = await listScenariosByProject(project.id);
      await deleteScenario(scenarios[0]!.id);

      const deleteResult = await deleteProject(project.id);
      expect(deleteResult).toBe(true);

      const gone = await getProject(project.id);
      expect(gone).toBeNull();
    });

    it("maintains curated tag suggestions independently from scenario tags", async () => {
      const project = await createProject({
        name: "Curated Tags Test",
        suggested_tags: ["frontend", "backend"],
      });

      // Adding a scenario with novel tags
      await saveScenario({
        projectId: project.id,
        name: "Scenario With Novel Tags",
        tags: ["ai", "cloud-native", "novel-tag"],
        inputs: sampleInputs,
      });

      // Project suggested_tags must remain strictly untouched
      const pAfter = await getProject(project.id);
      expect(pAfter?.suggested_tags).toEqual(["frontend", "backend"]);

      // Only explicit updateProjectTagSuggestions changes the list
      await updateProjectTagSuggestions(project.id, ["frontend", "backend", "mobile"]);
      const pUpdated = await getProject(project.id);
      expect(pUpdated?.suggested_tags).toEqual(["frontend", "backend", "mobile"]);
    });
  });

  describe("Scenarios CRUD & Relationships", () => {
    it("round-trip save -> get produces deep equality", async () => {
      const project = await createProject({ name: "Round Trip Test" });
      const deterministicOutput = simulate({
        budget: 1_200_000,
        headcount: 10,
        deadlineWeeks: 48,
        scope: 480,
      });

      const saved = await saveScenario({
        projectId: project.id,
        name: "Baseline Roundtrip",
        description: "Testing exact retrieval",
        tags: ["baseline", "q4"],
        inputs: sampleInputs,
        deterministicOutput,
      });

      const loaded = await getScenario(saved.id);
      expect(loaded).toEqual(saved);
      expect(loaded?.deterministic_output).toEqual(deterministicOutput);
    });

    it("enforces project isolation (Project A scenarios never leak into Project B)", async () => {
      const projA = await createProject({ name: "Project A" });
      const projB = await createProject({ name: "Project B" });

      await saveScenario({
        projectId: projA.id,
        name: "A1",
        inputs: sampleInputs,
      });
      await saveScenario({
        projectId: projA.id,
        name: "A2",
        inputs: sampleInputs,
      });
      await saveScenario({
        projectId: projB.id,
        name: "B1",
        inputs: sampleInputs,
      });

      const listA = await listScenariosByProject(projA.id);
      const listB = await listScenariosByProject(projB.id);

      expect(listA).toHaveLength(2);
      expect(listA.every((s) => s.project_id === projA.id)).toBe(true);

      expect(listB).toHaveLength(1);
      expect(listB[0]?.name).toBe("B1");
      expect(listB[0]?.project_id).toBe(projB.id);
    });

    it("tracks parent/child relationships via getChildren", async () => {
      const project = await createProject({ name: "Forking Test" });

      const parent = await saveScenario({
        projectId: project.id,
        name: "Parent Plan",
        inputs: sampleInputs,
      });

      const child1 = await saveScenario({
        projectId: project.id,
        parentScenarioId: parent.id,
        name: "Variant 1 (+2 headcount)",
        inputs: { ...sampleInputs, headcount: 12 },
      });

      const child2 = await saveScenario({
        projectId: project.id,
        parentScenarioId: parent.id,
        name: "Variant 2 (+budget)",
        inputs: { ...sampleInputs, budget: 1_500_000 },
      });

      const children = await getChildren(parent.id);
      expect(children).toHaveLength(2);
      const childIds = children.map((c) => c.id);
      expect(childIds).toContain(child1.id);
      expect(childIds).toContain(child2.id);
    });

    it("deleting a parent scenario leaves children intact with parent_scenario_id null", async () => {
      const project = await createProject({ name: "Orphan Prevention Test" });

      const parent = await saveScenario({
        projectId: project.id,
        name: "Parent To Delete",
        inputs: sampleInputs,
      });

      const child = await saveScenario({
        projectId: project.id,
        parentScenarioId: parent.id,
        name: "Child Scenario",
        inputs: sampleInputs,
      });

      // Hard delete parent
      await deleteScenario(parent.id);

      // Parent is gone
      const parentFetched = await getScenario(parent.id);
      expect(parentFetched).toBeNull();

      // Child is still completely intact, with parent_scenario_id set to null
      const childFetched = await getScenario(child.id);
      expect(childFetched).not.toBeNull();
      expect(childFetched?.parent_scenario_id).toBeNull();
      expect(childFetched?.name).toBe("Child Scenario");
    });

    it("re-running Monte Carlo creates a new scenario and leaves original monte_carlo_output untouched", async () => {
      const project = await createProject({ name: "Monte Carlo Re-run Test" });

      const initialMC = runMonteCarloSimulation(sampleInputs, { iterations: 100, seed: 1 });
      const original = await saveScenario({
        projectId: project.id,
        name: "Original MC",
        inputs: sampleInputs,
        monteCarloOutput: initialMC,
      });

      // Re-run with different seed/iterations, saved as child
      const rerunMC = runMonteCarloSimulation(sampleInputs, { iterations: 500, seed: 99 });
      const rerun = await saveScenario({
        projectId: project.id,
        parentScenarioId: original.id,
        name: "Original MC (re-run 500 iterations)",
        inputs: sampleInputs,
        monteCarloOutput: rerunMC,
      });

      // Original remains untouched
      const originalLoaded = await getScenario(original.id);
      expect(originalLoaded?.monte_carlo_output?.iterationsRequested).toBe(100);

      // Re-run is a distinct row referencing parent
      expect(rerun.id).not.toBe(original.id);
      expect(rerun.parent_scenario_id).toBe(original.id);
      expect(rerun.monte_carlo_output?.iterationsRequested).toBe(500);
    });

    it("toggles favorite status returning to original state after two toggles", async () => {
      const project = await createProject({ name: "Favorite Test" });
      const scenario = await saveScenario({
        projectId: project.id,
        name: "Starred Item",
        inputs: sampleInputs,
        isFavorite: false,
      });
      expect(scenario.is_favorite).toBe(false);

      const toggled1 = await toggleFavorite(scenario.id);
      expect(toggled1?.is_favorite).toBe(true);

      const toggled2 = await toggleFavorite(scenario.id);
      expect(toggled2?.is_favorite).toBe(false);
    });

    it("excludes archived scenarios by default, includes with includeArchived: true", async () => {
      const project = await createProject({ name: "Archive Test" });
      const active = await saveScenario({
        projectId: project.id,
        name: "Active Scenario",
        inputs: sampleInputs,
      });
      const toArchive = await saveScenario({
        projectId: project.id,
        name: "Archived Scenario",
        inputs: sampleInputs,
      });

      await setArchived(toArchive.id, true);

      const defaultList = await listScenariosByProject(project.id);
      expect(defaultList).toHaveLength(1);
      expect(defaultList[0]?.id).toBe(active.id);

      const withArchived = await listScenariosByProject(project.id, { includeArchived: true });
      expect(withArchived).toHaveLength(2);

      // Distinct hard delete vs soft delete
      await deleteScenario(toArchive.id);
      const afterHardDelete = await listScenariosByProject(project.id, { includeArchived: true });
      expect(afterHardDelete).toHaveLength(1);
    });

    it("rejects saving a scenario if project does not exist (no orphans)", async () => {
      await expect(
        saveScenario({
          projectId: "non-existent-uuid",
          name: "Orphan",
          inputs: sampleInputs,
        })
      ).rejects.toThrow(/Project 'non-existent-uuid' not found/);
    });
  });

  describe("searchScenarios (tabular and edge-case testing)", () => {
    let projectId: string;

    beforeEach(async () => {
      const proj = await createProject({ name: "Search Lab" });
      projectId = proj.id;

      await saveScenario({
        projectId,
        name: "Budget Optimization Plan",
        description: "Aggressive reduction for enterprise deployment",
        tags: ["finance", "enterprise", "q4"],
        inputs: sampleInputs,
      });

      await saveScenario({
        projectId,
        name: "Headcount Ramp",
        description: "Scaling team to 15 engineers",
        tags: ["staffing", "enterprise"],
        inputs: sampleInputs,
      });

      await saveScenario({
        projectId,
        name: "Archived Old Plan",
        description: "Legacy deployment strategy",
        tags: ["finance", "legacy"],
        inputs: sampleInputs,
        isArchived: true,
      });
    });

    const searchCases: Array<[string, { query?: string; tags?: string[]; includeArchived?: boolean }, number]> = [
      ["name substring 'Budget'", { query: "budget" }, 1],
      ["case-insensitive name 'OPTIMIZATION'", { query: "OPTIMIZATION" }, 1],
      ["description substring 'scaling'", { query: "scaling" }, 1],
      ["query matching neither name nor description", { query: "xyz123" }, 0],
      ["single tag match 'enterprise'", { tags: ["enterprise"] }, 2],
      ["AND tag match 'enterprise' + 'finance'", { tags: ["enterprise", "finance"] }, 1],
      ["AND tag match fails if scenario only has SOME tags", { tags: ["enterprise", "nonexistent"] }, 0],
      ["archived excluded by default", { query: "legacy" }, 0],
      ["archived included when requested", { query: "legacy", includeArchived: true }, 1],
    ];

    it.each(searchCases)("searches correctly for %s", async (_description, opts, expectedCount) => {
      const results = await searchScenarios(projectId, opts);
      expect(results).toHaveLength(expectedCount);
    });
  });

  describe("getPgPool retry behavior", () => {
    beforeEach(() => {
      vi.useRealTimers();
      _resetPgConnectionState();
      delete (globalThis as any).process?.env?.DATABASE_URL;
      vi.restoreAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
      _resetPgConnectionState();
      delete (globalThis as any).process?.env?.DATABASE_URL;
      vi.restoreAllMocks();
    });

    it("without DATABASE_URL set, getPgPool() always returns null and never throws", async () => {
      delete (globalThis as any).process?.env?.DATABASE_URL;
      const pool1 = await getPgPool();
      expect(pool1).toBeNull();
      const pool2 = await getPgPool();
      expect(pool2).toBeNull();
    });

    it("two calls to getPgPool() within the cooldown window after a failed attempt do not trigger two separate connection attempts", async () => {
      vi.useFakeTimers();
      (globalThis as any).process = (globalThis as any).process ?? {};
      (globalThis as any).process.env = (globalThis as any).process.env ?? {};
      (globalThis as any).process.env.DATABASE_URL = "postgres://localhost:5432/test";

      const spy = vi
        .spyOn(_pgConnector, "connect")
        .mockRejectedValue(new Error("Connection failed"));

      // First call: attempts connection and fails
      const res1 = await getPgPool();
      expect(res1).toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);

      // Advance by 10 seconds (well within PG_RETRY_COOLDOWN_MS of 30 seconds)
      vi.advanceTimersByTime(10_000);

      // Second call: within cooldown window, should immediately return null without new attempt
      const res2 = await getPgPool();
      expect(res2).toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("after advancing time past PG_RETRY_COOLDOWN_MS, a subsequent call attempts to connect again", async () => {
      vi.useFakeTimers();
      (globalThis as any).process = (globalThis as any).process ?? {};
      (globalThis as any).process.env = (globalThis as any).process.env ?? {};
      (globalThis as any).process.env.DATABASE_URL = "postgres://localhost:5432/test";

      const spy = vi
        .spyOn(_pgConnector, "connect")
        .mockRejectedValue(new Error("Connection failed"));

      // First call: attempts connection and fails
      const res1 = await getPgPool();
      expect(res1).toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);

      // Advance time past the 30s cooldown
      vi.advanceTimersByTime(PG_RETRY_COOLDOWN_MS + 1);

      // Second call: cooldown expired, triggers a new connection attempt
      const res2 = await getPgPool();
      expect(res2).toBeNull();
      expect(spy).toHaveBeenCalledTimes(2);

      // Third call within new cooldown window: does NOT trigger a connection attempt
      const res3 = await getPgPool();
      expect(res3).toBeNull();
      expect(spy).toHaveBeenCalledTimes(2);

      // Advance time past cooldown again, succeed this time
      vi.advanceTimersByTime(PG_RETRY_COOLDOWN_MS + 1);
      const mockPool = { query: vi.fn() };
      spy.mockResolvedValueOnce(mockPool);

      const res4 = await getPgPool();
      expect(res4).toBe(mockPool);
      expect(spy).toHaveBeenCalledTimes(3);

      // Subsequent call when pool is cached: returns cached pool immediately without calling connect
      const res5 = await getPgPool();
      expect(res5).toBe(mockPool);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });
});
