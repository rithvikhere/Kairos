"use client";

import React from "react";
import {
  GitCompare,
  Layers,
  Sliders,
  Sparkles,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  FolderGit2,
} from "lucide-react";
import { HotspotMarker } from "./HotspotMarker.js";
import { FeatureHotspotType } from "./FeaturePopupModal.js";

export interface DashboardMockProps {
  onSelectHotspot: (hotspot: FeatureHotspotType) => void;
}

/**
 * DashboardMock:
 * A realistic, slightly desaturated representation of the actual Kairos workspace UI.
 * Embedded with 5 pulsating HotspotMarkers that allow first-time visitors to interact
 * directly with the key subsystems.
 */
export const DashboardMock: React.FC<DashboardMockProps> = ({ onSelectHotspot }) => {
  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Outer Browser/App Window Frame */}
      <div className="relative rounded-2xl bg-[#faf8f4] border border-[#221f1b]/15 shadow-xl overflow-hidden">
        {/* Mock Window Top Bar Chrome */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#ede9e0] border-b border-[#221f1b]/10 text-xs font-sans text-[#221f1b]/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#221f1b]/20" />
            <span className="w-3 h-3 rounded-full bg-[#221f1b]/20" />
            <span className="w-3 h-3 rounded-full bg-[#221f1b]/20" />
            <span className="ml-3 font-mono text-[11px] text-[#221f1b]/50">
              kairos.app/projects/cloud-infra-2025/scenarios
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#8ba888]/20 text-[#221f1b] font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8ba888]" />
              Deterministic Engine Active
            </span>
          </div>
        </div>

        {/* Inner Mock Workspace Grid */}
        <div className="grid grid-cols-12 min-h-[580px] bg-[#f6f4ef] text-[#221f1b] relative">
          {/* Mock Sidebar */}
          <div className="col-span-3 border-r border-[#221f1b]/10 bg-[#f1ede4]/70 p-4 flex flex-col justify-between hidden md:flex">
            <div className="space-y-5">
              {/* Project Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#221f1b]/10">
                <div className="w-7 h-7 rounded bg-[#2c4356] text-[#f6f4ef] flex items-center justify-center font-serif font-bold text-xs">
                  K
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#221f1b] leading-tight">
                    Cloud Infra Modernization
                  </div>
                  <div className="text-[10px] text-[#221f1b]/50">3 scenarios active</div>
                </div>
              </div>

              {/* Scenarios List */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#221f1b]/50 px-2">
                  Scenarios
                </div>

                {/* Scenario Item 1 */}
                <div className="p-2 rounded-lg bg-white/70 border border-[#221f1b]/10 text-xs flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="font-medium text-[#221f1b]">1. Baseline Scope</div>
                    <div className="text-[10px] text-[#221f1b]/50">6 eng · 20 wks</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8ba888]/20 text-[#221f1b] font-mono">
                    24 Feas
                  </span>
                </div>

                {/* Scenario Item 2 - Active */}
                <div className="p-2 rounded-lg bg-[#2c4356] text-[#f6f4ef] text-xs flex items-center justify-between shadow-sm">
                  <div className="truncate pr-2">
                    <div className="font-medium">2. Accelerated Q3</div>
                    <div className="text-[10px] text-[#f6f4ef]/70">10 eng · 14 wks</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#b5502f] text-white font-mono font-bold">
                    68 Risk
                  </span>
                </div>

                {/* Scenario Item 3 */}
                <div className="p-2 rounded-lg hover:bg-white/40 border border-transparent text-xs flex items-center justify-between text-[#221f1b]/70">
                  <div className="truncate pr-2">
                    <div className="font-medium">3. Contractor Surge</div>
                    <div className="text-[10px] text-[#221f1b]/50">8 eng · 16 wks</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c98a3e]/20 text-[#221f1b] font-mono">
                    42 Mod
                  </span>
                </div>
              </div>
            </div>

            {/* Sidebar Bottom Engine State */}
            <div className="p-2.5 rounded-lg bg-white/50 border border-[#221f1b]/10 text-[11px] space-y-1">
              <div className="text-[#221f1b]/60">Brooks&apos;s Law Model</div>
              <div className="font-mono text-[#2c4356] font-semibold">Overhead factor 1.35x</div>
            </div>
          </div>

          {/* Mock Main Dashboard Workspace Column */}
          <div className="col-span-12 md:col-span-9 p-5 space-y-5 relative">
            {/* Top Workspace Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#221f1b]/10">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-lg font-medium text-[#221f1b]">
                  Scenario 2: Accelerated Q3
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#221f1b]/5 border border-[#221f1b]/10 text-[#221f1b]/70">
                  Forked from Baseline
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Hotspot Target 3: Compare Affordance */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => onSelectHotspot("compare")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-[#2c4356]/30 text-[#2c4356] text-xs font-medium shadow-sm hover:bg-[#2c4356]/5"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Compare Scenarios</span>
                  </button>
                </div>

                <div className="hidden sm:inline-flex px-3 py-1.5 rounded bg-[#2c4356] text-[#f6f4ef] text-xs font-medium shadow-sm">
                  Run Monte Carlo
                </div>
              </div>
            </div>

            {/* Scenario Summary Metric Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-white/80 border border-[#221f1b]/10">
                <div className="text-[10px] text-[#221f1b]/60 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-[#2c4356]" />
                  Estimated Cost
                </div>
                <div className="text-base font-semibold font-mono text-[#221f1b] mt-0.5">
                  $288,400
                </div>
                <div className="text-[10px] text-[#b5502f] font-mono font-medium">+15.3% over budget</div>
              </div>

              <div className="p-3 rounded-lg bg-white/80 border border-[#221f1b]/10">
                <div className="text-[10px] text-[#221f1b]/60 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#2c4356]" />
                  Delivery Time
                </div>
                <div className="text-base font-semibold font-mono text-[#221f1b] mt-0.5">
                  16.4 wks
                </div>
                <div className="text-[10px] text-[#b5502f] font-mono font-medium">+2.4 wks past deadline</div>
              </div>

              <div className="p-3 rounded-lg bg-white/80 border border-[#221f1b]/10">
                <div className="text-[10px] text-[#221f1b]/60 flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#2c4356]" />
                  Effective Headcount
                </div>
                <div className="text-base font-semibold font-mono text-[#221f1b] mt-0.5">
                  7.41 eng
                </div>
                <div className="text-[10px] text-[#c98a3e] font-mono font-medium">2.59 eng drag penalty</div>
              </div>

              {/* Hotspot Target 2: Risk Badge Area */}
              <div
                onClick={() => onSelectHotspot("risk-badge")}
                className="p-3 rounded-lg bg-[#b5502f]/10 border border-[#b5502f]/30 cursor-pointer relative"
              >
                <div className="text-[10px] text-[#b5502f] font-medium flex items-center justify-between">
                  <span>Risk Score</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#b5502f] text-white text-[9px] font-bold">
                    HIGH
                  </span>
                </div>
                <div className="text-xl font-serif font-bold text-[#b5502f] mt-0.5">
                  68 <span className="text-xs font-sans font-normal text-[#221f1b]/60">/ 100</span>
                </div>
                <div className="text-[10px] text-[#b5502f] font-medium">Infeasible (Threshold &ge; 50)</div>
              </div>
            </div>

            {/* Split: Parameters Slider Panel & Monte Carlo Preview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Hotspot Target 1: Sliders Panel (col-span-6) */}
              <div
                onClick={() => onSelectHotspot("slider")}
                className="md:col-span-6 p-4 rounded-xl bg-white/90 border border-[#221f1b]/10 space-y-3 cursor-pointer relative shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#221f1b]/10">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#2c4356]" />
                    <span className="text-xs font-semibold text-[#221f1b]">Project Levers</span>
                  </div>
                  <span className="text-[10px] text-[#2c4356] font-mono">Live Inputs</span>
                </div>

                {/* Slider 1: Headcount */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#221f1b]/70">Headcount</span>
                    <span className="font-mono font-medium text-[#221f1b]">10 engineers</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral rounded-full overflow-hidden">
                    <div className="h-full bg-[#2c4356] rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>

                {/* Slider 2: Deadline */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#221f1b]/70">Deadline</span>
                    <span className="font-mono font-medium text-[#221f1b]">14 weeks</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral rounded-full overflow-hidden">
                    <div className="h-full bg-[#2c4356] rounded-full" style={{ width: "40%" }} />
                  </div>
                </div>

                {/* Slider 3: Budget */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#221f1b]/70">Budget</span>
                    <span className="font-mono font-medium text-[#221f1b]">$250,000</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral rounded-full overflow-hidden">
                    <div className="h-full bg-[#2c4356] rounded-full" style={{ width: "55%" }} />
                  </div>
                </div>

                {/* Slider 4: Scope */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#221f1b]/70">Scope Estimate</span>
                    <span className="font-mono font-medium text-[#221f1b]">140 story points</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral rounded-full overflow-hidden">
                    <div className="h-full bg-[#2c4356] rounded-full" style={{ width: "70%" }} />
                  </div>
                </div>
              </div>

              {/* Hotspot Target 4: Monte Carlo Distribution Area (col-span-6) */}
              <div
                onClick={() => onSelectHotspot("monte-carlo")}
                className="md:col-span-6 p-4 rounded-xl bg-white/90 border border-[#221f1b]/10 space-y-2.5 cursor-pointer relative shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#221f1b]/10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2c4356]" />
                    <span className="text-xs font-semibold text-[#221f1b]">
                      Monte Carlo (1,000 Iterations)
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8ba888]/20 text-[#221f1b] font-mono">
                    N=1000
                  </span>
                </div>

                {/* Mini Histogram representation */}
                <div className="h-24 w-full flex items-end justify-between gap-1 px-1 pt-3 pb-1 bg-[#faf8f4] rounded-lg border border-[#221f1b]/5">
                  {[12, 22, 38, 55, 78, 92, 84, 65, 42, 26, 14, 6].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${h}%`,
                        backgroundColor: i < 6 ? "#8ba888" : i < 9 ? "#c98a3e" : "#b5502f",
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-1.5 rounded bg-[#f6f4ef] border border-[#221f1b]/5">
                    <div className="text-[10px] text-[#221f1b]/60">Probability On-Time</div>
                    <div className="font-mono font-bold text-[#c98a3e]">42.5%</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#f6f4ef] border border-[#221f1b]/5">
                    <div className="text-[10px] text-[#221f1b]/60">Within Budget</div>
                    <div className="font-mono font-bold text-[#8ba888]">68.2%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hotspot Target 5: AI Explanation Layer Banner */}
            <div
              onClick={() => onSelectHotspot("ai-panel")}
              className="p-3.5 rounded-xl bg-[#faf8f4] border border-[#2c4356]/20 flex items-start gap-3 cursor-pointer relative shadow-sm hover:border-[#2c4356]/40 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-[#2c4356]/10 text-[#2c4356] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-[#2c4356]" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#221f1b]">
                    Bounded AI Scenario Attribution
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2c4356]/10 text-[#2c4356] font-mono">
                    Zero Hallucination
                  </span>
                </div>
                <p className="text-[#221f1b]/80 leading-relaxed font-sans text-[11.5px]">
                  Adding 4 engineers reduced raw sprint capacity requirements by 2.1 weeks, but
                  generated 2.59 equivalent engineers of communication drag (Brooks&apos;s Law).
                  Net delivery date shifts backward by 2.4 weeks past the 14-week deadline.
                </p>
              </div>
            </div>

            {/* Pulsing Hotspot Overlays */}
            {/* 1. Slider Panel Hotspot */}
            <HotspotMarker
              id="slider"
              label="Simulation Engine"
              sublabel="Sliders"
              top="62%"
              left="18%"
              ariaLabel="Inspect deterministic simulation engine levers"
              onClick={() => onSelectHotspot("slider")}
            />

            {/* 2. Risk Badge Hotspot */}
            <HotspotMarker
              id="risk-badge"
              label="Risk Scoring"
              sublabel="Multi-axis"
              top="26%"
              left="68%"
              ariaLabel="Inspect risk scoring breakdown"
              onClick={() => onSelectHotspot("risk-badge")}
            />

            {/* 3. Compare Button Hotspot */}
            <HotspotMarker
              id="compare"
              label="Scenario Diff"
              sublabel="Attribution"
              top="7%"
              left="76%"
              ariaLabel="Inspect scenario comparison and diff engine"
              onClick={() => onSelectHotspot("compare")}
            />

            {/* 4. Monte Carlo Hotspot */}
            <HotspotMarker
              id="monte-carlo"
              label="Monte Carlo"
              sublabel="Uncertainty"
              top="62%"
              left="75%"
              ariaLabel="Inspect Monte Carlo probability modeling"
              onClick={() => onSelectHotspot("monte-carlo")}
            />

            {/* 5. AI Panel Hotspot */}
            <HotspotMarker
              id="ai-panel"
              label="Bounded AI"
              sublabel="Strict Grounding"
              top="91%"
              left="48%"
              ariaLabel="Inspect bounded AI explanation layer"
              onClick={() => onSelectHotspot("ai-panel")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMock;
