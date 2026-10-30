"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { CountUp } from "../ui/CountUp.js";
import { cn } from "../../lib/utils.js";

export interface StatDialogCardProps {
  value: number;
  label: string;
  suffix?: string;
  delay: number;
  detail?: string;
  category?: string;
  tag?: string;
  className?: string;
}

export const StatDialogCard: React.FC<StatDialogCardProps> = ({
  value,
  label,
  suffix = "",
  delay = 0,
  detail,
  category = "Verified Metric",
  tag = "SYS::PROVEN",
  className,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const delaySec = delay > 10 ? delay / 1000 : delay;

  // Track in-view with once: false so cards animate whenever they appear in the viewport
  const isInView = useInView(cardRef, {
    once: false,
    amount: 0.15,
  });

  return (
    <motion.div
      ref={cardRef}
      data-testid="stat-dialog-card"
      data-stat-label={label}
      data-stat-value={value}
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={
        shouldReduceMotion
          ? { opacity: 1, y: 0 }
          : isInView
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 20 }
      }
      transition={{
        duration: shouldReduceMotion ? 0 : 0.45,
        delay: shouldReduceMotion ? 0 : isInView ? delaySec : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "relative border border-neutral bg-[#282c2d] p-5 sm:p-6 shadow-modal rounded-xl sm:rounded-2xl text-white flex flex-col justify-between transition-colors duration-200 hover:border-white/30 group",
        className
      )}
    >
      {/* Dialogue box top bar/chrome with distinct category and tag */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3a5a6b] border border-white/20 group-hover:bg-[#8ba888] transition-colors" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">
              {category}
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/40">{tag}</span>
        </div>

        {/* Big Animated Number Counter */}
        <div className="flex items-baseline gap-1 my-1">
          {shouldReduceMotion ? (
            <span
              data-testid="stat-value"
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-none"
            >
              {value}
              {suffix}
            </span>
          ) : (
            <span
              data-testid="stat-value"
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-none"
            >
              <CountUp
                to={value}
                from={0}
                delay={delaySec}
                duration={0.8}
                suffix={suffix}
                startWhen={isInView}
                className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-none"
              />
            </span>
          )}
        </div>
      </div>

      {/* Label and detailed breakdown */}
      <div className="mt-3 pt-2">
        <div className="font-sans text-xs sm:text-sm text-white/85 font-medium leading-snug">
          {label}
        </div>
        {detail && (
          <div className="font-sans text-[11px] sm:text-xs text-white/55 font-normal mt-1 leading-relaxed">
            {detail}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatDialogCard;
