import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "../api-client.js";
import { ApiClientError } from "../api-client.js";

describe("api-client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getProjects sends GET /api/projects and unwraps data", async () => {
    const mockData = [{ id: "p1", name: "Alpha" }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockData }),
    } as any);

    const result = await api.getProjects();
    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/projects", expect.any(Object));
  });

  it("createProject sends POST /api/projects with body", async () => {
    const mockProject = { id: "p1", name: "New Project" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProject }),
    } as any);

    const result = await api.createProject({ name: "New Project" });
    expect(result).toEqual(mockProject);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/projects", {
      method: "POST",
      headers: expect.any(Headers),
      body: JSON.stringify({ name: "New Project" }),
    });
  });

  it("deleteProject sends DELETE with ?confirm=true", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    } as any);

    await api.deleteProject("proj-123");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/projects/proj-123?confirm=true",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("deleteScenario sends DELETE with ?confirm=true", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    } as any);

    await api.deleteScenario("scen-456");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/scenarios/scen-456?confirm=true",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("getDiff sends GET /api/diff?a=&b=", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { scenarioAId: "a", scenarioBId: "b" } }),
    } as any);

    await api.getDiff("scen-a", "scen-b");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/diff?a=scen-a&b=scen-b",
      expect.any(Object)
    );
  });

  it("parseScenarioIntent sends POST /api/ai/parse-intent with body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { delta: {}, resolvedInputs: {} } }),
    } as any);

    const baseline = { budget: 100000, headcount: 10, deadlineWeeks: 20 };
    await api.parseScenarioIntent("cut budget 20%", baseline);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/ai/parse-intent", {
      method: "POST",
      headers: expect.any(Headers),
      body: JSON.stringify({ freeText: "cut budget 20%", baselineInputs: baseline }),
    });
  });

  it("explainDiff sends POST /api/ai/explain-diff with body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { explanation: "Risk changed", source: "ai" } }),
    } as any);

    await api.explainDiff("scen-1", "scen-2");
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/ai/explain-diff", {
      method: "POST",
      headers: expect.any(Headers),
      body: JSON.stringify({ scenarioAId: "scen-1", scenarioBId: "scen-2" }),
    });
  });

  it("extracts error.code from failure response and throws ApiClientError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: async () => ({
        error: {
          code: "PROJECT_NOT_EMPTY",
          message: "Project cannot be deleted because it contains scenarios.",
        },
      }),
    } as any);

    await expect(api.deleteProject("non-empty-proj")).rejects.toThrow(ApiClientError);

    try {
      await api.deleteProject("non-empty-proj");
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.status).toBe(409);
      expect(err.code).toBe("PROJECT_NOT_EMPTY");
      expect(err.message).toBe("Project cannot be deleted because it contains scenarios.");
    }
  });

  it("handles 503 AI_UNAVAILABLE failure response accurately", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => ({
        error: {
          code: "AI_UNAVAILABLE",
          message: "AI service unavailable. Use slider inputs.",
        },
      }),
    } as any);

    try {
      await api.parseScenarioIntent("cut budget", { budget: 1, headcount: 1, deadlineWeeks: 1 });
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.status).toBe(503);
      expect(err.code).toBe("AI_UNAVAILABLE");
    }
  });
});
