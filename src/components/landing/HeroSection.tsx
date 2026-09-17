"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { usePageFade } from "../../contexts/PageFadeContext.js";

export const HeroSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
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

  const scrollToFeatures = () => {
    const el = document.getElementById("analytics") || document.getElementById("feature-showcase");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-between items-center text-center px-6 sm:px-12 lg:px-20 py-16 md:py-20 bg-transparent text-white overflow-hidden"
    >
      {/* Bottom gradient blend transition into Section 2 */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-[#121415]/60 to-[#121415] z-0"
        aria-hidden="true"
      />

      {/* Centered Main Hero Block */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center py-16 my-auto space-y-6">
        {/* Big Kairos Title in Center */}
        <h1 className="font-serif text-7xl sm:text-8xl md:text-9xl font-medium tracking-tight text-white leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
          Kairos
        </h1>

        {/* Sub-headline: Every decision has a shape. */}
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.15] drop-shadow-[0_2px_14px_rgba(0,0,0,0.8)]">
          Every decision <span className="italic font-serif text-white/90 underline decoration-white/30 underline-offset-8">has a shape.</span>
        </h2>

        {/* Explanatory Lead Paragraph */}
        <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto font-sans font-normal leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
          Kairos simulates project trade-offs in real time — calculating true
          cost, schedule risk, and delivery uncertainty before you commit
          engineering resources.
        </p>

        {/* Centered Action Controls */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/projects"
            data-testid="hero-enter-btn"
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
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-white hover:bg-neutral-100 text-[#121415] text-base font-sans font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
          >
            <span>Go to Kairos</span>
            <ArrowUpRight className="w-4 h-4 text-[#121415]" />
          </Link>

          <button
            type="button"
            onClick={scrollToFeatures}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-sm font-sans font-medium text-white hover:bg-white/15 border border-white/30 backdrop-blur-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Inspect the engine</span>
            <ArrowDown className="w-4 h-4 opacity-80" />
          </button>
        </div>
      </div>

      {/* Centered Scroll Prompt Indicator */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-center text-xs font-sans text-white/60 pb-2">
        <span>Scroll to explore interactive architecture ↓</span>
      </div>
    </section>
  );
};

export default HeroSection;
