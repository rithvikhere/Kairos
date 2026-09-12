"use client";

import React, { useEffect, useState } from "react";
import type { RiskBand } from "../../lib/riskBand.js";
import { RISK_COLOR_MAP } from "../../lib/riskColorMap.js";
import { Silk } from "./Silk.js";

export interface RiskSilkBackgroundProps {
  riskBand?: RiskBand | "neutral";
  className?: string;
}

/**
 * Animated risk-responsive background wrapping the Silk primitive.
 *
 * Interpolates color, noiseIntensity, and speed (~800ms) as the scenario's
 * risk band transitions between low, moderate, high, critical, or neutral.
 *
 * Under prefers-reduced-motion: reduce, smoothly degrades to a static color fill
 * without animated canvas turbulence.
 */
export const RiskSilkBackground: React.FC<RiskSilkBackgroundProps> = ({
  riskBand = "neutral",
  className = "",
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const target = RISK_COLOR_MAP[riskBand];

  // Interpolated animated values
  const [currentSpeed, setCurrentSpeed] = useState(target.speed);
  const [currentNoise, setCurrentNoise] = useState(target.noiseIntensity);
  const [currentColor, setCurrentColor] = useState(target.color);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // 800ms smooth interpolation between risk states
  useEffect(() => {
    if (prefersReducedMotion) {
      setCurrentColor(target.color);
      return;
    }

    const duration = 800; // ms
    const startTime = performance.now();
    const startSpeed = currentSpeed;
    const startNoise = currentNoise;
    const targetSpeed = target.speed;
    const targetNoise = target.noiseIntensity;

    setCurrentColor(target.color);

    let frameId: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      setCurrentSpeed(startSpeed + (targetSpeed - startSpeed) * ease);
      setCurrentNoise(startNoise + (targetNoise - startNoise) * ease);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target.color, target.speed, target.noiseIntensity, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div
        data-testid="risk-silk-reduced-motion-fallback"
        className={`fixed inset-0 pointer-events-none transition-colors duration-700 z-0 ${className}`}
        style={{ backgroundColor: target.color }}
      />
    );
  }

  return (
    <div
      data-testid="risk-silk-container"
      className={`fixed inset-0 pointer-events-none transition-opacity duration-700 z-0 opacity-40 overflow-hidden ${className}`}
    >
      <Silk
        color={currentColor}
        speed={currentSpeed}
        noiseIntensity={currentNoise}
        scale={1.0}
        lightMode={true}
      />
    </div>
  );
};

export default RiskSilkBackground;
