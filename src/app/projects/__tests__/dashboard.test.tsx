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

    // Find headcount slider by its role
    const sliders = screen.getAllByRole("slider");
    const headcountSlider = sliders[0];
    expect(headcountSlider).toHaveValue("10");

    // Adjust headcount to 6
    fireEvent.change(headcountSlider!, { target: { value: "6" } });
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

  it("triggers Monte Carlo simulation on button click", () => {
    renderDashboard();

    const mcBtn = screen.getByRole("button", { name: /run monte carlo/i });
    fireEvent.click(mcBtn);

    expect(screen.getByText(/Sampling 1,000 runs\.\.\./i)).toBeInTheDocument();
  });
});
