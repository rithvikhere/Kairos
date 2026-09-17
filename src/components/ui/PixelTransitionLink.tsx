"use client";

import React, { useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePixelTransition } from "./PixelTransitionProvider.js";

export interface PixelTransitionLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

export const PixelTransitionLink: React.FC<PixelTransitionLinkProps> = ({
  href,
  children,
  className = "",
  onClick,
  onMouseEnter,
  onTouchStart,
  "data-testid": dataTestId,
  ...rest
}) => {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }
  const { startTransition, isTransitioning } = usePixelTransition();

  // Prefetch route on mount for instantaneous route resolution
  useEffect(() => {
    try {
      router?.prefetch(href);
    } catch {
      // ignore in test environments
    }
  }, [href, router]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      try {
        router?.prefetch(href);
      } catch {
        // ignore in test environments
      }
      onMouseEnter?.(e);
    },
    [href, router, onMouseEnter]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLAnchorElement>) => {
      try {
        router?.prefetch(href);
      } catch {
        // ignore in test environments
      }
      onTouchStart?.(e);
    },
    [href, router, onTouchStart]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Allow new-tab / modified clicks to operate natively
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      // Check prefers-reduced-motion
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        // Allow native link navigation or run custom onClick
        onClick?.(e);
        return;
      }

      // Intercept and run pixel mosaic transition
      e.preventDefault();
      onClick?.(e);

      if (isTransitioning) return;

      // Extract click position (or bounding box center for keyboard Enter / Space triggers)
      let clickX = e.clientX;
      let clickY = e.clientY;

      if (!clickX && !clickY && e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        clickX = rect.left + rect.width / 2;
        clickY = rect.top + rect.height / 2;
      }

      startTransition(href, { x: clickX, y: clickY });
    },
    [href, isTransitioning, onClick, startTransition]
  );

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      data-testid={dataTestId}
      {...rest}
    >
      {children}
    </Link>
  );
};

export default PixelTransitionLink;
