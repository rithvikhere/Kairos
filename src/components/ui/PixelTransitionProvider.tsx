"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface PixelSquare {
  id: number;
  col: number;
  row: number;
  color: string;
  coverDelayMs: number;
  revealDelayMs: number;
}

interface TransitionGrid {
  cols: number;
  rows: number;
  squares: PixelSquare[];
  maxCoverDurationMs: number;
  maxRevealDurationMs: number;
}

type TransitionPhase = "idle" | "covering" | "covered" | "revealing";

interface PixelTransitionContextValue {
  startTransition: (href: string, origin?: { x: number; y: number }) => void;
  isTransitioning: boolean;
}

const defaultContextValue: PixelTransitionContextValue = {
  startTransition: (href: string) => {
    if (typeof window !== "undefined") {
      window.location.href = href;
    }
  },
  isTransitioning: false,
};

const PixelTransitionContext = createContext<PixelTransitionContextValue | null>(null);

export function usePixelTransition() {
  const ctx = useContext(PixelTransitionContext);
  return ctx ?? defaultContextValue;
}

const BASE_DARK_COLORS = ["#181a1b", "#1c1f20", "#212426", "#25292a"];
const ACCENT_COLORS = ["#2c4356", "#3a5a6b", "#8ba888", "#78dec8"];

export const PixelTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [grid, setGrid] = useState<TransitionGrid | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);

  const startTransition = useCallback(
    (href: string, origin?: { x: number; y: number }) => {
      // 1. Accessibility: Check for prefers-reduced-motion
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        if (router) {
          router.push(href);
        } else if (typeof window !== "undefined") {
          window.location.href = href;
        }
        return;
      }

      // If already transitioning, don't re-trigger
      if (phase !== "idle") return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Click origin coordinates (default to center if not provided)
      const clickX = origin?.x ?? viewportWidth / 2;
      const clickY = origin?.y ?? viewportHeight / 2;

      // Adaptive square size: roughly 42px to 54px depending on viewport
      const targetSize = Math.max(40, Math.min(54, Math.floor(viewportWidth / 24) || 48));
      const cols = Math.ceil(viewportWidth / targetSize);
      const rows = Math.ceil(viewportHeight / targetSize);

      const squareW = viewportWidth / cols;
      const squareH = viewportHeight / rows;

      // Calculate max radial distance from click origin
      let maxDist = 1;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const sx = (c + 0.5) * squareW;
          const sy = (r + 0.5) * squareH;
          const dist = Math.hypot(sx - clickX, sy - clickY);
          if (dist > maxDist) maxDist = dist;
        }
      }

      const squares: PixelSquare[] = [];
      let idCounter = 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sx = (c + 0.5) * squareW;
          const sy = (r + 0.5) * squareH;
          const dist = Math.hypot(sx - clickX, sy - clickY);
          const normDist = dist / maxDist; // 0 (at click) to 1 (farthest corner)

          // 5-10% random accent flecks
          const rand = Math.random();
          let color = BASE_DARK_COLORS[Math.floor(Math.random() * BASE_DARK_COLORS.length)]!;
          if (rand < 0.08) {
            color = ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)]!;
          }

          // Cover ripple: radially outward from click point (0 to ~240ms delay) + slight jitter
          const coverJitter = Math.random() * 25;
          const coverDelayMs = Math.round(normDist * 220 + coverJitter);

          // Reveal ripple: opposite pattern (from edges inward) + random jitter
          const revealJitter = Math.random() * 30;
          const revealDelayMs = Math.round((1 - normDist) * 200 + revealJitter);

          squares.push({
            id: idCounter++,
            col: c,
            row: r,
            color,
            coverDelayMs,
            revealDelayMs,
          });
        }
      }

      const singleSquareDuration = 220; // ms
      const maxCoverDelay = Math.max(...squares.map((s) => s.coverDelayMs));
      const maxRevealDelay = Math.max(...squares.map((s) => s.revealDelayMs));
      const maxCoverDuration = maxCoverDelay + singleSquareDuration;
      const maxRevealDuration = maxRevealDelay + singleSquareDuration;

      setGrid({
        cols,
        rows,
        squares,
        maxCoverDurationMs: maxCoverDuration,
        maxRevealDurationMs: maxRevealDuration,
      });

      // Start Cover Phase
      setPhase("covering");

      // Once cover phase completes:
      cleanupTimeoutRef.current = setTimeout(() => {
        setPhase("covered");

        // Execute route change
        if (router) {
          router.push(href);
        } else if (typeof window !== "undefined") {
          window.location.href = href;
        }

        // Brief delay for route mount underneath, then start Reveal Phase
        cleanupTimeoutRef.current = setTimeout(() => {
          setPhase("revealing");

          // Once reveal completes, unmount overlay completely
          cleanupTimeoutRef.current = setTimeout(() => {
            setPhase("idle");
            setGrid(null);
          }, maxRevealDuration + 40);
        }, 80);
      }, maxCoverDuration);
    },
    [router, phase]
  );

  return (
    <PixelTransitionContext.Provider value={{ startTransition, isTransitioning: phase !== "idle" }}>
      {children}

      {/* Full-viewport Pixel Transition Overlay */}
      {grid && phase !== "idle" && (
        <div
          data-testid="pixel-transition-overlay"
          aria-hidden="true"
          className="fixed inset-0 z-[9999] pointer-events-auto select-none overflow-hidden"
          style={{
            backgroundColor: phase === "covered" ? "#181a1b" : "transparent",
            transition: phase === "covered" ? "background-color 40ms linear" : "none",
          }}
        >
          <div
            className="w-full h-full grid"
            style={{
              gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
              gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
            }}
          >
            {grid.squares.map((sq) => {
              const isCoveredOrCovering = phase === "covering" || phase === "covered";
              const isRevealing = phase === "revealing";

              // Delay based on current phase
              const delay = isRevealing ? sq.revealDelayMs : sq.coverDelayMs;
              // Easing: ease-out on cover, ease-in on reveal
              const timingFn = isRevealing
                ? "cubic-bezier(0.7, 0, 0.84, 0)" // accelerating pull away
                : "cubic-bezier(0.16, 1, 0.3, 1)"; // snap in & settle

              // Scale: 0 -> 1.04 on cover, 1.04 -> 0 on reveal
              const scale = isCoveredOrCovering ? 1.04 : 0;

              return (
                <div
                  key={sq.id}
                  className="w-[101.5%] h-[101.5%] origin-center"
                  style={{
                    backgroundColor: sq.color,
                    transform: `scale(${scale})`,
                    transitionProperty: "transform, opacity",
                    transitionDuration: "220ms",
                    transitionDelay: `${delay}ms`,
                    transitionTimingFunction: timingFn,
                    willChange: "transform",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </PixelTransitionContext.Provider>
  );
};

export default PixelTransitionProvider;
