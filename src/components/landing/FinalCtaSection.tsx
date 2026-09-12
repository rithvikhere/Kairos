"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

export const FinalCtaSection: React.FC = () => {
  return (
    <section className="relative min-h-[85vh] flex flex-col justify-between px-6 sm:px-12 lg:px-20 py-16 bg-[#f6f4ef] text-[#221f1b]">
      <div className="max-w-4xl mx-auto my-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-sans text-[#2c4356] bg-[#2c4356]/10 border border-[#2c4356]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2c4356]" />
          <span>Ready for production project modeling</span>
        </div>

        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#221f1b] leading-[1.12]">
          Start tracing your own <br />
          <span className="italic font-serif text-[#2c4356]">decisions.</span>
        </h2>

        <p className="text-lg sm:text-xl text-[#221f1b]/80 max-w-2xl mx-auto font-sans font-normal leading-relaxed">
          Create your first project workspace. Set baseline constraints, fork competing scenarios,
          and run Monte Carlo simulations with bounded mathematical clarity.
        </p>

        {/* Feature Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-sans text-[#221f1b]/70 pt-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#8ba888]" />
            <span>Deterministic cost & schedule physics</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#8ba888]" />
            <span>Monte Carlo uncertainty bands</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#8ba888]" />
            <span>Zero AI hallucinations</span>
          </div>
        </div>

        {/* Prominent Hard-Navigation CTA Button */}
        <div className="pt-6">
          <Link
            href="/projects"
            data-testid="final-cta-btn"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#2c4356] hover:bg-[#1d2e3b] text-[#f6f4ef] text-base font-sans font-medium shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c4356] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f4ef]"
          >
            <span>Go to Kairos</span>
            <ArrowUpRight className="w-5 h-5 opacity-90" />
          </Link>
          <div className="text-xs text-[#221f1b]/50 mt-3 font-sans">
            Direct transition to your project workspace
          </div>
        </div>
      </div>

      {/* Editorial Landing Footer */}
      <footer className="w-full max-w-7xl mx-auto pt-12 border-t border-[#221f1b]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-[#221f1b]/60">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-[#221f1b]">Kairos</span>
          <span>·</span>
          <span>Decision Simulation & Scenario Intelligence</span>
        </div>
        <div>
          <span>Built for engineering leaders & product strategists</span>
        </div>
      </footer>
    </section>
  );
};

export default FinalCtaSection;
