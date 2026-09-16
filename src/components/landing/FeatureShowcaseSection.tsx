"use client";

import React, { useState } from "react";
import { Sliders, ShieldAlert, GitCompare, Activity, Sparkles } from "lucide-react";
import { DashboardMock } from "./DashboardMock.js";
import { FeaturePopupModal, FeatureHotspotType } from "./FeaturePopupModal.js";

export const FeatureShowcaseSection: React.FC = () => {
  const [activeHotspot, setActiveHotspot] = useState<FeatureHotspotType | null>(null);

  const quickNav = [
    { id: "slider" as FeatureHotspotType, label: "Simulation Engine", icon: Sliders },
    { id: "risk-badge" as FeatureHotspotType, label: "Multi-Axis Risk", icon: ShieldAlert },
    { id: "compare" as FeatureHotspotType, label: "Scenario Diff", icon: GitCompare },
    { id: "monte-carlo" as FeatureHotspotType, label: "Monte Carlo", icon: Activity },
    { id: "ai-panel" as FeatureHotspotType, label: "Bounded AI", icon: Sparkles },
  ];

  return (
    <section
      id="feature-showcase"
      className="relative py-24 px-6 sm:px-12 lg:px-20 bg-transparent text-[#d0fcf4] border-b border-[#d0fcf4]/15"
    >
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Editorial Section Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-sans text-[#d0fcf4] bg-[#2c4356]/40 border border-[#2c4356]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d0fcf4]" />
            <span>Interactive Product Architecture</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#d0fcf4] leading-[1.15]">
            An instrument built for <br />
            <span className="italic font-serif text-[#78dec8]">trade-off physics.</span>
          </h2>

          <p className="text-base sm:text-lg text-[#d0fcf4]/80 font-sans font-normal leading-relaxed">
            Every lever alters team communication overhead, timeline slippage, and budget
            consumption. Click any pulsating marker on the live workspace preview to inspect the
            mathematical mechanisms behind each subsystem.
          </p>

          {/* Quick Subsystem Nav Buttons for Accessibility and Touch screens */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-sans text-[#d0fcf4]/60 mr-1">Inspect subsystem:</span>
            {quickNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveHotspot(item.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3a4041] hover:bg-[#2c4356] hover:text-[#d0fcf4] text-[#d0fcf4] border border-[#d0fcf4]/15 text-xs font-sans font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c4356]"
                >
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* The Realistic Dashboard Centerpiece with Hotspots */}
        <div className="pt-2">
          <DashboardMock onSelectHotspot={(hotspot) => setActiveHotspot(hotspot)} />
        </div>
      </div>

      {/* Accessible Feature Modal Dialog */}
      <FeaturePopupModal
        activeHotspot={activeHotspot}
        onClose={() => setActiveHotspot(null)}
      />
    </section>
  );
};

export default FeatureShowcaseSection;
