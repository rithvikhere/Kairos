"use client";

import React from "react";
import { HeroSection } from "../components/landing/HeroSection.js";
import { FeatureShowcaseSection } from "../components/landing/FeatureShowcaseSection.js";
import { DataVisualizationsSection } from "../components/landing/DataVisualizationsSection.js";
import { FinalCtaSection } from "../components/landing/FinalCtaSection.js";

/**
 * Kairos Landing Page:
 * A single-page, scroll-driven landing experience designed to showcase the product's
 * deterministic simulation engine, multi-axis risk scoring, scenario diffing, Monte Carlo
 * uncertainty modeling, and bounded AI attribution layer before entering the workspace at /projects.
 */
export default function LandingPage() {
  return (
    <div className="w-full bg-[#f6f4ef] text-[#221f1b] overflow-x-hidden selection:bg-[#2c4356] selection:text-[#f6f4ef]">
      {/* 1. Hero Section: Editorial typography + Orchestrated curve draw-in */}
      <HeroSection />

      {/* 2. Interactive Feature Showcase: Background mock + 5 pulsing hotspots */}
      <FeatureShowcaseSection />

      {/* 3. Data Visualizations Section: Meaning-driven risk charts */}
      <DataVisualizationsSection />

      {/* 4. Final CTA Section: Transition into the Kairos workspace */}
      <FinalCtaSection />
    </div>
  );
}
