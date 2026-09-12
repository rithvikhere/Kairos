import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../../../data/db.js";
import { _resetInMemoryDb } from "../../../data/db.js";
import { GET as diffRoute } from "../diff/route.js";

describe("Diff API Route (GET /api/diff)", () => {
  beforeEach(() => {
    _resetInMemoryDb();
    vi.restoreAllMocks();
  });

  it("diffs two valid scenarios by id (happy path)", async () => {
    const project = await db.createProject({ name: "Diff Suite Project" });

    const s1 = await db.saveScenario({
      projectId: project.id,
      name: "Plan A",
      inputs: { budget: 2_000_000, headcount: 8, deadlineWeeks: 70, scope: 480 },
    });

    const s2 = await db.saveScenario({
      projectId: project.id,
      name: "Plan B",
      inputs: { budget: 2_500_000, headcount: 12, deadlineWeeks: 50, scope: 480 },
    });

    const req = new Request(`http://localhost/api/diff?a=${s1.id}&b=${s2.id}`);
    const res = await diffRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.scenarioAId).toBe(s1.id);
    expect(body.data.scenarioBId).toBe(s2.id);

    expect(body.data.inputDiff.budget.direction).toBe("increased");
    expect(body.data.inputDiff.headcount.direction).toBe("increased");
    expect(body.data.inputDiff.deadlineWeeks.direction).toBe("decreased");

    expect(body.data.outputDiff).toBeDefined();
    expect(Array.isArray(body.data.attribution)).toBe(true);
    expect(body.data.attribution.length).toBe(3);
  });

  it("returns 400 VALIDATION_ERROR when query parameters a or b are missing", async () => {
    const reqNoParams = new Request("http://localhost/api/diff");
    const resNoParams = await diffRoute(reqNoParams);
    expect(resNoParams.status).toBe(400);
    expect((await resNoParams.json()).error.code).toBe("VALIDATION_ERROR");

    const reqMissingB = new Request("http://localhost/api/diff?a=some-id");
    const resMissingB = await diffRoute(reqMissingB);
    expect(resMissingB.status).toBe(400);
    expect((await resMissingB.json()).error.code).toBe("VALIDATION_ERROR");

    const reqMissingA = new Request("http://localhost/api/diff?b=some-id");
    const resMissingA = await diffRoute(reqMissingA);
    expect(resMissingA.status).toBe(400);
    expect((await resMissingA.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 NOT_FOUND when either scenario id cannot be resolved", async () => {
    const project = await db.createProject({ name: "Single Project" });
    const s1 = await db.saveScenario({
      projectId: project.id,
      name: "Plan Real",
      inputs: { budget: 1_000_000, headcount: 5, deadlineWeeks: 50 },
    });

    const reqMissingSecond = new Request(`http://localhost/api/diff?a=${s1.id}&b=ghost-id`);
    const resMissingSecond = await diffRoute(reqMissingSecond);
    expect(resMissingSecond.status).toBe(404);
    expect((await resMissingSecond.json()).error.code).toBe("NOT_FOUND");

    const reqMissingFirst = new Request(`http://localhost/api/diff?a=ghost-id&b=${s1.id}`);
    const resMissingFirst = await diffRoute(reqMissingFirst);
    expect(resMissingFirst.status).toBe(404);
    expect((await resMissingFirst.json()).error.code).toBe("NOT_FOUND");
  });
});
