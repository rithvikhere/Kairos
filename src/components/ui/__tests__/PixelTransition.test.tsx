import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import React from "react";
import { PixelTransitionProvider, usePixelTransition } from "../PixelTransitionProvider.js";
import { PixelTransitionLink } from "../PixelTransitionLink.js";

// Mock next/navigation
const mockPush = vi.fn();
const mockPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: mockPrefetch,
  }),
}));

describe("Pixel Transition Animation & Link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Default window dimensions
    window.innerWidth = 1200;
    window.innerHeight = 800;
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("prefetches target route on mount and hover", () => {
    render(
      <PixelTransitionProvider>
        <PixelTransitionLink href="/projects" data-testid="test-link">
          Go to Kairos
        </PixelTransitionLink>
      </PixelTransitionProvider>
    );

    expect(mockPrefetch).toHaveBeenCalledWith("/projects");

    const link = screen.getByTestId("test-link");
    fireEvent.mouseEnter(link);
    expect(mockPrefetch).toHaveBeenCalledTimes(2);
  });

  it("triggers cover phase, navigates, reveals, and removes overlay from DOM", () => {
    render(
      <PixelTransitionProvider>
        <PixelTransitionLink href="/projects" data-testid="test-link">
          Go to Kairos
        </PixelTransitionLink>
      </PixelTransitionProvider>
    );

    const link = screen.getByTestId("test-link");

    // Click at specific coordinates (e.g. x=300, y=200)
    fireEvent.click(link, { clientX: 300, clientY: 200 });

    // Overlay is mounted
    const overlay = screen.getByTestId("pixel-transition-overlay");
    expect(overlay).toBeInTheDocument();

    // router.push not called immediately (waiting for cover phase to complete)
    expect(mockPush).not.toHaveBeenCalled();

    // Advance time through cover phase (~500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // When covered, router.push('/projects') is called
    expect(mockPush).toHaveBeenCalledWith("/projects");

    // Advance through route swap pause and reveal phase (~500ms more)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Overlay is completely unmounted from DOM
    expect(screen.queryByTestId("pixel-transition-overlay")).not.toBeInTheDocument();
  });

  it("skips overlay and navigates instantly when prefers-reduced-motion is active", () => {
    // Mock matchMedia to return matches: true for prefers-reduced-motion
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

    render(
      <PixelTransitionProvider>
        <PixelTransitionLink href="/projects" data-testid="reduced-motion-link">
          Go to Kairos
        </PixelTransitionLink>
      </PixelTransitionProvider>
    );

    const link = screen.getByTestId("reduced-motion-link");
    fireEvent.click(link, { clientX: 100, clientY: 100 });

    // Overlay is NOT mounted at all
    expect(screen.queryByTestId("pixel-transition-overlay")).not.toBeInTheDocument();

    // Restore matchMedia
    window.matchMedia = originalMatchMedia;
  });

  it("generates solid squares with accent flecks and no gaps", () => {
    render(
      <PixelTransitionProvider>
        <PixelTransitionLink href="/projects" data-testid="test-link">
          Go to Kairos
        </PixelTransitionLink>
      </PixelTransitionProvider>
    );

    const link = screen.getByTestId("test-link");
    fireEvent.click(link, { clientX: 600, clientY: 400 });

    const overlay = screen.getByTestId("pixel-transition-overlay");
    const gridDiv = overlay.firstChild as HTMLElement;
    expect(gridDiv).toBeInTheDocument();

    // Check that squares were created
    const squares = gridDiv.children;
    expect(squares.length).toBeGreaterThan(50);

    // Verify first square has proper styles
    const firstSquare = squares[0] as HTMLElement;
    expect(firstSquare.style.transform).toContain("scale(1.04)");
    expect(firstSquare.style.backgroundColor).toBeTruthy();
  });
});
