"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { usePageFade } from "../../contexts/PageFadeContext.js";

export const FinalCtaSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }
  const { navigateWithFade } = usePageFade();

  useEffect(() => {
    try {
      router?.prefetch("/projects");
    } catch {
      // ignore in test environments
    }
  }, [router]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const backgroundY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? ["0px", "0px"] : ["-30px", "30px"]
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[85vh] flex flex-col justify-between px-6 sm:px-12 lg:px-20 py-24 sm:py-28 lg:py-32 bg-transparent text-white overflow-hidden"
    >
      {/* Background layer with subtle parallax & ambient glow */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 pointer-events-none -z-10 bg-transparent"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.04),transparent_60%)]" />
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto my-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-sans text-white bg-[#2c4356]/40 border border-[#2c4356]">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>Ready for production project modeling</span>
        </div>

        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.12]">
          Start tracing your own <br />
          <span className="italic font-serif text-white/90 underline decoration-white/30 underline-offset-8">decisions.</span>
        </h2>

        <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto font-sans font-normal leading-relaxed">
          Create your first project workspace. Set baseline constraints, fork competing scenarios,
          and run Monte Carlo simulations with bounded mathematical clarity.
        </p>

        {/* Feature Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-sans text-white/70 pt-2">
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
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              navigateWithFade("/projects");
            }}
            onMouseEnter={() => {
              try {
                router?.prefetch("/projects");
              } catch {
                // ignore
              }
            }}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white hover:bg-neutral-100 text-[#121415] text-base font-sans font-semibold shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
          >
            <span>Go to Kairos</span>
            <ArrowUpRight className="w-5 h-5 opacity-90" />
          </Link>
          <div className="text-xs text-white/50 mt-3 font-sans">
            Direct transition to your project workspace
          </div>
        </div>
      </div>

      {/* Editorial Landing Footer */}
      <footer className="w-full max-w-7xl mx-auto pt-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-white/60">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-white">Kairos</span>
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
