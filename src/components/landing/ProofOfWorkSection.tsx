"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { StatDialogCard } from "./StatDialogCard.js";
import projectStats from "../../data/projectStats.generated.json";

export interface ProofOfWorkSectionProps {
  stats?: typeof projectStats;
}

export const ProofOfWorkSection: React.FC<ProofOfWorkSectionProps> = ({
  stats = projectStats,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const backgroundY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? ["0px", "0px"] : ["-20px", "20px"]
  );

  return (
    <section
      id="proof-of-work"
      ref={sectionRef}
      className="relative py-14 sm:py-20 px-6 sm:px-12 lg:px-20 bg-transparent text-white overflow-hidden"
    >
      {/* Background layer with subtle ambient glow matching FeatureShowcaseSection */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 pointer-events-none -z-10 bg-transparent"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(58,90,107,0.1),transparent_60%)]" />
      </motion.div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-sans text-white bg-[#2c4356]/40 border border-[#2c4356]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8ba888]" />
              <span>Proof of Work · Live Repository Verification</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.15]">
              Real engineering rigor. <br />
              <span className="italic font-serif text-white/90 underline decoration-white/30 underline-offset-8">
                Zero invented numbers.
              </span>
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-white/70 font-sans leading-relaxed max-w-md">
            Derived directly from the codebase at build time. Every model, test, and constraint verified against actual sources.
          </p>
        </div>

        {/* 5 Dialog Cards Grid - Staggered 120ms left-to-right */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {/* 1. Passing Tests */}
          <StatDialogCard
            value={stats.testsPassing}
            label="tests passing"
            category="Test Suite"
            tag="CI::PASSED"
            delay={0.0}
          />

          {/* 2. Risk Formulas */}
          <StatDialogCard
            value={stats.riskFormulaCount.total}
            label="risk formulas"
            detail={`(${stats.riskFormulaCount.core} core + ${stats.riskFormulaCount.extended} extended)`}
            category="Risk Models"
            tag="DOMAIN::MATH"
            delay={0.12}
          />

          {/* 3. API Routes */}
          <StatDialogCard
            value={stats.apiRouteCount}
            label="API routes"
            category="API Layer"
            tag="HTTP::ROUTES"
            delay={0.24}
          />

          {/* 4. UI Components */}
          <StatDialogCard
            value={stats.componentCount}
            label="UI components"
            category="UI System"
            tag="CLIENT::REACT"
            delay={0.36}
          />

          {/* 5. Constraints Modeled */}
          <StatDialogCard
            value={stats.constraintCount}
            label={`constraints modeled across ${stats.phasesShipped} phases`}
            category="Constraints"
            tag="ENGINE::PHASES"
            delay={0.48}
          />
        </div>
      </div>
    </section>
  );
};

export default ProofOfWorkSection;
