import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../../../data/db.js";
import { _resetInMemoryDb } from "../../../data/db.js";
import type { ProjectRecord } from "../../../data/schema.js";
import { simulate } from "../../../domain/simulation.js";
import { GET as listScenariosRoute, POST as createScenarioRoute } from "../scenarios/route.js";
import {
  DELETE as deleteScenarioRoute,
  GET as getScenarioRoute,
  PATCH as updateScenarioRoute,
} from "../scenarios/[id]/route.js";
import { POST as archiveScenarioRoute } from "../scenarios/[id]/archive/route.js";
import { GET as getChildrenRoute } from "../scenarios/[id]/children/route.js";
import { POST as toggleFavoriteRoute } from "../scenarios/[id]/favorite/route.js";
import { GET as searchScenariosRoute } from "../scenarios/search/route.js";

describe("Scenarios API Routes", () => {
  let project: ProjectRecord;

  beforeEach(async () => {
    _resetInMemoryDb();
    vi.restoreAllMocks();
    project = await db.createProject({ name: "Core Project" });
  });

  describe("POST /api/scenarios", () => {
    it("creates a scenario with server-computed deterministic output (happy path)", async () => {
      const inputs = {
        budget: 2_000_000,
        headcount: 8,
        deadlineWeeks: 70,
        scope: 480,
      };

      const req = new Request("http://localhost/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: "Baseline Plan",
          description: "Nominal schedule",
          tags: ["baseline", "v1"],
          inputs,
        }),
      });

      const res = await createScenarioRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.id).toBeDefined();
      expect(body.data.project_id).toBe(project.id);
      expect(body.data.name).toBe("Baseline Plan");
      expect(body.data.deterministic_output).toBeDefined();

      const expected = simulate(inputs);
      expect(body.data.deterministic_output.estimatedTimeWeeks).toBeCloseTo(
        expected.estimatedTimeWeeks,
        5
      );
      expect(body.data.deterministic_output.actualCost).toBeCloseTo(expected.actualCost, 5);
      expect(body.data.deterministic_output.riskScore).toBeCloseTo(expected.riskScore, 5);
      expect(body.data.monte_carlo_output).toBeNull();
    });

    it("returns 404 NOT_FOUND if projectId does not resolve, and does not invoke saveScenario", async () => {
      const spy = vi.spyOn(db, "saveScenario");
      const req = new Request("http://localhost/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "non-existent-project-id",
          name: "Ghost Plan",
          inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
        }),
      });

      const res = await createScenarioRoute(req);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
      expect(spy).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR on malformed inputs and does not invoke saveScenario", async () => {
      const spy = vi.spyOn(db, "saveScenario");
      const req = new Request("http://localhost/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: "Invalid Plan",
          inputs: { budget: "not-a-number", headcount: 5, deadlineWeeks: 20 },
        }),
      });

      const res = await createScenarioRoute(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(spy).not.toHaveBeenCalled();
    });

    it("populates monte_carlo_output when runMonteCarlo is true", async () => {
      const req = new Request("http://localhost/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: "Probabilistic Plan",
          inputs: {
            budget: 2_000_000,
            headcount: 8,
            deadlineWeeks: 70,
            scope: 480,
          },
          runMonteCarlo: true,
          monteCarloOptions: { iterations: 100, seed: 42 },
        }),
      });

      const res = await createScenarioRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.monte_carlo_output).not.toBeNull();
      expect(body.data.monte_carlo_output.iterationsUsed).toBe(100);
      expect(typeof body.data.monte_carlo_output.feasibleRate).toBe("number");
      expect(typeof body.data.monte_carlo_output.probabilityOnTime).toBe("number");
      expect(typeof body.data.monte_carlo_output.probabilityWithinBudget).toBe("number");
    });

    it("integrity check: client-supplied deterministic_output is ignored and computed server-side", async () => {
      const inputs = {
        budget: 2_000_000,
        headcount: 8,
        deadlineWeeks: 70,
        scope: 480,
      };

      const forgedDeterministicOutput = {
        estimatedTimeWeeks: 9999,
        effectiveHeadcount: 9999,
        actualCost: 9999,
        budgetUtilization: 0.01,
        scheduleUtilization: 0.01,
        riskScore: 0,
        riskBreakdown: { scheduleRisk: 0, budgetRisk: 0, staffingRisk: 0 },
        feasible: true,
      };

      const req = new Request("http://localhost/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name: "Forged Output Attempt",
          inputs,
          deterministic_output: forgedDeterministicOutput,
        }),
      });

      const res = await createScenarioRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      const realExpected = simulate(inputs);

      // Must NOT match the client's forged numbers
      expect(body.data.deterministic_output.estimatedTimeWeeks).not.toBe(9999);
      expect(body.data.deterministic_output.actualCost).not.toBe(9999);

      // Must exactly match server-computed simulate(inputs)
      expect(body.data.deterministic_output.estimatedTimeWeeks).toBeCloseTo(
        realExpected.estimatedTimeWeeks,
        5
      );
      expect(body.data.deterministic_output.actualCost).toBeCloseTo(realExpected.actualCost, 5);
      expect(body.data.deterministic_output.riskScore).toBeCloseTo(realExpected.riskScore, 5);
    });
  });

  describe("GET /api/scenarios", () => {
    it("returns list of scenarios for a given project", async () => {
      await db.saveScenario({
        projectId: project.id,
        name: "Plan A",
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });
      await db.saveScenario({
        projectId: project.id,
        name: "Plan B",
        inputs: { budget: 150_000, headcount: 6, deadlineWeeks: 22 },
      });

      const req = new Request(`http://localhost/api/scenarios?projectId=${project.id}`);
      const res = await listScenariosRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(2);
    });

    it("returns 400 VALIDATION_ERROR if projectId query param is missing", async () => {
      const req = new Request("http://localhost/api/scenarios");
      const res = await listScenariosRoute(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/scenarios/[id]", () => {
    it("returns scenario by id (happy path)", async () => {
      const saved = await db.saveScenario({
        projectId: project.id,
        name: "Lookup Target",
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });

      const req = new Request(`http://localhost/api/scenarios/${saved.id}`);
      const res = await getScenarioRoute(req, { params: { id: saved.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.id).toBe(saved.id);
      expect(body.data.name).toBe("Lookup Target");
    });

    it("returns 404 NOT_FOUND if scenario does not exist", async () => {
      const req = new Request("http://localhost/api/scenarios/missing-scen");
      const res = await getScenarioRoute(req, { params: { id: "missing-scen" } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/scenarios/[id]", () => {
    it("updates scenario metadata successfully", async () => {
      const saved = await db.saveScenario({
        projectId: project.id,
        name: "Initial Name",
        tags: ["v1"],
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });

      const req = new Request(`http://localhost/api/scenarios/${saved.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
          tags: ["v1", "revised"],
        }),
      });

      const res = await updateScenarioRoute(req, { params: { id: saved.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.name).toBe("Updated Name");
      expect(body.data.tags).toEqual(["v1", "revised"]);
    });

    it("returns 404 NOT_FOUND for non-existent scenario", async () => {
      const req = new Request("http://localhost/api/scenarios/missing-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Does not matter" }),
      });

      const res = await updateScenarioRoute(req, { params: { id: "missing-id" } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/scenarios/[id]/favorite", () => {
    it("toggles favorite status", async () => {
      const saved = await db.saveScenario({
        projectId: project.id,
        name: "Favorite Candidate",
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });
      expect(saved.is_favorite).toBe(false);

      const req1 = new Request(`http://localhost/api/scenarios/${saved.id}/favorite`, {
        method: "POST",
      });
      const res1 = await toggleFavoriteRoute(req1, { params: { id: saved.id } });
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.data.is_favorite).toBe(true);

      const req2 = new Request(`http://localhost/api/scenarios/${saved.id}/favorite`, {
        method: "POST",
      });
      const res2 = await toggleFavoriteRoute(req2, { params: { id: saved.id } });
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.data.is_favorite).toBe(false);
    });

    it("returns 404 NOT_FOUND for non-existent scenario", async () => {
      const req = new Request("http://localhost/api/scenarios/missing-id/favorite", {
        method: "POST",
      });
      const res = await toggleFavoriteRoute(req, { params: { id: "missing-id" } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/scenarios/[id]/archive", () => {
    it("updates archive status", async () => {
      const saved = await db.saveScenario({
        projectId: project.id,
        name: "Archive Target",
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });
      expect(saved.is_archived).toBe(false);

      const req = new Request(`http://localhost/api/scenarios/${saved.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      const res = await archiveScenarioRoute(req, { params: { id: saved.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.is_archived).toBe(true);
    });

    it("returns 404 NOT_FOUND if scenario does not exist", async () => {
      const req = new Request("http://localhost/api/scenarios/missing-id/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      const res = await archiveScenarioRoute(req, { params: { id: "missing-id" } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("DELETE /api/scenarios/[id]", () => {
    it("returns 400 CONFIRMATION_REQUIRED when ?confirm=true is missing, without invoking deleteScenario", async () => {
      const spy = vi.spyOn(db, "deleteScenario");
      const saved = await db.saveScenario({
        projectId: project.id,
        name: "To Delete",
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });

      const req = new Request(`http://localhost/api/scenarios/${saved.id}`);
      const res = await deleteScenarioRoute(req, { params: { id: saved.id } });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("CONFIRMATION_REQUIRED");
      expect(spy).not.toHaveBeenCalled();
    });

    it("deletes scenario with ?confirm=true (happy path)", async () => {
      const saved = await db.saveScenario({
        projectId: project.id,
        name: "To Delete Cleanly",
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });

      const req = new Request(`http://localhost/api/scenarios/${saved.id}?confirm=true`);
      const res = await deleteScenarioRoute(req, { params: { id: saved.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.success).toBe(true);

      const lookup = await db.getScenario(saved.id);
      expect(lookup).toBeNull();
    });

    it("returns 404 NOT_FOUND if scenario does not exist", async () => {
      const req = new Request("http://localhost/api/scenarios/missing-id?confirm=true");
      const res = await deleteScenarioRoute(req, { params: { id: "missing-id" } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/scenarios/[id]/children", () => {
    it("returns child scenarios branched from parent", async () => {
      const parent = await db.saveScenario({
        projectId: project.id,
        name: "Parent Plan",
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });

      const child = await db.saveScenario({
        projectId: project.id,
        parentScenarioId: parent.id,
        name: "Branch Plan",
        inputs: { budget: 120_000, headcount: 6, deadlineWeeks: 22 },
      });

      const req = new Request(`http://localhost/api/scenarios/${parent.id}/children`);
      const res = await getChildrenRoute(req, { params: { id: parent.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(child.id);
    });

    it("returns 404 NOT_FOUND if parent scenario does not exist", async () => {
      const req = new Request("http://localhost/api/scenarios/missing-parent/children");
      const res = await getChildrenRoute(req, { params: { id: "missing-parent" } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/scenarios/search", () => {
    it("searches scenarios by query text and tags within project", async () => {
      await db.saveScenario({
        projectId: project.id,
        name: "Fast Deployment Track",
        tags: ["urgent", "prod"],
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });

      await db.saveScenario({
        projectId: project.id,
        name: "Slow Research Track",
        tags: ["research"],
        inputs: { budget: 80_000, headcount: 3, deadlineWeeks: 40 },
      });

      const req = new Request(
        `http://localhost/api/scenarios/search?projectId=${project.id}&query=deployment&tags=urgent`
      );
      const res = await searchScenariosRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe("Fast Deployment Track");
    });

    it("returns 400 VALIDATION_ERROR if projectId query param is missing", async () => {
      const req = new Request("http://localhost/api/scenarios/search?query=test");
      const res = await searchScenariosRoute(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
