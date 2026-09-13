import { test, expect } from "@playwright/test";

test.describe("Phase 7 E2E: Unified Kairos Dashboard Lifecycle", () => {
  test("create project on dashboard -> build scenario -> fork via NL -> compare scenarios -> run Monte Carlo", async ({
    page,
  }) => {
    // 1. Intercept AI parse-intent to provide deterministic structured intent
    await page.route("**/api/ai/parse-intent", async (route) => {
      const body = route.request().postDataJSON();
      const baseline = body.baselineInputs || {
        budget: 250000,
        headcount: 10,
        deadlineWeeks: 14,
        scope: 140,
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            delta: {
              budget: { type: "delta", value: 100000 },
              headcount: { type: "delta", value: 2 },
            },
            resolvedInputs: {
              budget: baseline.budget + 100000,
              headcount: baseline.headcount + 2,
              deadlineWeeks: baseline.deadlineWeeks,
              scope: baseline.scope || 140,
            },
          },
        }),
      });
    });

    // 2. Landing Page: Verify landing experience and navigate to dashboard
    await page.goto("/");
    await expect(page).toHaveTitle(/Kairos/i);
    await expect(page.getByText("Every decision")).toBeVisible();
    await expect(page.getByText("has a shape.")).toBeVisible();

    // Hotspot interaction verification
    const sliderHotspot = page.getByTestId("hotspot-slider");
    await expect(sliderHotspot).toBeVisible();
    await sliderHotspot.click();
    await expect(page.getByText("Deterministic Core")).toBeVisible();
    await page.getByLabel("Close modal").click();

    // Hard navigation to workspace via hero CTA
    await page.getByTestId("hero-enter-btn").click();
    await expect(page).toHaveURL("/projects");

    // 3. Open Create Project modal directly on the second page
    await page.getByRole("button", { name: /new project/i }).click();
    await expect(page.getByText("Create New Project")).toBeVisible();

    // Fill form
    await page.getByPlaceholder(/Platform Re-architecture/i).fill("E2E Alpha Initiative");
    await page.getByPlaceholder(/What strategic question/i).fill("Validation project for decision simulation");
    await page.getByPlaceholder(/platform, infra, q3/i).fill("e2e, alpha, test");

    // Submit project creation
    await page.getByRole("button", { name: "Create Project" }).click();

    // Verify stays on /projects with the newly created project active
    await expect(page).toHaveURL(/\/projects\?projectId=[a-zA-Z0-9-]+/);
    await expect(page.getByText("E2E Alpha Initiative")).toBeVisible();

    // 4. Scenario Builder: Build and save baseline plan directly on the dashboard
    await page.getByRole("button", { name: /new scenario/i }).click();
    await expect(page.getByText("Build New Scenario")).toBeVisible();

    // Name scenario
    const nameInput = page.getByPlaceholder(/Aggressive Delivery/i);
    await nameInput.clear();
    await nameInput.fill("Baseline Plan");

    // Save baseline scenario
    await page.getByRole("button", { name: /save scenario/i }).click();

    // 5. Fork / Build variant using Natural Language Intent Bar
    await page.getByRole("button", { name: /new scenario/i }).click();
    await expect(page.getByText("Build New Scenario")).toBeVisible();

    // Name variant
    const variantNameInput = page.getByPlaceholder(/Aggressive Delivery/i);
    await variantNameInput.clear();
    await variantNameInput.fill("Forked Resilient Variant");

    // Enter natural language instruction
    const nlInput = page.getByPlaceholder(/Cut budget 20%/i);
    await nlInput.fill("Add $100k budget and add 2 engineers");
    await page.getByRole("button", { name: /extract intent/i }).click();

    // Verify intent visibly resolves into structured chips
    await expect(page.getByText("Extracted Modifications:")).toBeVisible();
    await expect(page.getByText(/budget:/i)).toBeVisible();

    // Save forked scenario
    await page.getByRole("button", { name: /save scenario/i }).click();

    // 6. Compare Scenarios: Open comparison modal & verify attribution
    await page.getByRole("button", { name: /compare scenarios/i }).click();
    await expect(page.getByText("Scenario Comparison & Attribution")).toBeVisible();
    await expect(page.getByText("Primary Isolated Risk Driver")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    // 7. Run Monte Carlo simulation on the dashboard
    await page.getByRole("button", { name: /run monte carlo/i }).click();
    await expect(page.getByText("Sampling 1,000 runs...")).toBeVisible();
    await expect(page.getByText("Monte Carlo (2,000 Iterations)")).toBeVisible();
  });
});
