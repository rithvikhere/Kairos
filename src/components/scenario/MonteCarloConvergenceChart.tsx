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
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    iteration: number;
    runningMean: number;
    x: number;
    y: number;
    index: number;
  } | null>(null);

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
          <h3 className="font-serif text-base font-bold text-[#0f172a]">Monte Carlo Convergence Tracker</h3>
          <p className="text-xs text-ink/60">
            Running mean stabilization across trial iterations ({convergence.length} checkpoints)
          </p>
        </div>
        <div className="text-right">
          {hoveredPoint ? (
            <>
              <div className="text-[11px] font-semibold text-[#2c4356] uppercase font-mono transition-colors">
                Checkpoint: {hoveredPoint.iteration} Trials
              </div>
              <div className="font-mono text-base font-bold text-[#2c4356]">
                ${Math.round(hoveredPoint.runningMean).toLocaleString("en-US")}
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-semibold text-ink/50 uppercase font-mono">Final Converged Mean</div>
              <div className="font-mono text-base font-bold text-accent">
                ${Math.round(finalPoint.runningMean).toLocaleString("en-US")}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto text-xs font-mono select-none"
          onMouseLeave={() => setHoveredPoint(null)}
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
                  ${Math.round(yVal).toLocaleString("en-US")}
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

          {/* Hover Crosshair Guides */}
          {hoveredPoint && (
            <g className="pointer-events-none transition-all duration-150">
              {/* Vertical line to x-axis */}
              <line
                x1={hoveredPoint.x}
                y1={padTop}
                x2={hoveredPoint.x}
                y2={height - padBottom}
                stroke="#2c4356"
                strokeDasharray="3 3"
                strokeWidth="1.5"
                opacity="0.5"
              />
              {/* Horizontal line to y-axis */}
              <line
                x1={padLeft}
                y1={hoveredPoint.y}
                x2={hoveredPoint.x}
                y2={hoveredPoint.y}
                stroke="#2c4356"
                strokeDasharray="3 3"
                strokeWidth="1.5"
                opacity="0.5"
              />
            </g>
          )}

          {/* Data point dots with interactive hit zones */}
          {convergence.map((p, idx) => {
            const cx = getX(p.iteration);
            const cy = getY(p.runningMean);
            const isHovered = hoveredPoint?.index === idx;
            const isLast = idx === convergence.length - 1;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({
                    iteration: p.iteration,
                    runningMean: p.runningMean,
                    x: cx,
                    y: cy,
                    index: idx,
                  })
                }
              >
                {/* Invisible enlarged hit target */}
                <circle cx={cx} cy={cy} r="12" fill="transparent" />

                {/* Visible dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? "6" : isLast ? "5" : "3.5"}
                  fill={isHovered ? "#2c4356" : isLast ? "#3a5a6b" : "#faf8f4"}
                  stroke={isHovered ? "#ffffff" : isLast ? "#ffffff" : "#3a5a6b"}
                  strokeWidth={isHovered ? "2.5" : "2"}
                  className="transition-all duration-150"
                />

                {/* SVG Native Title for browser accessibility */}
                <title>
                  {`Trial Checkpoint: ${p.iteration} iterations\nRunning Mean: $${Math.round(
                    p.runningMean
                  ).toLocaleString("en-US")}`}
                </title>
              </g>
            );
          })}

          {/* Interactive Floating Tooltip Badge over hovered point */}
          {hoveredPoint && (
            <g
              transform={`translate(${Math.min(
                width - padRight - 55,
                Math.max(padLeft + 55, hoveredPoint.x)
              )}, ${
                hoveredPoint.y - 45 < padTop
                  ? hoveredPoint.y + 35
                  : hoveredPoint.y - 12
              })`}
              className="pointer-events-none transition-all duration-150"
            >
              {/* Tooltip Background Card */}
              <rect
                x="-58"
                y="-36"
                width="116"
                height="36"
                rx="6"
                fill="#15222e"
                stroke="#ffffff"
                strokeWidth="1"
                className="shadow-lg"
              />
              {/* Pointer beak */}
              {hoveredPoint.y - 45 >= padTop ? (
                <polygon points="0,0 -5,-6 5,-6" fill="#15222e" />
              ) : (
                <polygon points="0,-42 -5,-36 5,-36" fill="#15222e" />
              )}
              <text
                x="0"
                y="-21"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
                fontWeight="500"
              >
                {hoveredPoint.iteration} trials
              </text>
              <text
                x="0"
                y="-7"
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="11"
                fontWeight="bold"
              >
                ${Math.round(hoveredPoint.runningMean).toLocaleString("en-US")}
              </text>
            </g>
          )}

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
