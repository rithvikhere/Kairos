"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";
import { Activity, ShieldAlert, PieChart as PieIcon, TrendingUp } from "lucide-react";

export const DataVisualizationsSection: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Data 1: Horizontal Bar Chart - Risk Breakdown
  const riskBarData = [
    { name: "Staffing Risk", value: 76, color: "#b5502f", level: "High Risk", drag: "Brooks's Law team drag" },
    { name: "Schedule Risk", value: 38, color: "#c98a3e", level: "Moderate", drag: "Compressed timeline buffer" },
    { name: "Budget Risk", value: 22, color: "#8ba888", level: "Low Risk", drag: "Well within capital reserve" },
  ];

  // Data 2: Donut Chart - Project Scenario Mix
  const scenarioMixData = [
    { name: "Feasible Scenarios", value: 3, color: "#8ba888" },
    { name: "High Risk Scenarios", value: 1, color: "#c98a3e" },
    { name: "Critical Scenarios", value: 1, color: "#b5502f" },
  ];

  // Data 3: Monte Carlo Outcome Spread Curve (Distribution Bell Shape)
  const distributionData = [
    { week: "12w", probability: 2, isBeforeDeadline: true },
    { week: "13w", probability: 8, isBeforeDeadline: true },
    { week: "14w", probability: 22, isBeforeDeadline: true },
    { week: "15w", probability: 48, isBeforeDeadline: true },
    { week: "16w", probability: 74, isBeforeDeadline: true }, // Peak area
    { week: "17w", probability: 68, isBeforeDeadline: true }, // Cutoff at 17.5w
    { week: "18w", probability: 42, isBeforeDeadline: false },
    { week: "19w", probability: 20, isBeforeDeadline: false },
    { week: "20w", probability: 7, isBeforeDeadline: false },
    { week: "21w", probability: 2, isBeforeDeadline: false },
  ];

  return (
    <section
      id="analytics"
      className="py-24 px-6 sm:px-12 lg:px-20 bg-transparent text-[#d0fcf4] border-b border-[#d0fcf4]/15"
    >
      <div className="max-w-7xl mx-auto space-y-16">
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
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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

            {/* Custom Animated Horizontal Bars */}
            <div className="py-6 space-y-5 flex-1 flex flex-col justify-center">
              {riskBarData.map((item) => (
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

                  {/* Bar Background and Fill */}
                  <div className="h-3 w-full bg-[#454d4b] rounded-full overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
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

            {/* Donut Chart Visual */}
            <div className="py-4 flex flex-col items-center justify-center flex-1">
              <div className="relative w-48 h-48">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scenarioMixData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={900}
                        animationEasing="ease-out"
                      >
                        {scenarioMixData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#282c2d" strokeWidth={2} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {/* Center Donut Metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="font-serif text-2xl font-bold text-[#d0fcf4]">60%</span>
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

          {/* Card 3: Monte Carlo Outcome Spread (Histogram / Distribution with shaded band) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
              {/* Callout Label Badge */}
              <div className="mb-3 p-2.5 rounded-lg bg-[#8ba888]/20 border border-[#8ba888]/35 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8ba888]" />
                  <span className="font-sans text-xs font-medium text-[#d0fcf4]">
                    Probability On-Time
                  </span>
                </div>
                <span className="font-serif font-bold text-base text-[#78dec8]">78%</span>
              </div>

              {/* Area chart representing bell curve with shaded on-time confidence band */}
              <div className="w-full h-36">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="onTimeBand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8ba888" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#8ba888" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="week"
                        stroke="#d0fcf4"
                        strokeOpacity={0.3}
                        tick={{ fontSize: 10, fill: "#d0fcf4", opacity: 0.7 }}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const item = payload[0];
                            if (!item) return null;
                            const weekVal = item.payload?.week ?? "";
                            return (
                              <div className="p-2 rounded bg-[#222526] text-[#d0fcf4] text-[11px] font-sans shadow-md border border-[#d0fcf4]/15">
                                <div className="font-bold">{weekVal} delivery</div>
                                <div className="text-[#d0fcf4]/70">Frequency: {item.value}% of runs</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="probability"
                        stroke="#78dec8"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#onTimeBand)"
                        animationDuration={900}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
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
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
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
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
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

                  {/* The Primary Orchestrated Trade-Off Curve */}
                  <motion.path
                    d="M 20 170 Q 120 160 200 110 T 360 45"
                    fill="none"
                    stroke="#78dec8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 1.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />

                  {/* Key Frontier Anchor Point: Optimal Balance */}
                  <motion.g
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7, duration: 0.4 }}
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
