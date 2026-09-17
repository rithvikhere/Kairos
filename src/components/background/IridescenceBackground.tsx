"use client";

import React from "react";
import { Iridescence } from "./Iridescence.js";

export function IridescenceBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-50 overflow-hidden"
      aria-hidden="true"
    >
      <Iridescence
        color={[1, 1, 1]}
        mouseReact={false}
        amplitude={0.1}
        speed={1.0}
      />
      {/* Dark overlay scrim to keep the iridescent waves deep, atmospheric, and ensure crisp white text readability */}
      <div className="absolute inset-0 bg-[#121415]/70 pointer-events-none" />
    </div>
  );
}

export default IridescenceBackground;
