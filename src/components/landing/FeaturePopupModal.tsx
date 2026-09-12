"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sliders, ShieldAlert, GitCompare, Activity, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export type FeatureHotspotType =
  | "slider"
  | "risk-badge"
  | "compare"
  | "monte-carlo"
  | "ai-panel";

export interface FeaturePopupModalProps {
  activeHotspot: FeatureHotspotType | null;
  onClose: () => void;
}

interface FeatureContent {
  tag: string;
  title: string;
  description: string;
  visual: React.ReactNode;
}

export const FeaturePopupModal: React.FC<FeaturePopupModalProps> = ({
  activeHotspot,
  onClose,
}) => {
  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Interactive state for mini slider in slider popup
  const [miniHeadcount, setMiniHeadcount] = useState(8);

  // Compute live mini risk for interactive demonstration
  const computeMiniRisk = (hc: number) => {
    // Brooks's law penalty demonstration: communication overhead starts rising sharply above 8
    const base = 25;
    const penalty = hc > 8 ? (hc - 8) * 7.5 : (8 - hc) * 2;
    return Math.min(Math.round(base + penalty), 100);
  };
  const liveMiniRisk = computeMiniRisk(miniHeadcount);
  const liveRiskColor =
    liveMiniRisk < 25
      ? "#8ba888" // sage
      : liveMiniRisk < 50
      ? "#c98a3e" // amber
      : "#b5502f"; // terracotta

  const contentMap: Record<FeatureHotspotType, FeatureContent> = {
    slider: {
      tag: "Deterministic Core",
      title: "Simulation Engine",
      description:
        "Adjust core project levers — budget, headcount, deadline, and scope — to recalculate delivery constraints instantly. The engine applies non-linear Brooks's law team communication drag and ramp-up overhead rather than naive linear spreadsheets.",
      visual: (
        <div className="p-4 rounded-xl border border-neutral bg-[#faf8f4] space-y-3 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#221f1b]">Test Team Size:</span>
            <span className="font-mono font-bold text-[#2c4356] bg-neutral/50 px-2 py-0.5 rounded">
              {miniHeadcount} engineers
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={16}
            step={1}
            value={miniHeadcount}
            onChange={(e) => setMiniHeadcount(Number(e.target.value))}
            className="w-full accent-[#2c4356] cursor-pointer"
          />
          <div className="flex items-center justify-between pt-2 border-t border-neutral/60 text-xs">
            <span className="text-[#221f1b]/60">Computed Risk Score:</span>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: liveRiskColor }}
              />
              <span className="font-serif font-bold text-base" style={{ color: liveRiskColor }}>
                {liveMiniRisk} / 100
              </span>
              <span className="text-[10px] text-[#221f1b]/50">
                ({liveMiniRisk < 50 ? "Feasible" : "Infeasible"})
              </span>
            </div>
          </div>
        </div>
      ),
    },
    "risk-badge": {
      tag: "Risk Quantification",
      title: "Multi-Axis Risk Scoring",
      description:
        "Every scenario produces a calibrated 0–100 risk score derived from three functional dimensions: schedule compression, budget utilization, and team staffing overhead. When risk reaches 50, the scenario transitions into the infeasible zone.",
      visual: (
        <div className="p-4 rounded-xl border border-neutral bg-[#faf8f4] space-y-2.5 font-sans text-xs">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#221f1b]/70">Schedule Risk</span>
              <span className="font-mono font-semibold text-[#8ba888]">24% (Low)</span>
            </div>
            <div className="h-2 w-full bg-neutral/60 rounded-full overflow-hidden">
              <div className="h-full bg-[#8ba888] rounded-full" style={{ width: "24%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#221f1b]/70">Budget Utilization</span>
              <span className="font-mono font-semibold text-[#c98a3e]">48% (Moderate)</span>
            </div>
            <div className="h-2 w-full bg-neutral/60 rounded-full overflow-hidden">
              <div className="h-full bg-[#c98a3e] rounded-full" style={{ width: "48%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#221f1b]/70">Staffing Communication Drag</span>
              <span className="font-mono font-semibold text-[#b5502f]">78% (Critical)</span>
            </div>
            <div className="h-2 w-full bg-neutral/60 rounded-full overflow-hidden">
              <div className="h-full bg-[#b5502f] rounded-full" style={{ width: "78%" }} />
            </div>
          </div>
        </div>
      ),
    },
    compare: {
      tag: "Differential Intelligence",
      title: "Scenario Forking & Diff Attribution",
      description:
        "Branch off any existing scenario to test an alternative intervention without modifying historical baselines. The pairwise comparison engine isolates each lever's specific mathematical contribution to the total change in risk.",
      visual: (
        <div className="p-4 rounded-xl border border-neutral bg-[#faf8f4] space-y-2 font-sans text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-neutral/60">
            <span className="text-[#221f1b]/60">Budget Shift</span>
            <span className="font-mono font-semibold text-[#2c4356]">+$100,000 (+20%)</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-neutral/60">
            <span className="text-[#221f1b]/60">Deadline Shift</span>
            <span className="font-mono font-semibold text-[#8ba888]">+4 weeks (+20%)</span>
          </div>
          <div className="flex items-center justify-between py-1.5 bg-[#8ba888]/10 px-2 rounded-lg text-[#221f1b]">
            <span className="font-medium">Primary Isolated Driver:</span>
            <span className="font-mono font-bold text-[#8ba888]">-16 risk points</span>
          </div>
        </div>
      ),
    },
    "monte-carlo": {
      tag: "Stochastic Modeling",
      title: "Monte Carlo Uncertainty Analysis",
      description:
        "Real projects never follow single deterministic point estimates. Kairos samples up to 1,000 iterations using Box-Muller normal and log-normal distributions to reveal the true probability distribution of finishing on time and on budget.",
      visual: (
        <div className="p-4 rounded-xl border border-neutral bg-[#faf8f4] space-y-2.5 font-sans">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#221f1b]/70">Confidence Interval (P10–P90):</span>
            <span className="text-xs font-mono font-bold text-[#2c4356]">16.4 – 23.8 wks</span>
          </div>
          <div className="relative h-12 w-full flex items-end gap-1 px-1">
            {[15, 28, 45, 70, 92, 100, 88, 65, 40, 22, 12].map((height, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${height}%`,
                  backgroundColor: i >= 2 && i <= 8 ? "#2c4356" : "#e8e3d8",
                  opacity: i >= 2 && i <= 8 ? 0.85 : 0.6,
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between bg-[#8ba888]/15 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="font-medium text-[#221f1b]">On-Time Probability:</span>
            <span className="font-mono font-bold text-[#2a4225]">78.4% Confidence</span>
          </div>
        </div>
      ),
    },
    "ai-panel": {
      tag: "Bounded Intelligence",
      title: "Plain-Language Executive Explanations",
      description:
        "Kairos turns dense, multidimensional calculation matrices into clear, stakeholder-ready narrative explanations. Every output is strictly constrained by schema contracts — the AI interprets real numbers and is architecturally barred from inventing data.",
      visual: (
        <div className="p-4 rounded-xl border border-neutral bg-[#faf8f4] space-y-2.5 font-sans text-xs">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8ba888]/20 text-[#2a4225] border border-[#8ba888]/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Grounded in computed diff · 0 invented figures</span>
          </div>
          <p className="text-[#221f1b]/80 italic leading-relaxed bg-[#f6f4ef] p-2.5 rounded-lg border border-neutral/60">
            &ldquo;Extending the timeline from 20 to 24 weeks reduces schedule pressure by 18 points, fully neutralizing the communication drag from adding two engineers.&rdquo;
          </p>
        </div>
      ),
    },
  };

  const current = activeHotspot ? contentMap[activeHotspot] : null;

  return (
    <AnimatePresence>
      {activeHotspot && current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feature-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#221f1b]/40 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-md bg-[#f6f4ef] rounded-2xl border border-neutral shadow-2xl p-6 z-10 space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#2c4356]">
                  {current.tag}
                </span>
                <h3
                  id="feature-modal-title"
                  className="font-serif text-xl font-bold text-[#221f1b] mt-0.5"
                >
                  {current.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-[#221f1b]/50 hover:text-[#221f1b] hover:bg-neutral/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2c4356]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feature Description */}
            <p className="text-xs text-[#221f1b]/80 leading-relaxed font-sans">
              {current.description}
            </p>

            {/* Feature-Specific Micro-Visual */}
            {current.visual}

            {/* Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-[#2c4356] hover:bg-[#1d2e3b] text-[#f6f4ef] text-xs font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#2c4356]"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FeaturePopupModal;
