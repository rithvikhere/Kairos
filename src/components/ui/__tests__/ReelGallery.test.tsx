import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { ReelGallery } from "../ReelGallery.js";

describe("ReelGallery Component", () => {
  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock requestAnimationFrame & cancelAnimationFrame
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 16);
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders with pointer-events-none and role/aria-hidden for pure background presentation", () => {
    render(<ReelGallery />);
    const gallery = screen.getByTestId("reel-gallery-background");

    expect(gallery).toBeInTheDocument();
    expect(gallery).toHaveAttribute("aria-hidden", "true");
    expect(gallery.className).toContain("pointer-events-none");
    expect(gallery.className).toContain("select-none");
  });

  it("renders all rows and populated photo images from the photo set", () => {
    const customPhotos = [
      "/photos/beatriz-cattel-C55M3wxaoB0-unsplash.jpg",
      "/photos/celine-ylmz-Qe6F668-RQg-unsplash.jpg",
      "/photos/daniil-komov-dma_e1UKkig-unsplash.jpg",
    ];

    const { container } = render(
      <ReelGallery images={customPhotos} rows={4} />
    );

    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);

    // Ensure image sources match custom photos
    const srcList = Array.from(images).map((img) => img.getAttribute("src"));
    expect(srcList.some((s) => s?.includes("beatriz-cattel"))).toBe(true);
    expect(srcList.some((s) => s?.includes("celine-ylmz"))).toBe(true);
  });

  it("produces zero state change or error on hover and click interactions", () => {
    const { container } = render(<ReelGallery />);
    const gallery = screen.getByTestId("reel-gallery-background");

    // Firing mouse events should not throw or change active elements
    expect(() => {
      fireEvent.mouseOver(gallery);
      fireEvent.mouseMove(gallery, { clientX: 100, clientY: 100 });
      fireEvent.click(gallery);
      fireEvent.mouseLeave(gallery);
    }).not.toThrow();

    // Still pointer-events-none
    expect(gallery.className).toContain("pointer-events-none");
  });

  it("applies the bone overlay color token (#f6f4ef) with 75% opacity", () => {
    const { container } = render(
      <ReelGallery overlayColor="#f6f4ef" overlayOpacity={0.75} />
    );

    const overlays = container.querySelectorAll('div[style*="background-color"]');
    const hasBoneOverlay = Array.from(overlays).some((el) => {
      const style = (el as HTMLElement).style;
      return (
        (style.backgroundColor === "rgb(246, 244, 239)" || style.backgroundColor === "#f6f4ef") &&
        style.opacity === "0.75"
      );
    });

    expect(hasBoneOverlay).toBe(true);
  });

  it("respects prefers-reduced-motion without errors", () => {
    // Set matchMedia to return true for reduced motion
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

    render(<ReelGallery />);
    const gallery = screen.getByTestId("reel-gallery-background");
    expect(gallery).toBeInTheDocument();
  });
});
