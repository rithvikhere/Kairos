"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MonteCarloResult } from "../../domain/monteCarlo.js";

export interface MonteCarloDistributionChartProps {
  monteCarlo: MonteCarloResult;
}

type MetricKey = "riskScore" | "estimatedTimeWeeks" | "actualCost" | "budgetUtilization";

export const MonteCarloDistributionChart: React.FC<MonteCarloDistributionChartProps> = ({
  monteCarlo,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("riskScore");

  const metricConfig: Record<
    MetricKey,
    { label: string; format: (n: number) => string; target?: number }
  > = {
    riskScore: {
      label: "Composite Risk Score (0-100)",
      format: (n) => n.toFixed(1),
      target: 50, // FEASIBILITY_RISK_THRESHOLD
    },
    estimatedTimeWeeks: {
      label: "Duration (Weeks)",
      format: (n) => `${n.toFixed(1)} wks`,
    },
    actualCost: {
      label: "Actual Cost ($)",
      format: (n) => `$${(n / 1000).toFixed(0)}k`,
    },
    budgetUtilization: {
      label: "Budget Utilization",
      format: (n) => `${(n * 100).toFixed(0)}%`,
      target: 1.0,
    },
  };

  const summary = monteCarlo[selectedMetric];
  const config = metricConfig[selectedMetric];

  // Convert histogram bins into chart format
  const totalCount = summary.histogram.reduce((acc, b) => acc + b.count, 0) || 1;
  const chartData = summary.histogram.map((bin) => ({
    range: `${config.format(bin.bucketStart)} - ${config.format(bin.bucketEnd)}`,
    mid: (bin.bucketStart + bin.bucketEnd) / 2,
    count: bin.count,
    frequency: ((bin.count / totalCount) * 100).toFixed(1),
  }));

  return (
    <div className="p-6 rounded-2xl border border-neutral bg-[#faf8f4] shadow-card space-y-5">
      {/* Header + Metric Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">
            Monte Carlo Uncertainty Distribution
          </h3>
          <p className="text-xs text-ink/60">
            Evaluated across {monteCarlo.iterationsActuallyUsed.toLocaleString()} valid stochastic runs
          </p>
        </div>

        <div className="flex flex-wrap gap-1 bg-neutral/60 p-1 rounded-lg">
          {(Object.keys(metricConfig) as MetricKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                selectedMetric === key
                  ? "bg-accent text-base shadow-sm"
                  : "text-ink/70 hover:text-ink hover:bg-neutral"
              }`}
            >
              {key === "riskScore"
                ? "Risk"
                : key === "estimatedTimeWeeks"
                ? "Time"
                : key === "actualCost"
                ? "Cost"
                : "Budget Util"}
            </button>
          ))}
        </div>
      </div>

      {/* Probability Summary KPI Badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-neutral bg-[#f5f2ec] text-center">
          <div className="text-[11px] font-semibold text-ink/50 uppercase">Feasible Rate</div>
          <div className="font-serif text-xl font-bold text-[#2a4225]">
            {(monteCarlo.feasibleRate * 100).toFixed(0)}%
          </div>
        </div>

        <div className="p-3 rounded-xl border border-neutral bg-[#f5f2ec] text-center">
          <div className="text-[11px] font-semibold text-ink/50 uppercase">On-Time Prob</div>
          <div className="font-serif text-xl font-bold text-accent">
            {(monteCarlo.probabilityOnTime * 100).toFixed(0)}%
          </div>
        </div>

        <div className="p-3 rounded-xl border border-neutral bg-[#f5f2ec] text-center">
          <div className="text-[11px] font-semibold text-ink/50 uppercase">Within Budget Prob</div>
          <div className="font-serif text-xl font-bold text-accent">
            {(monteCarlo.probabilityWithinBudget * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Percentiles Bar Summary */}
      <div className="p-3 rounded-xl border border-neutral/80 bg-[#faf8f4] flex flex-wrap items-center justify-between text-xs gap-2 font-mono">
        <div>
          <span className="text-ink/40">p10:</span>{" "}
          <span className="font-bold">{config.format(summary.percentiles.p10)}</span>
        </div>
        <div>
          <span className="text-ink/40">p25:</span>{" "}
          <span>{config.format(summary.percentiles.p25)}</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
          <span className="text-accent font-semibold">median (p50):</span>{" "}
          <span className="font-bold text-accent">{config.format(summary.median)}</span>
        </div>
        <div>
          <span className="text-ink/40">p75:</span>{" "}
          <span>{config.format(summary.percentiles.p75)}</span>
        </div>
        <div>
          <span className="text-ink/40">p90:</span>{" "}
          <span className="font-bold">{config.format(summary.percentiles.p90)}</span>
        </div>
      </div>

      {/* Histogram Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <XAxis
              dataKey="range"
              tick={{ fill: "#1f2421", fontSize: 10 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={45}
            />
            <YAxis tick={{ fill: "#1f2421", fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#faf8f4",
                borderColor: "#e8e3d8",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#1f2421",
              }}
              formatter={(value: any) => [`${value} runs`, "Frequency"]}
              labelStyle={{ fontWeight: "bold", color: "#3a5a6b" }}
            />
            <Bar dataKey="count" fill="#3a5a6b" radius={[4, 4, 0, 0]} />
            {config.target !== undefined && (
              <ReferenceLine
                x={chartData.find((d) => d.mid >= config.target!)?.range}
                stroke="#d99a8a"
                strokeDasharray="4 4"
                label={{
                  value: "Threshold",
                  fill: "#d99a8a",
                  fontSize: 10,
                  position: "top",
                }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonteCarloDistributionChart;
