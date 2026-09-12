import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as explainDiffRoute } from "../explain-diff/route.js";
import * as db from "../../../../data/db.js";
import { _resetInMemoryDb } from "../../../../data/db.js";
import * as explainModule from "../../../../ai/explainDiff.js";

describe("POST /api/ai/explain-diff", () => {
  let scenarioAId: string;
  let scenarioBId: string;

  beforeEach(async () => {
    _resetInMemoryDb();
    vi.restoreAllMocks();

    const project = await db.createProject({ name: "Explain Diff Project" });
    const sA = await db.saveScenario({
      projectId: project.id,
      name: "Scenario A",
      inputs: { budget: 1_000_000, headcount: 8, deadlineWeeks: 20, scope: 480 },
    });
    const sB = await db.saveScenario({
      projectId: project.id,
      name: "Scenario B",
      inputs: { budget: 800_000, headcount: 10, deadlineWeeks: 24, scope: 480 },
    });

    scenarioAId = sA.id;
    scenarioBId = sB.id;
  });

  it("returns 200 with AI explanation when AI succeeds (happy path)", async () => {
    vi.spyOn(explainModule, "explainScenarioDiff").mockResolvedValue({
      explanation: "Risk decreased by 5 points. Budget cut drove +8 risk, deadline drove -13 risk.",
      source: "ai",
    });

    const req = new Request("http://localhost/api/ai/explain-diff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioAId,
        scenarioBId,
      }),
    });

    const res = await explainDiffRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.source).toBe("ai");
    expect(body.data.explanation).toContain("Risk decreased");
  });

  it("always returns 200 even when underlying explanation falls back to template mode", async () => {
    vi.spyOn(explainModule, "explainScenarioDiff").mockResolvedValue({
      explanation: "Risk moved from 40 to 35 (decreased). Feasibility did not change. Contributing changes, largest impact first:\n- budget: 1000000 → 800000 (8 points of risk impact)",
      source: "template-fallback",
    });

    const req = new Request("http://localhost/api/ai/explain-diff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioAId,
        scenarioBId,
      }),
    });

    const res = await explainDiffRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.source).toBe("template-fallback");
    expect(body.data.explanation).toContain("Contributing changes");
  });

  it("returns 404 NOT_FOUND when either scenario ID cannot be resolved", async () => {
    const reqMissingA = new Request("http://localhost/api/ai/explain-diff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioAId: "non-existent-id",
        scenarioBId,
      }),
    });

    const resMissingA = await explainDiffRoute(reqMissingA);
    expect(resMissingA.status).toBe(404);
    const bodyA = await resMissingA.json();
    expect(bodyA.error.code).toBe("NOT_FOUND");

    const reqMissingB = new Request("http://localhost/api/ai/explain-diff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioAId,
        scenarioBId: "non-existent-id",
      }),
    });

    const resMissingB = await explainDiffRoute(reqMissingB);
    expect(resMissingB.status).toBe(404);
    const bodyB = await resMissingB.json();
    expect(bodyB.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 VALIDATION_ERROR when required body parameters are missing", async () => {
    const reqMissingBoth = new Request("http://localhost/api/ai/explain-diff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resMissingBoth = await explainDiffRoute(reqMissingBoth);
    expect(resMissingBoth.status).toBe(400);
    const body = await resMissingBoth.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
