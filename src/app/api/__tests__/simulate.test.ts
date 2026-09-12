import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../../../data/db.js";
import { POST as simulateRoute } from "../simulate/route.js";
import { POST as simulateMonteCarloRoute } from "../simulate/monte-carlo/route.js";

describe("Simulation API Routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/simulate", () => {
    it("runs deterministic simulation directly without touching storage (happy path)", async () => {
      const saveSpy = vi.spyOn(db, "saveScenario");
      const getSpy = vi.spyOn(db, "getScenario");

      const inputs = {
        budget: 2_000_000,
        headcount: 8,
        deadlineWeeks: 70,
        scope: 480,
      };

      const req = new Request("http://localhost/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });

      const res = await simulateRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.estimatedTimeWeeks).toBe(60);
      expect(body.data.effectiveHeadcount).toBe(8);
      expect(body.data.actualCost).toBe(1_200_000);
      expect(body.data.riskScore).toBeDefined();
      expect(body.data.riskBreakdown).toBeDefined();
      expect(body.data.feasible).toBeDefined();

      // Verify no storage interactions occurred
      expect(saveSpy).not.toHaveBeenCalled();
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR on malformed input types", async () => {
      const req = new Request("http://localhost/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: "invalid", headcount: 8, deadlineWeeks: 70 }),
      });

      const res = await simulateRoute(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/simulate/monte-carlo", () => {
    it("runs Monte Carlo simulation directly without touching storage (happy path)", async () => {
      const saveSpy = vi.spyOn(db, "saveScenario");
      const getSpy = vi.spyOn(db, "getScenario");

      const req = new Request("http://localhost/api/simulate/monte-carlo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: {
            budget: { kind: "normal", mean: 2_000_000, stddev: 100_000 },
            headcount: 8,
            deadlineWeeks: 70,
          },
          options: {
            iterations: 100,
            seed: 42,
          },
        }),
      });

      const res = await simulateMonteCarloRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.iterationsRequested).toBe(100);
      expect(body.data.iterationsUsed).toBe(100);
      expect(typeof body.data.feasibleRate).toBe("number");
      expect(typeof body.data.probabilityOnTime).toBe("number");
      expect(typeof body.data.probabilityWithinBudget).toBe("number");
      expect(body.data.estimatedTimeWeeks).toBeDefined();

      // Verify no storage interactions occurred
      expect(saveSpy).not.toHaveBeenCalled();
      expect(getSpy).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR on invalid distribution kind", async () => {
      const req = new Request("http://localhost/api/simulate/monte-carlo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: {
            budget: { kind: "unknown_kind", mean: 100_000 },
            headcount: 8,
            deadlineWeeks: 70,
          },
        }),
      });

      const res = await simulateMonteCarloRoute(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
