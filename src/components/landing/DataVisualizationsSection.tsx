"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Activity, ShieldAlert, PieChart as PieIcon, TrendingUp } from "lucide-react";

// Hook: IntersectionObserver trigger that resets when scrolled out of view,
// so whenever the user scrolls back up (or back down) into view, the animation occurs again!
function useCardInView(
  ref: React.RefObject<Element>,
  shouldReduceMotion: boolean | null
) {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion || process.env.NODE_ENV === "test") {
      setIsInView(true);
      return;
    }

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsInView(true);
        } else {
          // Reset when element leaves the viewport so scrolling back up re-triggers entrance animation
          setIsInView(false);
        }
      },
      {
        threshold: 0.2, // 20% visibility triggers animation cleanly in both scroll directions
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, shouldReduceMotion]);

  return shouldReduceMotion || process.env.NODE_ENV === "test" || isInView;
}

// Hook: requestAnimationFrame count-up for synchronized counter
function useCountUp(
  target: number,
  isTriggered: boolean,
  durationMs: number,
  delayMs: number,
  shouldReduceMotion: boolean | null
) {
  const [count, setCount] = useState(shouldReduceMotion ? target : 0);

  useEffect(() => {
    if (shouldReduceMotion || process.env.NODE_ENV === "test") {
      setCount(target);
      return;
    }
    if (!isTriggered) {
      // Reset to 0 when out of view so count-up replays on scroll up
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const timeoutId = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(1, elapsed / durationMs);
        // Cubic ease-out
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.round(easeOut * target);
        setCount(currentVal);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          setCount(target);
        }
      };
      animationFrameId = requestAnimationFrame(step);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isTriggered, target, durationMs, delayMs, shouldReduceMotion]);

  return count;
}

export const DataVisualizationsSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Subtle background parallax
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const backgroundY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? ["0px", "0px"] : ["-35px", "35px"]
  );

  // Individual card refs for IntersectionObserver triggers
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card4Ref = useRef<HTMLDivElement>(null);

  const card1InView = useCardInView(card1Ref, shouldReduceMotion);
  const card2InView = useCardInView(card2Ref, shouldReduceMotion);
  const card3InView = useCardInView(card3Ref, shouldReduceMotion);
  const card4InView = useCardInView(card4Ref, shouldReduceMotion);

  // Stagger offsets between the 4 cards (~150ms cascade)
  const card1Delay = 0;
  const card2Delay = 0.15;
  const card3Delay = 0.30;
  const card4Delay = 0.45;

  // Data 1: Risk Breakdown Bars
  const riskBarData = [
    { name: "Staffing Risk", value: 76, color: "#b5502f", level: "High Risk", drag: "Brooks's Law team drag" },
    { name: "Schedule Risk", value: 38, color: "#c98a3e", level: "Moderate", drag: "Compressed timeline buffer" },
    { name: "Budget Risk", value: 22, color: "#8ba888", level: "Low Risk", drag: "Well within capital reserve" },
  ];

  // Data 2: Scenario Mix Donut Data
  const scenarioMixData = [
    { name: "Feasible Scenarios", value: 3, percentage: 60, color: "#8ba888" },
    { name: "High Risk Scenarios", value: 1, percentage: 20, color: "#c98a3e" },
    { name: "Critical Scenarios", value: 1, percentage: 20, color: "#b5502f" },
  ];

  // Donut geometry constants: radius=65, circumference ~408.4
  const radius = 65;
  const circumference = 2 * Math.PI * radius; // 408.407
  const gap = 4; // visual gap in pixels
  const arcFeasible = (0.60 * circumference) - gap;
  const arcHighRisk = (0.20 * circumference) - gap;
  const arcCritical = (0.20 * circumference) - gap;

  // Center percentage count-up for Donut (0 to 60 in sync with arc)
  const donutCenterCount = useCountUp(
    60,
    card2InView,
    800,
    shouldReduceMotion ? 0 : card2Delay * 1000,
    shouldReduceMotion
  );

  // Data 3: Monte Carlo Spread SVG Path
  const mcCurvePath = "M 20 118 C 45 118, 65 108, 87 92 C 105 78, 135 38, 153 25 C 168 15, 175 25, 187 35 C 200 45, 210 58, 220 68 C 235 84, 245 94, 253 96 C 275 100, 300 116, 320 118";
  const mcShadedBandPath = "M 20 118 C 45 118, 65 108, 87 92 C 105 78, 135 38, 153 25 C 168 15, 175 25, 187 35 C 193 40, 199 45, 204 50 L 204 118 L 20 118 Z";

  return (
    <section
      id="analytics"
      ref={sectionRef}
      className="relative py-28 sm:py-32 px-6 sm:px-12 lg:px-20 bg-transparent text-[#d0fcf4] overflow-hidden"
    >
      {/* Background layer with subtle parallax & ambient glow */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 pointer-events-none -z-10 bg-[#303537]"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(120,222,200,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_80%,rgba(58,90,107,0.12),transparent_50%)]" />
      </motion.div>

      {/* Top gradient blend transition receiving Hero */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-[#303537] via-[#303537]/80 to-transparent z-0"
        aria-hidden="true"
      />

      {/* Bottom gradient blend transition into FeatureShowcase */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-b from-transparent via-[#2b3134]/80 to-[#282e31] z-0"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-16">
        {/* Section Title */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-sans text-[#d0fcf4] bg-[#2c4356]/40 border border-[#2c4356]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d0fcf4]" />
            <span>Analytical Rigor</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#d0fcf4] leading-[1.15]">
            Structure and color that <br />
            <span className="italic font-serif text-[#78dec8]">encode true meaning.</span>
          </h2>

          <p className="text-base sm:text-lg text-[#d0fcf4]/80 font-sans font-normal leading-relaxed">
            Visualizations in Kairos do not use arbitrary colors or decorative gradients. Colors
            strictly map to computed risk levels — Sage for feasible margins, Amber for
            vulnerability, and Terracotta for critical thresholds.
          </p>
        </div>

        {/* 4 Analytics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card 1: Horizontal Bar Chart - Risk Breakdown */}
          <motion.div
            ref={card1Ref}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: card1InView ? 1 : 0, y: card1InView ? 0 : 24 }}
            transition={{
              duration: shouldReduceMotion ? 0 : (card1InView ? 0.6 : 0.01),
              delay: shouldReduceMotion ? 0 : (card1InView ? card1Delay : 0),
              ease: [0.16, 1, 0.3, 1],
            }}
            className="p-6 rounded-2xl bg-[#282c2d] border border-[#d0fcf4]/15 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3 pb-4 border-b border-[#d0fcf4]/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#78dec8]">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Scenario Risk Breakdown</span>
                </div>
                <span className="font-mono text-[11px] text-[#d0fcf4]/60">0–100 Clamped</span>
              </div>
              <h3 className="font-serif text-xl font-medium text-[#d0fcf4]">
                Multi-Axis Risk Scoring
              </h3>
              <p className="text-xs text-[#d0fcf4]/70 font-sans leading-relaxed">
                Aggregates communication drag, deadline tightness, and burn rate. Evaluates whether
                headcount additions actually create negative marginal returns.
              </p>
            </div>

            {/* Custom Animated Horizontal Bars - staggered top to bottom */}
            <div className="py-6 space-y-5 flex-1 flex flex-col justify-center">
              {riskBarData.map((item, barIndex) => (
                <div key={item.name} className="space-y-1.5 font-sans">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#d0fcf4]">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: item.color }}
                      >
                        {item.level}
                      </span>
                      <span className="font-mono font-bold text-sm" style={{ color: item.color }}>
                        {item.value}%
                      </span>
                    </div>
                  </div>

                  {/* Bar Background and Staggered Fill (120ms apart) */}
                  <div className="h-3 w-full bg-[#454d4b] rounded-full overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: card1InView ? `${item.value}%` : 0 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : (card1InView ? 0.75 : 0.01),
                        delay: shouldReduceMotion ? 0 : (card1InView ? card1Delay + barIndex * 0.12 : 0),
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>

                  <div className="text-[11px] text-[#d0fcf4]/55 italic">{item.drag}</div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#d0fcf4]/15 flex items-center justify-between text-xs font-sans text-[#d0fcf4]/60">
              <span>Overall Scenario Risk:</span>
              <span className="font-serif font-bold text-base text-[#e07a5f]">68 / 100</span>
            </div>
          </motion.div>

          {/* Card 2: Donut Chart - Project Scenario Mix */}
          <motion.div
            ref={card2Ref}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: card2InView ? 1 : 0, y: card2InView ? 0 : 24 }}
            transition={{
              duration: shouldReduceMotion ? 0 : (card2InView ? 0.6 : 0.01),
              delay: shouldReduceMotion ? 0 : (card2InView ? card2Delay : 0),
              ease: [0.16, 1, 0.3, 1],
            }}
            className="p-6 rounded-2xl bg-[#282c2d] border border-[#d0fcf4]/15 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3 pb-4 border-b border-[#d0fcf4]/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#78dec8]">
                  <PieIcon className="w-4 h-4" />
                  <span>Portfolio Distribution</span>
                </div>
                <span className="font-mono text-[11px] text-[#d0fcf4]/60">5 Total Scenarios</span>
              </div>
              <h3 className="font-serif text-xl font-medium text-[#d0fcf4]">
                Scenario Portfolio Mix
              </h3>
              <p className="text-xs text-[#d0fcf4]/70 font-sans leading-relaxed">
                Tracks the proportion of safe vs. high-exposure branches across your project so
                leadership never bets on single fragile assumptions.
              </p>
            </div>

            {/* Sweeping Arc Donut Chart Visual */}
            <div className="py-4 flex flex-col items-center justify-center flex-1">
              <div className="relative w-48 h-48">
                <svg
                  viewBox="0 0 192 192"
                  className="w-full h-full overflow-visible"
                  aria-label="Scenario portfolio mix donut chart"
                >
                  {/* Segment 1: Feasible (60% arc) - draws 0ms to 420ms */}
                  <motion.circle
                    cx="96"
                    cy="96"
                    r={radius}
                    fill="none"
                    stroke="#8ba888"
                    strokeWidth="18"
                    strokeLinecap="butt"
                    strokeDasharray={`${arcFeasible} ${circumference - arcFeasible}`}
                    transform="rotate(-90 96 96)"
                    initial={{ strokeDashoffset: arcFeasible }}
                    animate={{ strokeDashoffset: card2InView ? 0 : arcFeasible }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : (card2InView ? 0.45 : 0.01),
                      delay: shouldReduceMotion ? 0 : (card2InView ? card2Delay : 0),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />

                  {/* Segment 2: High Risk (20% arc) - draws 430ms to 630ms */}
                  <motion.circle
                    cx="96"
                    cy="96"
                    r={radius}
                    fill="none"
                    stroke="#c98a3e"
                    strokeWidth="18"
                    strokeLinecap="butt"
                    strokeDasharray={`${arcHighRisk} ${circumference - arcHighRisk}`}
                    transform="rotate(126 96 96)"
                    initial={{ strokeDashoffset: arcHighRisk }}
                    animate={{ strokeDashoffset: card2InView ? 0 : arcHighRisk }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : (card2InView ? 0.22 : 0.01),
                      delay: shouldReduceMotion ? 0 : (card2InView ? card2Delay + 0.43 : 0),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />

                  {/* Segment 3: Critical (20% arc) - draws 630ms to 850ms */}
                  <motion.circle
                    cx="96"
                    cy="96"
                    r={radius}
                    fill="none"
                    stroke="#b5502f"
                    strokeWidth="18"
                    strokeLinecap="butt"
                    strokeDasharray={`${arcCritical} ${circumference - arcCritical}`}
                    transform="rotate(198 96 96)"
                    initial={{ strokeDashoffset: arcCritical }}
                    animate={{ strokeDashoffset: card2InView ? 0 : arcCritical }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : (card2InView ? 0.22 : 0.01),
                      delay: shouldReduceMotion ? 0 : (card2InView ? card2Delay + 0.63 : 0),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </svg>

                {/* Center Donut Metric with synchronized counting */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="font-serif text-2xl font-bold text-[#d0fcf4]">
                    {donutCenterCount}%
                  </span>
                  <span className="text-[10px] uppercase font-sans tracking-wider text-[#8ba888] font-semibold">
                    Feasible
                  </span>
                </div>
              </div>

              {/* Legend with matching risk signals */}
              <div className="w-full space-y-2 pt-3 font-sans text-xs">
                {scenarioMixData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[#d0fcf4]/80">{item.name}</span>
                    </div>
                    <span className="font-mono font-semibold text-[#d0fcf4]">
                      {item.value} {item.value === 1 ? "branch" : "branches"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#d0fcf4]/15 flex items-center justify-between text-xs font-sans text-[#d0fcf4]/60">
              <span>Selected Branch:</span>
              <span className="font-medium text-[#d0fcf4]">Accelerated Q3 (High Risk)</span>
            </div>
          </motion.div>

          {/* Card 3: Monte Carlo Outcome Spread */}
          <motion.div
            ref={card3Ref}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: card3InView ? 1 : 0, y: card3InView ? 0 : 24 }}
            transition={{
              duration: shouldReduceMotion ? 0 : (card3InView ? 0.6 : 0.01),
              delay: shouldReduceMotion ? 0 : (card3InView ? card3Delay : 0),
              ease: [0.16, 1, 0.3, 1],
            }}
            className="p-6 rounded-2xl bg-[#282c2d] border border-[#d0fcf4]/15 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3 pb-4 border-b border-[#d0fcf4]/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#78dec8]">
                  <TrendingUp className="w-4 h-4" />
                  <span>Stochastic Analysis</span>
                </div>
                <span className="font-mono text-[11px] text-[#d0fcf4]/60">N = 1,000 Runs</span>
              </div>
              <h3 className="font-serif text-xl font-medium text-[#d0fcf4]">
                Monte Carlo Spread
              </h3>
              <p className="text-xs text-[#d0fcf4]/70 font-sans leading-relaxed">
                Instead of a single date, Kairos runs 1,000 randomized iterations across task variance
                to calculate true completion odds.
              </p>
            </div>

            {/* Distribution Curve Visual */}
            <div className="py-4 flex-1 flex flex-col justify-center">
              {/* Callout Label Badge - fades/slides in AFTER the curve finishes drawing */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{
                  opacity: card3InView ? 1 : 0,
                  y: card3InView ? 0 : -8,
                }}
                transition={{
                  duration: shouldReduceMotion ? 0 : (card3InView ? 0.45 : 0.01),
                  delay: shouldReduceMotion ? 0 : (card3InView ? card3Delay + 0.8 : 0),
                  ease: "easeOut",
                }}
                className="mb-3 p-2.5 rounded-lg bg-[#8ba888]/20 border border-[#8ba888]/35 flex items-center justify-between min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8ba888]" />
                  <span className="font-sans text-xs font-medium text-[#d0fcf4]">
                    Probability On-Time
                  </span>
                </div>
                <span className="font-serif font-bold text-base text-[#78dec8]">78%</span>
              </motion.div>

              {/* Precise Bell Curve SVG with Left-to-Right path length draw */}
              <div className="relative w-full h-36">
                <svg
                  viewBox="0 0 340 140"
                  className="w-full h-full overflow-visible"
                  aria-label="Monte Carlo bell curve distribution"
                >
                  <defs>
                    <linearGradient id="onTimeBandSvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8ba888" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#8ba888" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>

                  {/* Baseline reference axis */}
                  <line
                    x1="20"
                    y1="118"
                    x2="320"
                    y2="118"
                    stroke="#d0fcf4"
                    strokeOpacity={0.15}
                    strokeWidth="1"
                  />

                  {/* Target Cutoff Line at 17.5w */}
                  <line
                    x1="204"
                    y1="25"
                    x2="204"
                    y2="118"
                    stroke="#78dec8"
                    strokeOpacity={0.4}
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x="204"
                    y="18"
                    textAnchor="middle"
                    className="font-sans text-[9px] font-medium fill-[#78dec8]"
                  >
                    Target 17.5w
                  </text>

                  {/* Shaded on-time confidence band under curve */}
                  <motion.path
                    d={mcShadedBandPath}
                    fill="url(#onTimeBandSvg)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: card3InView ? 1 : 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : (card3InView ? 0.6 : 0.01),
                      delay: shouldReduceMotion ? 0 : (card3InView ? card3Delay + 0.25 : 0),
                      ease: "easeOut",
                    }}
                  />

                  {/* The Bell Curve Line drawing left-to-right via pathLength */}
                  <motion.path
                    d={mcCurvePath}
                    fill="none"
                    stroke="#78dec8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: card3InView ? 1 : 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : (card3InView ? 0.75 : 0.01),
                      delay: shouldReduceMotion ? 0 : (card3InView ? card3Delay : 0),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />

                  {/* X Axis Tick Labels */}
                  <text x="20" y="133" className="font-sans text-[10px] fill-[#d0fcf4]/50">
                    12w
                  </text>
                  <text x="87" y="133" className="font-sans text-[10px] fill-[#d0fcf4]/50">
                    14w
                  </text>
                  <text x="153" y="133" className="font-sans text-[10px] fill-[#d0fcf4]/50">
                    16w
                  </text>
                  <text x="220" y="133" className="font-sans text-[10px] fill-[#d0fcf4]/50">
                    18w
                  </text>
                  <text x="287" y="133" className="font-sans text-[10px] fill-[#d0fcf4]/50">
                    20w
                  </text>
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] font-sans text-[#d0fcf4]/65 pt-1 px-1">
                <span>P10: 14.2 wks</span>
                <span className="font-medium text-[#78dec8]">Target: 17.5 wks</span>
                <span>P90: 19.8 wks</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#d0fcf4]/15 flex items-center justify-between text-xs font-sans text-[#d0fcf4]/60">
              <span>Uncertainty Margin:</span>
              <span className="font-mono text-[#78dec8] font-semibold">&plusmn;2.8 wks at 90% CI</span>
            </div>
          </motion.div>

          {/* Card 4: Delivery Trade-off Frontier */}
          <motion.div
            ref={card4Ref}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: card4InView ? 1 : 0, y: card4InView ? 0 : 24 }}
            transition={{
              duration: shouldReduceMotion ? 0 : (card4InView ? 0.6 : 0.01),
              delay: shouldReduceMotion ? 0 : (card4InView ? card4Delay : 0),
              ease: [0.16, 1, 0.3, 1],
            }}
            className="p-6 rounded-2xl bg-[#282c2d] border border-[#d0fcf4]/15 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3 pb-4 border-b border-[#d0fcf4]/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#78dec8]">
                  <Activity className="w-4 h-4" />
                  <span>Trade-off Optimization</span>
                </div>
                <span className="font-mono text-[11px] text-[#d0fcf4]/60">P50 / P90 Envelope</span>
              </div>
              <h3 className="font-serif text-xl font-medium text-[#d0fcf4]">
                Delivery Trade-off Frontier
              </h3>
              <p className="text-xs text-[#d0fcf4]/70 font-sans leading-relaxed">
                Calculates non-linear returns from headcount additions. Identifies the mathematical apex
                between delivery velocity and team coordination overhead.
              </p>
            </div>

            {/* SVG Drawing Canvas */}
            <div className="py-4 flex-1 flex flex-col justify-center">
              <div className="relative w-full h-36">
                <svg
                  viewBox="0 0 380 200"
                  className="w-full h-full overflow-visible"
                  aria-label="Simulation frontier curve diagram"
                >
                  <defs>
                    <linearGradient id="frontierBandGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2c4356" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#2c4356" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Subtle Gridlines */}
                  <line x1="20" y1="170" x2="360" y2="170" stroke="#d0fcf4" strokeOpacity="0.15" strokeWidth="1" />
                  <line x1="20" y1="115" x2="360" y2="115" stroke="#d0fcf4" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="60" x2="360" y2="60" stroke="#d0fcf4" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="20" x2="20" y2="170" stroke="#d0fcf4" strokeOpacity="0.15" strokeWidth="1" />

                  {/* Shaded confidence region */}
                  <motion.path
                    d="M 20 170 Q 120 160 200 110 T 360 45 L 360 170 Z"
                    fill="url(#frontierBandGradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: card4InView ? 1 : 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : (card4InView ? 0.8 : 0.01),
                      delay: shouldReduceMotion ? 0 : (card4InView ? card4Delay + 0.2 : 0),
                      ease: "easeOut",
                    }}
                  />

                  {/* Baseline reference curve (faint dashed) */}
                  <path
                    d="M 20 170 Q 140 155 240 125 T 360 85"
                    fill="none"
                    stroke="#d0fcf4"
                    strokeOpacity="0.25"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* The Primary Trade-Off Curve - draws left-to-right */}
                  <motion.path
                    d="M 20 170 Q 120 160 200 110 T 360 45"
                    fill="none"
                    stroke="#78dec8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: card4InView ? 1 : 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : (card4InView ? 0.8 : 0.01),
                      delay: shouldReduceMotion ? 0 : (card4InView ? card4Delay : 0),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />

                  {/* Key Frontier Anchor Point: Appears with pulse/settle only after curve reaches (200, 110) */}
                  <motion.g
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: card4InView ? 1 : 0,
                      scale: card4InView ? [0, 1.25, 1] : 0,
                    }}
                    transition={{
                      delay: shouldReduceMotion ? 0 : (card4InView ? card4Delay + 0.52 : 0),
                      duration: shouldReduceMotion ? 0 : (card4InView ? 0.35 : 0.01),
                      ease: "easeOut",
                    }}
                    style={{ transformOrigin: "200px 110px" }}
                  >
                    <circle cx="200" cy="110" r="5" fill="#78dec8" />
                    <circle cx="200" cy="110" r="9" stroke="#78dec8" strokeWidth="1.5" strokeOpacity="0.5" fill="none" />
                    <text
                      x="212"
                      y="105"
                      className="font-sans text-[10px] font-semibold fill-[#78dec8]"
                    >
                      Optimum Feasibility (78%)
                    </text>
                  </motion.g>

                  {/* Axis Labels */}
                  <text x="20" y="190" className="font-sans text-[10px] fill-[#d0fcf4]/50">
                    Headcount Allocation →
                  </text>
                  <text x="360" y="190" textAnchor="end" className="font-sans text-[10px] fill-[#d0fcf4]/50">
                    Delivery Velocity
                  </text>
                </svg>
              </div>
            </div>

            {/* Bottom Caption Pill */}
            <div className="pt-4 border-t border-[#d0fcf4]/15 flex items-center justify-between text-xs font-sans text-[#d0fcf4]/70">
              <span>Brooks&apos;s Law Drag Factor: 1.42x</span>
              <span className="text-[#8ba888] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8ba888]" />
                Low Risk Zone
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DataVisualizationsSection;
