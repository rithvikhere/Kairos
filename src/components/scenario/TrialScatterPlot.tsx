"use client";

import React from "react";

interface TrialSample {
  actualCost: number;
  estimatedTimeWeeks: number;
  feasible: boolean;
}

interface TrialScatterPlotProps {
  trialSample?: TrialSample[];
}

export function TrialScatterPlot({ trialSample }: TrialScatterPlotProps) {
  if (!trialSample || trialSample.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#282c2d] border border-neutral text-center text-white/50 text-xs">
        Trial outcome sampling not available for this run.
      </div>
    );
  }

  const times = trialSample.map((t) => t.estimatedTimeWeeks);
  const costs = trialSample.map((t) => t.actualCost);

  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);

  const padTime = (maxTime - minTime) * 0.08 || 1;
  const padCost = (maxCost - minCost) * 0.08 || 1000;

  const xMin = Math.max(0, minTime - padTime);
  const xMax = maxTime + padTime;
  const yMin = Math.max(0, minCost - padCost);
  const yMax = maxCost + padCost;

  const width = 600;
  const height = 240;
  const padLeft = 75;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getX = (time: number) =>
    padLeft + ((time - xMin) / (xMax - xMin || 1)) * chartW;
  const getY = (cost: number) =>
    padTop + chartH - ((cost - yMin) / (yMax - yMin || 1)) * chartH;

  const feasibleCount = trialSample.filter((t) => t.feasible).length;
  const infeasibleCount = trialSample.length - feasibleCount;

  return (
    <div className="p-5 bg-[#282c2d] border border-neutral rounded-2xl shadow-xs space-y-3 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-base font-bold text-white">Trial Scatter Distribution</h3>
          <p className="text-xs text-white/60">
            Actual Cost vs. Estimated Time across representative trials ({trialSample.length} samples)
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-xs text-[#8ba888]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8ba888]" />
            Feasible ({feasibleCount})
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#e07a5f]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b5502f]" />
            Infeasible ({infeasibleCount})
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto text-xs font-mono select-none"
        >
          {/* Background grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const costVal = yMin + pct * (yMax - yMin);
            const yPos = getY(costVal);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={width - padRight}
                  y2={yPos}
                  stroke="#ffffff"
                  strokeOpacity={0.15}
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#ffffff"
                  fillOpacity={0.6}
                  fontSize="10"
                >
                  ${Math.round(costVal / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Scatter dots */}
          {trialSample.map((t, idx) => (
            <circle
              key={idx}
              cx={getX(t.estimatedTimeWeeks)}
              cy={getY(t.actualCost)}
              r="3.5"
              fill={t.feasible ? "#8ba888" : "#b5502f"}
              fillOpacity={0.75}
              stroke={t.feasible ? "#a8cca5" : "#e07a5f"}
              strokeWidth="0.8"
            />
          ))}

          {/* X axis labels */}
          <text
            x={padLeft}
            y={height - 12}
            textAnchor="start"
            fill="#ffffff"
            fillOpacity={0.6}
            fontSize="10"
          >
            {xMin.toFixed(1)} wks
          </text>
          <text
            x={width / 2}
            y={height - 12}
            textAnchor="middle"
            fill="#ffffff"
            fillOpacity={0.6}
            fontSize="10"
          >
            Estimated Schedule (Weeks) →
          </text>
          <text
            x={width - padRight}
            y={height - 12}
            textAnchor="end"
            fill="#ffffff"
            fillOpacity={0.6}
            fontSize="10"
          >
            {xMax.toFixed(1)} wks
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-white/50 pt-1 border-t border-white/10">
        <span>Y-axis: Actual Cost ($) | X-axis: Delivery Duration (Weeks)</span>
        <span>Colored by feasibility threshold (riskScore &lt; 50)</span>
      </div>
    </div>
  );
}

export default TrialScatterPlot;
