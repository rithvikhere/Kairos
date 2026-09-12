"use client";

import React from "react";
import { motion } from "framer-motion";

export interface HotspotMarkerProps {
  id: string;
  label: string;
  sublabel?: string;
  top: string;
  left: string;
  onClick: () => void;
  ariaLabel: string;
}

/**
 * HotspotMarker: React Bits inspired interactive pulse beacon primitive.
 * Emits continuous concentric pulse waves while maintaining accessible
 * keyboard focus and high-contrast affordance over the mock dashboard UI.
 */
export const HotspotMarker: React.FC<HotspotMarkerProps> = ({
  id,
  label,
  sublabel,
  top,
  left,
  onClick,
  ariaLabel,
}) => {
  return (
    <div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2 group"
      style={{ top, left }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        data-testid={`hotspot-${id}`}
        className="relative flex items-center justify-center w-8 h-8 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c4356] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f4ef] cursor-pointer"
      >
        {/* Outer continuous expanding pulse wave */}
        <span
          className="absolute inset-0 rounded-full bg-[#2c4356]/30 animate-ping duration-1000 pointer-events-none"
          aria-hidden="true"
        />

        {/* Middle ambient soft glow ring */}
        <span
          className="absolute w-6 h-6 rounded-full bg-[#2c4356]/20 transition-transform duration-300 group-hover:scale-125"
          aria-hidden="true"
        />

        {/* Inner solid core beacon with border */}
        <motion.span
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          className="relative w-3.5 h-3.5 rounded-full bg-[#2c4356] border-2 border-[#f6f4ef] shadow-md flex items-center justify-center"
        >
          <span className="w-1 h-1 rounded-full bg-white opacity-80" />
        </motion.span>

        {/* Hover Pill Label */}
        <div className="absolute left-1/2 -top-9 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#221f1b] text-[#f6f4ef] text-[11px] font-sans font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 shadow-lg border border-white/10 z-40">
          <span>{label}</span>
          {sublabel && (
            <span className="text-white/60 ml-1 text-[10px]">· {sublabel}</span>
          )}
        </div>
      </button>
    </div>
  );
};

export default HotspotMarker;
