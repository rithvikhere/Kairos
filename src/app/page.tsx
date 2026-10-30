"use client";

import React from "react";
import { HeroSection } from "../components/landing/HeroSection.js";
import { ProofOfWorkSection } from "../components/landing/ProofOfWorkSection.js";
import { DataVisualizationsSection } from "../components/landing/DataVisualizationsSection.js";
import { FeatureShowcaseSection } from "../components/landing/FeatureShowcaseSection.js";
import { FinalCtaSection } from "../components/landing/FinalCtaSection.js";

/**
 * Kairos Landing Page:
 * A single-page, scroll-driven landing experience designed to showcase the product's
 * deterministic simulation engine, multi-axis risk scoring, scenario diffing, Monte Carlo
 * uncertainty modeling, and bounded AI attribution layer before entering the workspace at /projects.
 */
export default function LandingPage() {
  return (
    <div className="relative w-full bg-transparent text-white overflow-x-hidden selection:bg-[#2c4356] selection:text-white">
      <div className="relative z-10">
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. Proof of Work Section: Live-computed repository telemetry and stats */}
        <ProofOfWorkSection />

        {/* 3. Data Visualizations Section: Meaning-driven analytical risk charts */}
        <DataVisualizationsSection />

        {/* 4. Interactive Feature Showcase: Subsystem inspector + Dashboard mock */}
        <FeatureShowcaseSection />

        {/* 5. Final CTA Section: Transition into the Kairos workspace */}
        <FinalCtaSection />
      </div>
    </div>
  );
}
