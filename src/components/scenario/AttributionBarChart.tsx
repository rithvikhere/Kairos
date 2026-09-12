"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { InputAttribution } from "../../domain/diff.js";

export interface AttributionBarChartProps {
  attribution: InputAttribution[];
}

export const AttributionBarChart: React.FC<AttributionBarChartProps> = ({
  attribution,
}) => {
  if (!attribution || attribution.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-neutral bg-[#faf8f4] text-center text-xs text-ink/50">
        No isolated input modifications to attribute.
      </div>
    );
  }

  // Preserve the array's existing sort order (do NOT re-sort per spec)
  const chartData = attribution.map((row) => ({
    field: row.field,
    contribution: Number(row.isolatedRiskContribution.toFixed(1)),
    isolatedRiskScore: Number(row.isolatedRiskScore.toFixed(1)),
  }));

  return (
    <div className="p-6 rounded-2xl border border-neutral bg-[#faf8f4] shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="font-serif text-base font-bold text-ink">
          Single-Variable Risk Attribution
        </h4>
        <span className="text-[11px] text-ink/50">
          Ranked by |isolated contribution| descending
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
          >
            <XAxis type="number" tick={{ fill: "#1f2421", fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="field"
              tick={{ fill: "#1f2421", fontSize: 11, fontWeight: "bold" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#faf8f4",
                borderColor: "#e8e3d8",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#1f2421",
              }}
              formatter={(value: any) => [
                `${value > 0 ? "+" : ""}${value} risk points`,
                "Isolated Impact",
              ]}
            />
            <ReferenceLine x={0} stroke="#1f2421" strokeOpacity={0.3} />
            <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.contribution > 0 ? "#d99a8a" : "#3a5a6b"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="p-3 rounded-lg bg-neutral/40 border border-neutral/60 text-[11px] text-ink/60 leading-relaxed">
        <strong>Mathematical Note:</strong> Because simulate()&apos;s team efficiency model
        is non-linear (Brooks&apos;s Law), individual isolated risk contributions do{" "}
        <em>NOT</em> sum to the total net risk delta. Interaction effects between levers
        are preserved as pure single-variable probe results.
      </div>
    </div>
  );
};

export default AttributionBarChart;
