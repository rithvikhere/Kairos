"use client";

import React, { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils.js";

export interface AnimatedButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children?: React.ReactNode;
}

/**
 * AnimatedButton applying specific interaction physics per action type:
 * - Primary: Confident weighty press (scale-down on press, accent fill sweep on hover)
 * - Destructive: Deliberate, resistant, slower hover feel to prevent impulsive clicks
 */
export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs font-medium rounded-md",
      md: "px-4 py-2 text-sm font-medium rounded-lg",
      lg: "px-6 py-3 text-base font-semibold rounded-lg",
    }[size];

    const variantClasses = {
      primary:
        "bg-accent text-base shadow-sm hover:brightness-110 active:brightness-95 border border-[#2e4755]",
      secondary:
        "bg-neutral text-ink hover:bg-[#ded8cc] border border-[#d4cdc0]",
      destructive:
        "bg-risk-crit text-[#2b100b] hover:bg-[#c98675] border border-[#bf7765] transition-all duration-deliberate",
      outline:
        "border border-[#d4cdc0] bg-transparent text-ink hover:bg-neutral",
      ghost:
        "bg-transparent text-ink hover:bg-neutral/60",
    }[variant];

    // Interaction motion physics per variant
    const motionProps =
      variant === "destructive"
        ? {
            // Slower, resistant feel for destructive actions
            whileHover: disabled ? undefined : { scale: 1.01 },
            whileTap: disabled ? undefined : { scale: 0.99 },
            transition: { duration: 0.4, ease: "easeOut" as const },
          }
        : {
            // Confident weighty press for primary / standard actions
            whileHover: disabled ? undefined : { scale: 1.02 },
            whileTap: disabled ? undefined : { scale: 0.96 },
            transition: { duration: 0.15, ease: "easeOut" as const },
          };

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
          sizeClasses,
          variantClasses,
          className
        )}
        {...motionProps}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";
export default AnimatedButton;
