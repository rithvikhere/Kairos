import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as parseIntentRoute } from "../parse-intent/route.js";
import * as parserModule from "../../../../ai/parseScenarioIntent.js";
import { AiUnavailableError } from "../../../../ai/errors.js";

describe("POST /api/ai/parse-intent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baselineInputs = {
    budget: 100_000,
    headcount: 10,
    deadlineWeeks: 20,
    scope: 400,
  };

  it("successfully parses intent and returns delta and resolvedInputs without running simulation (happy path)", async () => {
    vi.spyOn(parserModule, "parseScenarioIntent").mockResolvedValue({
      budget: { type: "percent", value: -20 },
      headcount: { type: "delta", value: 2 },
    });

    const req = new Request("http://localhost/api/ai/parse-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        freeText: "cut budget 20% and add 2 people",
        baselineInputs,
      }),
    });

    const res = await parseIntentRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.delta).toEqual({
      budget: { type: "percent", value: -20 },
      headcount: { type: "delta", value: 2 },
    });
    expect(body.data.resolvedInputs).toEqual({
      budget: 80_000,
      headcount: 12,
      deadlineWeeks: 20,
      scope: 400,
    });

    // Verify it NEVER returns a SimulationResult
    expect(body.data.riskScore).toBeUndefined();
    expect(body.data.actualCost).toBeUndefined();
    expect(body.data.resolvedInputs.riskScore).toBeUndefined();
  });

  it("returns 503 AI_UNAVAILABLE with message directing client to slider/form inputs when AI is unavailable", async () => {
    vi.spyOn(parserModule, "parseScenarioIntent").mockRejectedValue(
      new AiUnavailableError("No providers reachable")
    );

    const req = new Request("http://localhost/api/ai/parse-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        freeText: "cut budget 20%",
        baselineInputs,
      }),
    });

    const res = await parseIntentRoute(req);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error.code).toBe("AI_UNAVAILABLE");
    expect(body.error.message).toContain("slider");
  });

  it("returns 400 VALIDATION_ERROR when freeText is missing or empty", async () => {
    const req = new Request("http://localhost/api/ai/parse-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        freeText: "",
        baselineInputs,
      }),
    });

    const res = await parseIntentRoute(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when baselineInputs is invalid", async () => {
    const req = new Request("http://localhost/api/ai/parse-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        freeText: "increase headcount by 2",
        baselineInputs: {
          budget: "not-a-number",
          headcount: 10,
        },
      }),
    });

    const res = await parseIntentRoute(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
