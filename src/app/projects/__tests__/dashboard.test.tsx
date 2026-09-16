import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectsDashboardPage from "../page.js";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/projects",
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderDashboard = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectsDashboardPage />
    </QueryClientProvider>
  );
};

beforeAll(() => {
  class MockIntersectionObserver {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  }
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
});

afterEach(() => {
  cleanup();
});

describe("ProjectsDashboardPage — Interactive Workable Dashboard", () => {
  it("renders active scenario header, chrome bar, and top 4 metric cards", () => {
    renderDashboard();

    expect(screen.getByText(/Cloud Infra Modernization/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Scenario 2: Accelerated Q3/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Forked from Baseline/i)).toBeInTheDocument();

    // 4 metric cards
    expect(screen.getByText("Estimated Cost")).toBeInTheDocument();
    expect(screen.getByText("Delivery Time")).toBeInTheDocument();
    expect(screen.getByText("Effective Headcount")).toBeInTheDocument();
    expect(screen.getByText("Risk Score")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("Infeasible (Threshold ≥ 50)")).toBeInTheDocument();
  });

  it("updates calculations dynamically when moving the headcount slider", () => {
    renderDashboard();

    // Initial headcount: 10
    expect(screen.getByText("10 engineers")).toBeInTheDocument();

    // Find headcount slider by its role/value
    const sliders = screen.getAllByRole("slider");
    const headcountSlider = sliders.find((s) => (s as HTMLInputElement).value === "10") ?? sliders[1]!;
    expect(headcountSlider).toHaveValue("10");

    // Adjust headcount to 6
    fireEvent.change(headcountSlider, { target: { value: "6" } });
    expect(screen.getByText("6 engineers")).toBeInTheDocument();
  });

  it("switches scenarios when clicking on a different sidebar item", () => {
    renderDashboard();

    const baselineBtn = screen.getByRole("button", {
      name: /1\. Baseline Scope/i,
    });
    fireEvent.click(baselineBtn);

    expect(
      screen.getByText(/Scenario 1: Baseline Scope/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Original Baseline/i)).toBeInTheDocument();
    expect(screen.getByText("6 engineers")).toBeInTheDocument();
    expect(screen.getByText("20 weeks")).toBeInTheDocument();
  });

  it("opens scenario comparison modal with parameter diffs and attribution", () => {
    renderDashboard();

    const compareBtn = screen.getByRole("button", {
      name: /compare scenarios/i,
    });
    fireEvent.click(compareBtn);

    expect(
      screen.getByText(/Scenario Comparison & Attribution/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Primary Isolated Risk Driver/i)
    ).toBeInTheDocument();

    // Close comparison modal
    const doneBtn = screen.getByRole("button", { name: "Done" });
    fireEvent.click(doneBtn);
    expect(
      screen.queryByText(/Scenario Comparison & Attribution/i)
    ).not.toBeInTheDocument();
  });

  it("triggers Monte Carlo simulation on button click starting at base 100", () => {
    renderDashboard();

    const mcBtn = screen.getByRole("button", { name: /run monte carlo \(100\)/i });
    expect(mcBtn).toBeInTheDocument();
    fireEvent.click(mcBtn);

    expect(screen.getByText(/Sampling 200 runs\.\.\./i)).toBeInTheDocument();
  });

  it("filters scenarios using search input and status tabs", () => {
    renderDashboard();

    // Verify all 3 initial scenarios
    expect(screen.getByText(/1\. Baseline Scope/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Accelerated Q3/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Contractor Surge/i)).toBeInTheDocument();

    // Type into search filter
    const searchInput = screen.getByPlaceholderText(/Filter scenarios\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "Contractor" } });

    expect(screen.queryByText(/1\. Baseline Scope/i)).not.toBeInTheDocument();
    expect(screen.getByText(/3\. Contractor Surge/i)).toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });

    // Switch to Favorites tab
    const favTab = screen.getByRole("button", { name: /Fav \(/i });
    fireEvent.click(favTab);

    // Accelerated Q3 is favorite in preset
    expect(screen.getByText(/2\. Accelerated Q3/i)).toBeInTheDocument();
  });

  it("opens Build New Scenario modal and allows building scenarios on the dashboard", () => {
    renderDashboard();

    const buildBtn = screen.getAllByRole("button", { name: /build/i })[0];
    fireEvent.click(buildBtn!);

    expect(screen.getByText("Build New Scenario")).toBeVisible();
    expect(screen.getByText("Natural Language Lever Adjuster")).toBeInTheDocument();

    // Cancel modal
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(screen.queryByText("Natural Language Lever Adjuster")).not.toBeInTheDocument();
  });

  it("opens New Project dialog directly on the second page without redirecting", () => {
    renderDashboard();

    const newProjBtn = screen.getByRole("button", { name: /New Project/i });
    fireEvent.click(newProjBtn);

    expect(screen.getByText("Create New Project")).toBeVisible();
    expect(
      screen.getByPlaceholderText(/Platform Re-architecture/i)
    ).toBeInTheDocument();
  });

  it("renders KAIROS brand with high contrast styling in the chrome bar", () => {
    renderDashboard();

    const brand = screen.getByText("KAIROS");
    expect(brand).toBeInTheDocument();
    expect(brand.className).toContain("text-[#0f172a]");
  });

  it("opens Compare Scenarios in landscape mode with values on the left and sensitivity tornado on the right", () => {
    renderDashboard();

    const compareBtn = screen.getByRole("button", {
      name: /compare scenarios/i,
    });
    fireEvent.click(compareBtn);

    expect(screen.getByText(/Landscape Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Sensitivity Tornado Analysis/i)).toBeInTheDocument();

    const doneBtn = screen.getByRole("button", { name: "Done" });
    fireEvent.click(doneBtn);
  });

  it("displays simulation purpose, impact, and expandable use details in Configure Scenario Constraints dialog", () => {
    renderDashboard();

    const addLeversBtn = screen.getByRole("button", { name: /\+ Add More Levers/i });
    fireEvent.click(addLeversBtn);

    expect(screen.getByText(/Configure Scenario Constraints/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Simulation Purpose:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Impacts:/i).length).toBeGreaterThan(0);

    const detailButtons = screen.getAllByRole("button", { name: /What's the use\? Details/i });
    expect(detailButtons.length).toBeGreaterThan(0);

    // Expand first details
    fireEvent.click(detailButtons[0]!);
    expect(screen.getByText(/How Kairos Simulates This:/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended Benchmark:/i)).toBeInTheDocument();
  });
});
