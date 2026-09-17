"use client";

import React, { useState, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Sliders, ShieldAlert, GitCompare, Activity, Sparkles } from "lucide-react";
import { DashboardMock } from "./DashboardMock.js";
import { FeaturePopupModal, FeatureHotspotType } from "./FeaturePopupModal.js";

export const FeatureShowcaseSection: React.FC = () => {
  const [activeHotspot, setActiveHotspot] = useState<FeatureHotspotType | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const backgroundY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? ["0px", "0px"] : ["-35px", "35px"]
  );

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
      ref={sectionRef}
      className="relative py-28 sm:py-32 px-6 sm:px-12 lg:px-20 bg-transparent text-[#d0fcf4] overflow-hidden"
    >
      {/* Background layer with subtle parallax & ambient glow */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 pointer-events-none -z-10 bg-[#282e31]"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(58,90,107,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_75%,rgba(120,222,200,0.05),transparent_50%)]" />
      </motion.div>

      {/* Top gradient blend transition receiving DataVisualizationsSection */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-[#282e31] via-[#282e31]/80 to-transparent z-0"
        aria-hidden="true"
      />

      {/* Bottom gradient blend transition into FinalCtaSection */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-b from-transparent via-[#252b2e]/80 to-[#22272a] z-0"
        aria-hidden="true"
      />
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
