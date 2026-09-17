import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import React from "react";
import { PageFadeProvider, usePageFade } from "../PageFadeContext.js";

const mockPush = vi.fn();
const mockPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: mockPrefetch,
  }),
  usePathname: () => "/",
}));

const TestTriggerButton: React.FC = () => {
  const { navigateWithFade, isFadingOut } = usePageFade();
  return (
    <div>
      <button data-testid="test-trigger" onClick={() => navigateWithFade("/projects")}>
        Go to Kairos
      </button>
      <span data-testid="fading-state">{isFadingOut ? "fading" : "idle"}</span>
    </div>
  );
};

describe("PageFadeContext with Crossfade Transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("prefetches /projects on provider mount", () => {
    render(
      <PageFadeProvider>
        <TestTriggerButton />
      </PageFadeProvider>
    );

    expect(mockPrefetch).toHaveBeenCalledWith("/projects");
  });

  it("renders page-fade-container without full-viewport overlay or content cloning", () => {
    const { container } = render(
      <PageFadeProvider>
        <TestTriggerButton />
      </PageFadeProvider>
    );

    const fadeContainer = container.querySelector(".page-fade-container") as HTMLElement;
    expect(fadeContainer).toBeInTheDocument();
    expect(fadeContainer.style.transition).toContain("opacity");
    expect(fadeContainer.style.opacity).toBe("1");
    // Confirm no PixelSwap overlay exists
    expect(container.querySelector(".pixel-swap")).not.toBeInTheDocument();
  });

  it("triggers opacity 1 -> 0 fade-out and calls router.push('/projects') after 280ms", () => {
    const { container } = render(
      <PageFadeProvider>
        <TestTriggerButton />
      </PageFadeProvider>
    );

    const btn = screen.getByTestId("test-trigger");
    const fadeContainer = container.querySelector(".page-fade-container") as HTMLElement;

    expect(fadeContainer.style.opacity).toBe("1");
    expect(screen.getByTestId("fading-state").textContent).toBe("idle");

    // Click Go to Kairos
    fireEvent.click(btn);

    // Fade out begins immediately
    expect(screen.getByTestId("fading-state").textContent).toBe("fading");
    expect(fadeContainer.style.opacity).toBe("0");

    // Before 280ms, router.push has not yet been called
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(mockPush).not.toHaveBeenCalled();

    // At 280ms, fade-out completes and router.push is executed
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(mockPush).toHaveBeenCalledWith("/projects");
  });

  it("respects prefers-reduced-motion: reduce and navigates instantly with no fade animation", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(
      <PageFadeProvider>
        <TestTriggerButton />
      </PageFadeProvider>
    );

    const btn = screen.getByTestId("test-trigger");
    const fadeContainer = container.querySelector(".page-fade-container") as HTMLElement;

    fireEvent.click(btn);

    // Instant navigation without delay
    expect(mockPush).toHaveBeenCalledWith("/projects");
    // Under reduced motion, no fade-out state is set
    expect(screen.getByTestId("fading-state").textContent).toBe("idle");
    expect(fadeContainer.style.opacity).toBe("1");

    window.matchMedia = originalMatchMedia;
  });
});
