"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";

export const HeroSection: React.FC = () => {
  const scrollToFeatures = () => {
    const el = document.getElementById("feature-showcase");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-between px-6 sm:px-12 lg:px-20 py-8 bg-[#f6f4ef] text-[#221f1b] overflow-hidden border-b border-[#221f1b]/10">
      {/* Minimalist Editorial Navigation Header */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-7xl mx-auto pt-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2c4356] text-[#f6f4ef] flex items-center justify-center font-serif font-bold text-lg shadow-sm">
            K
          </div>
          <span className="font-serif text-2xl tracking-tight font-medium text-[#221f1b]">
            Kairos
          </span>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium tracking-wide bg-[#221f1b]/5 text-[#221f1b]/70 border border-[#221f1b]/10 ml-2">
            Decision Simulation Platform
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#2c4356] hover:bg-[#1d2e3b] text-[#f6f4ef] text-sm font-sans font-medium transition-all duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c4356] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f4ef]"
          >
            <span>Go to Kairos</span>
            <ArrowUpRight className="w-4 h-4 opacity-80" />
          </Link>
        </div>
      </header>

      {/* Center Hero Block: Headline + Curve Motif */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center py-12 my-auto">
        {/* Left Column: Typography */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-sans text-[#2c4356] bg-[#2c4356]/10 border border-[#2c4356]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2c4356]" />
            <span>Deterministic modeling & uncertainty intelligence</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-[#221f1b] leading-[1.08]">
            Every decision <br />
            <span className="italic font-serif text-[#2c4356]">has a shape.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#221f1b]/80 max-w-2xl font-sans font-normal leading-relaxed">
            Kairos simulates project trade-offs in real time — calculating true
            cost, schedule risk, and delivery uncertainty before you commit
            engineering resources.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              href="/projects"
              data-testid="hero-enter-btn"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#2c4356] hover:bg-[#1d2e3b] text-[#f6f4ef] text-base font-sans font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c4356] focus-visible:ring-offset-2"
            >
              <span>Go to Kairos</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={scrollToFeatures}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg text-sm font-sans font-medium text-[#221f1b]/80 hover:text-[#221f1b] hover:bg-[#221f1b]/5 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#221f1b]"
            >
              <span>Inspect the engine</span>
              <ArrowDown className="w-4 h-4 opacity-70" />
            </button>
          </div>
        </div>

        {/* Right Column: Orchestrated Line-Chart Curve Motif */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl bg-[#faf8f4] border border-[#221f1b]/10 p-6 shadow-sm">
            {/* Chart Header details */}
            <div className="flex items-center justify-between pb-3 border-b border-[#221f1b]/10 text-xs font-sans">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2c4356]" />
                <span className="font-medium text-[#221f1b]">Delivery Trade-off Frontier</span>
              </div>
              <span className="font-mono text-[11px] text-[#221f1b]/60">P50 / P90 Envelope</span>
            </div>

            {/* SVG Drawing Canvas with one orchestrated entrance */}
            <div className="relative w-full h-52 mt-4">
              <svg
                viewBox="0 0 380 200"
                className="w-full h-full overflow-visible"
                aria-label="Simulation frontier curve diagram"
              >
                <defs>
                  {/* Subtle confidence band gradient */}
                  <linearGradient id="heroBandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2c4356" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#2c4356" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Subtle Gridlines */}
                <line x1="20" y1="170" x2="360" y2="170" stroke="#221f1b" strokeOpacity="0.1" strokeWidth="1" />
                <line x1="20" y1="115" x2="360" y2="115" stroke="#221f1b" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1="60" x2="360" y2="60" stroke="#221f1b" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1="20" x2="20" y2="170" stroke="#221f1b" strokeOpacity="0.1" strokeWidth="1" />

                {/* Shaded confidence region */}
                <motion.path
                  d="M 20 170 Q 120 160 200 110 T 360 45 L 360 170 Z"
                  fill="url(#heroBandGradient)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                />

                {/* Baseline reference curve (faint dashed) */}
                <path
                  d="M 20 170 Q 140 155 240 125 T 360 85"
                  fill="none"
                  stroke="#221f1b"
                  strokeOpacity="0.2"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* The Primary Orchestrated Trade-Off Curve */}
                <motion.path
                  d="M 20 170 Q 120 160 200 110 T 360 45"
                  fill="none"
                  stroke="#2c4356"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 1.6,
                    ease: [0.16, 1, 0.3, 1], // Confident editorial ease-out
                  }}
                />

                {/* Key Frontier Anchor Point: Optimal Balance */}
                <motion.g
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4, duration: 0.4 }}
                >
                  <circle cx="200" cy="110" r="5" fill="#2c4356" />
                  <circle cx="200" cy="110" r="9" stroke="#2c4356" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
                  <text
                    x="212"
                    y="105"
                    className="font-sans text-[10px] font-semibold fill-[#2c4356]"
                  >
                    Optimum Feasibility (78%)
                  </text>
                </motion.g>

                {/* Axis Labels */}
                <text x="20" y="190" className="font-sans text-[10px] fill-[#221f1b]/50">
                  Headcount Allocation →
                </text>
                <text x="360" y="190" textAnchor="end" className="font-sans text-[10px] fill-[#221f1b]/50">
                  Delivery Velocity
                </text>
              </svg>
            </div>

            {/* Bottom Caption Pill */}
            <div className="flex items-center justify-between pt-2 border-t border-[#221f1b]/10 text-[11px] font-sans text-[#221f1b]/70">
              <span>Brooks&apos;s Law Drag Factor: 1.42x</span>
              <span className="text-[#8ba888] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8ba888]" />
                Low Risk Zone
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll-Down Cue */}
      <div className="relative z-20 w-full max-w-7xl mx-auto flex items-center justify-center pb-2">
        <button
          type="button"
          onClick={scrollToFeatures}
          className="group flex flex-col items-center gap-1.5 text-xs font-sans text-[#221f1b]/60 hover:text-[#221f1b] transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#221f1b]"
          aria-label="Scroll down to interactive feature showcase"
        >
          <span className="tracking-wide text-[11px]">Explore features & simulation engine</span>
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ArrowDown className="w-4 h-4 text-[#2c4356] group-hover:translate-y-0.5 transition-transform" />
          </motion.div>
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
