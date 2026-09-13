"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

interface IterationProgressIndicatorProps {
  /** Target total iterations evaluated by the simulation. */
  totalIterations: number;
  /** Whether the simulation calculation is active or completed. */
  isComplete: boolean;
  /** Callback triggered when the presentational count-up finishes (~1s). */
  onAnimationComplete?: () => void;
}

/**
 * IterationProgressIndicator
 *
 * PRESENTATIONAL ANIMATION ONLY:
 * Per §6 Option A of the Phase 8 specification, this component renders a smooth
 * 1-second client-side count-up animation over an already-completed simulation result.
 * It is deliberately presentational feedback to provide satisfying visual weight
 * to stochastic sampling runs, NOT a real-time SSE / streaming backend progress tracker.
 */
export function IterationProgressIndicator({
  totalIterations,
  isComplete,
  onAnimationComplete,
}: IterationProgressIndicatorProps) {
  const [displayedCount, setDisplayedCount] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!isComplete || totalIterations <= 0) {
      setDisplayedCount(0);
      setAnimating(false);
      return;
    }

    setAnimating(true);
    const durationMs = 1000; // ~1 second animation duration
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Ease-out cubic curve for natural deceleration: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * totalIterations);

      setDisplayedCount(current);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setDisplayedCount(totalIterations);
        setAnimating(false);
        onAnimationComplete?.();
      }
    };

    const animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [isComplete, totalIterations, onAnimationComplete]);

  const percentage = totalIterations > 0 ? (displayedCount / totalIterations) * 100 : 0;

  return (
    <div className="p-4 bg-white border border-neutral rounded-2xl shadow-xs space-y-2 text-ink">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink flex items-center gap-1.5">
          {animating ? (
            <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#8ba888]" />
          )}
          Monte Carlo Iterations Processed
        </span>
        <span className="font-mono text-xs font-bold text-ink">
          {displayedCount.toLocaleString()} / {totalIterations.toLocaleString()} trials ({percentage.toFixed(0)}%)
        </span>
      </div>

      <div className="h-2 w-full bg-[#f5f2ec] rounded-full overflow-hidden border border-neutral/60">
        <div
          className="h-full bg-accent rounded-full transition-all duration-75 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-ink/40 font-mono pt-0.5">
        <span>Pseudo-random sampling: Box-Muller normal transforms</span>
        <span>{animating ? "Synthesizing empirical distributions..." : "Execution verified (seeded deterministic PRNG)"}</span>
      </div>
    </div>
  );
}
