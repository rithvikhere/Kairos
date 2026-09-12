import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent text-base shadow",
        secondary:
          "border-transparent bg-neutral text-ink",
        outline:
          "border-neutral text-ink",
        low:
          "border-[#c8d9c2] bg-risk-low text-[#2a4225]",
        moderate:
          "border-[#ded0a6] bg-risk-mod text-[#524118]",
        high:
          "border-[#d6ad76] bg-risk-high text-[#573511]",
        critical:
          "border-[#bf7765] bg-risk-crit text-[#4f1e14]",
        neutral:
          "border-[#d4cdc0] bg-[#e8e3d8] text-[#1f2421]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
