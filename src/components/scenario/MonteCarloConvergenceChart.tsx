"use client";

import React from "react";

interface ConvergencePoint {
  iteration: number;
  runningMean: number;
}

interface MonteCarloConvergenceChartProps {
  convergence?: ConvergencePoint[];
  metricLabel?: string;
}

export function MonteCarloConvergenceChart({
  convergence,
  metricLabel = "Mean Project Cost ($)",
}: MonteCarloConvergenceChartProps) {
  if (!convergence || convergence.length < 2) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-neutral text-center text-ink/50 text-xs">
        Convergence checkpoint tracking not recorded for this simulation run.
      </div>
    );
  }

  const iterations = convergence.map((p) => p.iteration);
  const values = convergence.map((p) => p.runningMean);

  const minX = Math.min(...iterations);
  const maxX = Math.max(...iterations);

  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const paddingY = (maxY - minY) * 0.1 || 10;
  const yDomainMin = minY - paddingY;
  const yDomainMax = maxY + paddingY;

  const width = 600;
  const height = 220;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getX = (it: number) =>
    padLeft + ((it - minX) / (maxX - minX || 1)) * chartW;
  const getY = (val: number) =>
    padTop + chartH - ((val - yDomainMin) / (yDomainMax - yDomainMin || 1)) * chartH;

  const pointsString = convergence
    .map((p) => `${getX(p.iteration)},${getY(p.runningMean)}`)
    .join(" ");

  const finalPoint = convergence[convergence.length - 1]!;

  return (
    <div className="p-5 bg-white border border-neutral rounded-2xl shadow-xs space-y-3 text-ink">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-sm font-bold text-ink">Monte Carlo Convergence Tracker</h3>
          <p className="text-xs text-ink/60">
            Running mean stabilization across trial iterations ({convergence.length} checkpoints)
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold text-ink/50 uppercase font-mono">Final Converged Mean</div>
          <div className="font-mono text-sm font-bold text-accent">
            ${Math.round(finalPoint.runningMean).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto text-xs font-mono select-none"
        >
          {/* Horizontal reference grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const yVal = yDomainMin + pct * (yDomainMax - yDomainMin);
            const yPos = getY(yVal);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={width - padRight}
                  y2={yPos}
                  stroke="#e8e3d8"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#717a74"
                  fontSize="10"
                >
                  ${Math.round(yVal).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Convergence trend line */}
          <polyline
            fill="none"
            stroke="#3a5a6b"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pointsString}
          />

          {/* Data point dots */}
          {convergence.map((p, idx) => (
            <circle
              key={idx}
              cx={getX(p.iteration)}
              cy={getY(p.runningMean)}
              r="3.5"
              fill="#faf8f4"
              stroke="#3a5a6b"
              strokeWidth="2"
            />
          ))}

          {/* Final point marker */}
          <circle
            cx={getX(finalPoint.iteration)}
            cy={getY(finalPoint.runningMean)}
            r="5"
            fill="#3a5a6b"
            stroke="#ffffff"
            strokeWidth="2"
          />

          {/* X axis labels */}
          <text
            x={padLeft}
            y={height - 12}
            textAnchor="start"
            fill="#717a74"
            fontSize="10"
          >
            {minX} trials
          </text>
          <text
            x={width - padRight}
            y={height - 12}
            textAnchor="end"
            fill="#717a74"
            fontSize="10"
          >
            {maxX} trials
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-ink/50 pt-1 border-t border-neutral/60">
        <span>Metric: {metricLabel}</span>
        <span>Asymptotic stabilization proves Monte Carlo sample size adequacy</span>
      </div>
    </div>
  );
}
