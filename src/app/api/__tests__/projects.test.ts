import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../../../data/db.js";
import { _resetInMemoryDb } from "../../../data/db.js";
import { GET as listProjectsRoute, POST as createProjectRoute } from "../projects/route.js";
import { DELETE as deleteProjectRoute, GET as getProjectRoute } from "../projects/[id]/route.js";
import { PATCH as updateProjectTagsRoute } from "../projects/[id]/tags/route.js";

describe("Projects API Routes", () => {
  beforeEach(() => {
    _resetInMemoryDb();
    vi.restoreAllMocks();
  });

  describe("POST /api/projects", () => {
    it("creates a new project successfully (happy path)", async () => {
      const req = new Request("http://localhost/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Project Titan",
          description: "Major system overhaul",
          suggestedTags: ["backend", "infra"],
        }),
      });

      const res = await createProjectRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe("Project Titan");
      expect(body.data.description).toBe("Major system overhaul");
      expect(body.data.suggested_tags).toEqual(["backend", "infra"]);
    });

    it("returns 400 VALIDATION_ERROR on malformed body and does not invoke createProject", async () => {
      const spy = vi.spyOn(db, "createProject");
      const req = new Request("http://localhost/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }), // empty name violates min(1)
      });

      const res = await createProjectRoute(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/projects", () => {
    it("returns list of projects", async () => {
      await db.createProject({ name: "Project Alpha" });
      await db.createProject({ name: "Project Beta" });

      const res = await listProjectsRoute();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(2);
      expect(body.data.map((p: any) => p.name)).toContain("Project Alpha");
      expect(body.data.map((p: any) => p.name)).toContain("Project Beta");
    });
  });

  describe("GET /api/projects/[id]", () => {
    it("returns project by id (happy path)", async () => {
      const project = await db.createProject({ name: "Project Sol" });

      const req = new Request(`http://localhost/api/projects/${project.id}`);
      const res = await getProjectRoute(req, { params: { id: project.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.id).toBe(project.id);
      expect(body.data.name).toBe("Project Sol");
    });

    it("returns 404 NOT_FOUND for non-existent project id", async () => {
      const req = new Request("http://localhost/api/projects/non-existent-id");
      const res = await getProjectRoute(req, { params: { id: "non-existent-id" } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/projects/[id]/tags", () => {
    it("updates suggested tags successfully (happy path)", async () => {
      const project = await db.createProject({ name: "Project Mercury", suggestedTags: ["old"] });

      const req = new Request(`http://localhost/api/projects/${project.id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestedTags: ["frontend", "v2"] }),
      });

      const res = await updateProjectTagsRoute(req, { params: { id: project.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.suggested_tags).toEqual(["frontend", "v2"]);
    });

    it("returns 404 NOT_FOUND if project does not exist", async () => {
      const req = new Request("http://localhost/api/projects/missing-id/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestedTags: ["tag1"] }),
      });

      const res = await updateProjectTagsRoute(req, { params: { id: "missing-id" } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 400 VALIDATION_ERROR on malformed body", async () => {
      const project = await db.createProject({ name: "Project Venus" });
      const req = new Request(`http://localhost/api/projects/${project.id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestedTags: "not-an-array" }),
      });

      const res = await updateProjectTagsRoute(req, { params: { id: project.id } });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE /api/projects/[id]", () => {
    it("returns 400 CONFIRMATION_REQUIRED when ?confirm=true is omitted and does not invoke deleteProject", async () => {
      const spy = vi.spyOn(db, "deleteProject");
      const project = await db.createProject({ name: "Project Target" });

      const req = new Request(`http://localhost/api/projects/${project.id}`);
      const res = await deleteProjectRoute(req, { params: { id: project.id } });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("CONFIRMATION_REQUIRED");
      expect(spy).not.toHaveBeenCalled();
    });

    it("returns 404 NOT_FOUND if project does not exist even with confirm=true", async () => {
      const req = new Request("http://localhost/api/projects/missing-proj?confirm=true");
      const res = await deleteProjectRoute(req, { params: { id: "missing-proj" } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 409 PROJECT_NOT_EMPTY if project contains scenarios", async () => {
      const project = await db.createProject({ name: "Parent Proj" });
      await db.saveScenario({
        projectId: project.id,
        name: "Child Scenario",
        inputs: { budget: 100_000, headcount: 5, deadlineWeeks: 20 },
      });

      const req = new Request(`http://localhost/api/projects/${project.id}?confirm=true`);
      const res = await deleteProjectRoute(req, { params: { id: project.id } });
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.error.code).toBe("PROJECT_NOT_EMPTY");
    });

    it("deletes empty project with ?confirm=true (happy path)", async () => {
      const project = await db.createProject({ name: "Empty Project" });

      const req = new Request(`http://localhost/api/projects/${project.id}?confirm=true`);
      const res = await deleteProjectRoute(req, { params: { id: project.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.success).toBe(true);
      expect(body.data.deletedId).toBe(project.id);

      const lookup = await db.getProject(project.id);
      expect(lookup).toBeNull();
    });
  });
});
