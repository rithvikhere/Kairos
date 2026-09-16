"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";

export interface ReelGalleryProps {
  /** Array of image URLs to display across the reels */
  images?: string[];
  /** Number of stacked reels/rows to render */
  rows?: number;
  /** Height in pixels of each plate/image row */
  rowHeight?: number;
  /** Vertical gap between rows in pixels */
  rowGap?: number;
  /** Horizontal gap between plates in pixels */
  itemGap?: number;
  /** Maximum aspect ratio (width / height) of a plate */
  maxAspect?: number;
  /** Minimum aspect ratio (width / height) of a plate */
  minAspect?: number;
  /** Border radius in pixels applied to image plates */
  radius?: number;
  /** Master speed multiplier */
  speed?: number;
  /** How much row speeds differ from one another (0 to 1) */
  speedVariance?: number;
  /** Pixels per second the reels drift automatically */
  autoScroll?: number;
  /** Alternate drift direction between consecutive rows */
  alternate?: boolean;
  /** Tilt angle in degrees for the entire reel stage */
  tilt?: number;
  /** Grayscale intensity (0 to 1) */
  grayscale?: number;
  /** Brightness multiplier (0 to 2) */
  brightness?: number;
  /** Overlay color (default bone: #f6f4ef) */
  overlayColor?: string;
  /** Overlay opacity (0 to 1) */
  overlayOpacity?: number;
  /** Blur intensity on the reel images (e.g. "1.5px") */
  blurAmount?: string;
  /** Overall component opacity (0 to 1) */
  opacity?: number;
  /** Additional CSS class names */
  className?: string;
}

const DEFAULT_PHOTOS = [
  "/photos/beatriz-cattel-C55M3wxaoB0-unsplash.jpg",
  "/photos/celine-ylmz-Qe6F668-RQg-unsplash.jpg",
  "/photos/daniil-komov-dma_e1UKkig-unsplash.jpg",
  "/photos/deng-xiang--WXQm_NTK0U-unsplash.jpg",
  "/photos/ilnur-sxK8RUCpqoQ-unsplash.jpg",
  "/photos/kevin-canlas-cFFEeHNZEqw-unsplash.jpg",
  "/photos/markus-spiske-69ppqHiG9Xo-unsplash.jpg",
  "/photos/markus-spiske-XrIfY_4cK1w-unsplash.jpg",
  "/photos/ryan-le-VzrxIccHIsw-unsplash.jpg",
  "/photos/timelab-zlQYtluzKTQ-unsplash.jpg",
  "/photos/timis-alexandra-cySP2Nz27Pg-unsplash.jpg",
  "/photos/yusuf-onuk-PmqB2VPIVpA-unsplash.jpg",
];

// Deterministic pseudo-random aspect ratios based on row and item index
function getAspect(rowIndex: number, itemIndex: number, minAspect: number, maxAspect: number): number {
  const seed = (rowIndex * 37 + itemIndex * 19 + 7) % 100;
  const ratio = seed / 100;
  return Number((minAspect + ratio * (maxAspect - minAspect)).toFixed(2));
}

export const ReelGallery: React.FC<ReelGalleryProps> = ({
  images = DEFAULT_PHOTOS,
  rows = 5,
  rowHeight = 96,
  rowGap = 20,
  itemGap = 16,
  maxAspect = 1.8,
  minAspect = 0.8,
  radius = 12,
  speed = 1,
  speedVariance = 0.35,
  autoScroll = 14,
  alternate = true,
  tilt = -5,
  grayscale = 0.1,
  brightness = 1.15,
  overlayColor = "#f6f4ef",
  overlayOpacity = 0.3,
  blurAmount = "0.5px",
  opacity = 0.7,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Prepare layout data for each row
  // We duplicate images so that the track seamlessly wraps before running out
  const rowData = useMemo(() => {
    const safeImages = images.length > 0 ? images : DEFAULT_PHOTOS;
    const data = [];

    for (let r = 0; r < rows; r++) {
      // Stagger start images per row for visual variation
      const rowImages = [];
      const offset = (r * 3) % safeImages.length;
      for (let i = 0; i < safeImages.length; i++) {
        rowImages.push(safeImages[(offset + i) % safeImages.length]!);
      }

      // Calculate plate dimensions for one full cycle
      const cycleItems = rowImages.map((src, i) => {
        const aspect = getAspect(r, i, minAspect, maxAspect);
        const width = Math.round(rowHeight * aspect);
        return { src, width, height: rowHeight };
      });

      const singleCycleWidth = cycleItems.reduce((acc, item) => acc + item.width + itemGap, 0);

      // Repeat items 3 times to ensure zero gap during infinite looping
      const repeatCount = 3;
      const allItems = [];
      for (let c = 0; c < repeatCount; c++) {
        for (let i = 0; i < cycleItems.length; i++) {
          allItems.push({
            ...cycleItems[i]!,
            key: `row-${r}-c-${c}-i-${i}`,
          });
        }
      }

      data.push({
        cycleWidth: singleCycleWidth,
        items: allItems,
        // Individual speed multiplier based on row index and variance
        speedFactor: 1 + (((r * 17) % 5) - 2) * 0.15 * speedVariance,
        direction: alternate && r % 2 === 1 ? -1 : 1,
      });
    }

    return data;
  }, [images, rows, rowHeight, itemGap, minAspect, maxAspect, speedVariance, alternate]);

  // Continuous animation loop using requestAnimationFrame directly on DOM transforms
  useEffect(() => {
    if (reducedMotion) return;

    let animId: number;
    let lastTime = performance.now();
    // Offset tracking per row
    const offsets = new Array(rows).fill(0);

    const tick = (now: number) => {
      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.1); // Clamp delta to avoid huge jumps
      lastTime = now;

      for (let r = 0; r < rows; r++) {
        const row = rowData[r];
        const track = trackRefs.current[r];
        if (!row || !track) continue;

        const pixelsToMove = autoScroll * speed * row.speedFactor * deltaSeconds;
        offsets[r] = (offsets[r] ?? 0) + row.direction * pixelsToMove;

        // Mathematical seamless wrapping with modulo:
        // Keep offset in range [0, row.cycleWidth)
        const wrapped = (((offsets[r]! % row.cycleWidth) + row.cycleWidth) % row.cycleWidth);

        // Position track via hardware-accelerated transform
        track.style.transform = `translate3d(${-wrapped}px, 0, 0)`;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [reducedMotion, rows, rowData, autoScroll, speed]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-testid="reel-gallery-background"
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}
      style={{
        zIndex: 0,
      }}
    >
      {/* Tilted Stage Container */}
      <div
        className="w-full h-full flex flex-col justify-center items-center"
        style={{
          transform: `rotate(${tilt}deg) scale(1.25)`,
          transformOrigin: "center center",
          opacity: opacity,
          filter: `blur(${blurAmount}) grayscale(${grayscale}) brightness(${brightness})`,
          transition: "opacity 0.4s ease-out",
        }}
      >
        <div
          className="flex flex-col w-[140vw]"
          style={{
            gap: `${rowGap}px`,
          }}
        >
          {rowData.map((row, rIdx) => (
            <div
              key={`reel-row-${rIdx}`}
              className="relative w-full overflow-visible whitespace-nowrap will-change-transform"
              style={{
                height: `${rowHeight}px`,
              }}
            >
              <div
                ref={(el) => {
                  trackRefs.current[rIdx] = el;
                }}
                className="inline-flex items-center will-change-transform"
                style={{
                  gap: `${itemGap}px`,
                }}
              >
                {row.items.map((item) => (
                  <div
                    key={item.key}
                    className="relative shrink-0 overflow-hidden bg-neutral-800"
                    style={{
                      width: `${item.width}px`,
                      height: `${item.height}px`,
                      borderRadius: `${radius}px`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      alt=""
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover select-none pointer-events-none"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reduced-Contrast Bone Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
          mixBlendMode: "normal",
        }}
      />

      {/* Soft Vignette / Gradient Scrim to gently frame section edges */}
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#343839]/30 via-transparent to-[#343839]/50"
        style={{
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
};

export default ReelGallery;
