"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ReelGallery } from "../ui/ReelGallery.js";

export const HeroSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const shouldReduceMotion = useReducedMotion();
  const backgroundY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? ["0px", "0px"] : ["0px", "50px"]
  );

  const scrollToFeatures = () => {
    const el = document.getElementById("analytics") || document.getElementById("feature-showcase");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-between items-center text-center px-6 sm:px-12 lg:px-20 py-16 md:py-20 bg-transparent text-[#d0fcf4] overflow-hidden"
    >
      {/* Subdued Non-Interactive Reel Gallery Ambient Background Layer with subtle parallax */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 pointer-events-none -z-10"
        aria-hidden="true"
      >
        <ReelGallery
          rows={6}
          rowHeight={96}
          rowGap={18}
          itemGap={16}
          autoScroll={14}
          speed={1}
          speedVariance={0.3}
          tilt={-5}
          alternate={true}
          opacity={0.52}
          brightness={1.0}
          grayscale={0.2}
          blurAmount="1px"
          overlayColor="#f6f4ef"
          overlayOpacity={0.42}
        />
      </motion.div>

      {/* Bottom gradient blend transition into Section 2 */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-[#343839]/60 to-[#303537] z-0"
        aria-hidden="true"
      />

      {/* Centered Main Hero Block */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center py-16 my-auto space-y-6">
        {/* Big Kairos Title in Center */}
        <h1 className="font-serif text-7xl sm:text-8xl md:text-9xl font-medium tracking-tight text-[#d0fcf4] leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
          Kairos
        </h1>

        {/* Sub-headline: Every decision has a shape. */}
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#d0fcf4] leading-[1.15] drop-shadow-[0_2px_14px_rgba(0,0,0,0.8)]">
          Every decision <span className="italic font-serif text-[#78dec8]">has a shape.</span>
        </h2>

        {/* Explanatory Lead Paragraph */}
        <p className="text-lg sm:text-xl text-[#d0fcf4]/90 max-w-2xl mx-auto font-sans font-normal leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
          Kairos simulates project trade-offs in real time — calculating true
          cost, schedule risk, and delivery uncertainty before you commit
          engineering resources.
        </p>

        {/* Centered Action Controls */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/projects"
            data-testid="hero-enter-btn"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#d0fcf4] hover:bg-[#b8f7eb] text-[#1d2e3b] text-base font-sans font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d0fcf4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#343839]"
          >
            <span>Go to Kairos</span>
            <ArrowUpRight className="w-4 h-4 text-[#1d2e3b]" />
          </Link>

          <button
            type="button"
            onClick={scrollToFeatures}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-sm font-sans font-medium text-[#d0fcf4] hover:text-[#d0fcf4] hover:bg-[#2c4356]/40 border border-[#d0fcf4]/30 backdrop-blur-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d0fcf4]"
          >
            <span>Inspect the engine</span>
            <ArrowDown className="w-4 h-4 opacity-80" />
          </button>
        </div>
      </div>

      {/* Centered Scroll Prompt Indicator */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-center text-xs font-sans text-[#d0fcf4]/50 pb-2">
        <span>Scroll to explore interactive architecture ↓</span>
      </div>
    </section>
  );
};

export default HeroSection;
