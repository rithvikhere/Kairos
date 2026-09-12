import { test, expect } from "@playwright/test";

test.describe("Phase 7 E2E: Full Happy-Path Scenario Lifecycle", () => {
  test("create project -> build scenario -> save -> fork via NL -> compare -> read explanation", async ({
    page,
  }) => {
    // 1. Intercept AI parse-intent to provide deterministic structured intent
    // (ensuring the visual chips reveal and confirmation flow is exercised in CI / offline envs)
    await page.route("**/api/ai/parse-intent", async (route) => {
      const body = route.request().postDataJSON();
      const baseline = body.baselineInputs || {
        budget: 500000,
        headcount: 8,
        deadlineWeeks: 20,
        scope: 480,
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
              scope: baseline.scope || 480,
            },
          },
        }),
      });
    });

    // 2. Landing Page: Verify landing experience and navigate to workspace
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

    // Open Create Project modal
    await page.getByRole("button", { name: /new project/i }).click();
    await expect(page.getByText("Create New Project")).toBeVisible();

    // Fill form
    await page.getByPlaceholder(/Platform Re-architecture/i).fill("E2E Alpha Initiative");
    await page.getByPlaceholder(/What strategic question/i).fill("Validation project for decision simulation");
    await page.getByPlaceholder(/platform, infra, q3/i).fill("e2e, alpha, test");

    // Submit project creation
    await page.getByRole("button", { name: "Create Project" }).click();

    // Verify redirect to project scenario list
    await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole("heading", { name: "E2E Alpha Initiative" })).toBeVisible();

    // 3. Scenario Builder: Build baseline scenario via sliders
    await page.getByRole("button", { name: /build new scenario/i }).click();
    await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+\/scenarios\/new/);

    // Set scenario name
    const nameInput = page.getByPlaceholder(/Aggressive Delivery/i);
    await nameInput.clear();
    await nameInput.fill("Baseline Plan");

    // Verify live preview is responsive and displaying simulation results
    await expect(page.getByText("Live Preview")).toBeVisible();
    await expect(page.getByText("/ 100")).toBeVisible();

    // Save baseline scenario
    await page.getByRole("button", { name: /save scenario/i }).click();

    // Save confirmation dialog opens
    await expect(page.getByText("Scenario Successfully Saved")).toBeVisible();
    await page.getByRole("button", { name: /open scenario detail/i }).click();

    // 4. Scenario Detail: Verify baseline metrics & click Fork
    await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+\/scenarios\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole("heading", { name: "Baseline Plan" })).toBeVisible();

    // Fork scenario
    await page.getByRole("button", { name: /fork scenario/i }).click();
    await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+\/scenarios\/new\?parentScenarioId=/);

    // 5. Fork via Natural Language Intent Bar
    // Name the variant
    const variantNameInput = page.getByPlaceholder(/Aggressive Delivery/i);
    await variantNameInput.clear();
    await variantNameInput.fill("Forked Resilient Variant");

    // Enter natural language instruction
    const nlInput = page.getByPlaceholder(/Cut budget 20%/i);
    await nlInput.fill("Add $100k budget and add 2 engineers");
    await page.getByRole("button", { name: /extract intent/i }).click();

    // Verify intent visibly resolves into structured chips
    await expect(page.getByText("Extracted Modifications")).toBeVisible();
    await expect(page.getByText(/Budget:/i)).toBeVisible();

    // Confirm & apply the delta
    await page.getByRole("button", { name: /confirm & apply to sliders/i }).click();

    // Save the forked scenario
    await page.getByRole("button", { name: /save scenario/i }).click();
    await expect(page.getByText("Scenario Successfully Saved")).toBeVisible();
    await page.getByRole("button", { name: /open scenario detail/i }).click();

    // Verify detail page of forked scenario
    await expect(page.getByRole("heading", { name: "Forked Resilient Variant" })).toBeVisible();

    // 6. Navigate back to Project page to compare scenarios
    await page.getByRole("link", { name: "E2E Alpha Initiative" }).click();
    await expect(page.getByRole("heading", { name: "E2E Alpha Initiative" })).toBeVisible();

    // Verify both scenarios are present
    await expect(page.getByRole("heading", { name: "Baseline Plan" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Forked Resilient Variant" })).toBeVisible();

    // Toggle compare affordances on both scenario cards
    const compareButtons = page.getByTitle("Select for comparison");
    await compareButtons.first().click();
    await compareButtons.first().click(); // Next available unselected card

    // Verify Pairwise Diff floating banner appears and click Run Pairwise Diff
    const diffButton = page.getByRole("button", { name: /run pairwise diff/i });
    await expect(diffButton).toBeVisible();
    await diffButton.click();

    // 7. Pairwise Diff View: Verify deltas, attribution, and AI / fallback explanation
    await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+\/compare\?a=[a-zA-Z0-9-]+&b=[a-zA-Z0-9-]+/);
    await expect(page.getByText("Pairwise Scenario Comparison")).toBeVisible();

    // Verify ScenarioDiffTable inputs & outputs
    await expect(page.getByText("Scenario Input Levers")).toBeVisible();
    await expect(page.getByText("Deterministic Simulation Outputs")).toBeVisible();
    await expect(page.getByText("Budget Available")).toBeVisible();
    await expect(page.getByText("Team Headcount")).toBeVisible();

    // Verify Attribution chart is present
    await expect(page.getByText("Single-Variable Risk Attribution")).toBeVisible();

    // Verify Diff Explanation Panel with real explanation & badge
    await expect(page.getByText("Scenario Narrative & Risk Analysis")).toBeVisible();
    // In in-memory mode without external LLM keys, Phase 6 computes directly via template-fallback:
    const badge = page.getByTestId("source-badge-template");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/Computed directly/);
    await expect(page.getByTestId("diff-explanation-content")).toBeVisible();
  });
});
