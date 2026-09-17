"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface PageFadeContextType {
  isFadingOut: boolean;
  navigateWithFade: (targetHref?: string) => void;
}

const defaultContextValue: PageFadeContextType = {
  isFadingOut: false,
  navigateWithFade: (targetHref = "/projects") => {
    if (typeof window !== "undefined") {
      window.location.href = targetHref;
    }
  },
};

export const PageFadeContext = createContext<PageFadeContextType | null>(null);

export function usePageFade(): PageFadeContextType {
  const ctx = useContext(PageFadeContext);
  return ctx ?? defaultContextValue;
}

export interface PageFadeProviderProps {
  children: React.ReactNode;
}

export const PageFadeProvider: React.FC<PageFadeProviderProps> = ({ children }) => {
  let router: ReturnType<typeof useRouter> | null = null;
  let pathname = "/";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    pathname = usePathname() || "/";
  } catch {
    pathname = "/";
  }

  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const inFlightRef = useRef(false);
  const lastPathnameRef = useRef(pathname);

  // Global prefetch on provider mount
  useEffect(() => {
    try {
      router?.prefetch("/projects");
    } catch {
      // ignore
    }
  }, [router]);

  // When pathname changes (new route mounted), reset fade-out and fade new page in from 0 -> 1
  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      setIsFadingOut(false);
      setIsMounted(false);
      const frame = requestAnimationFrame(() => {
        setIsMounted(true);
        inFlightRef.current = false;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [pathname]);

  const navigateWithFade = useCallback(
    (targetHref: string = "/projects") => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      // Prefetch route again before navigating
      try {
        router?.prefetch(targetHref);
      } catch {
        // ignore
      }

      // Respect prefers-reduced-motion
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

      if (prefersReducedMotion) {
        if (router) {
          router.push(targetHref);
        } else if (typeof window !== "undefined") {
          window.location.href = targetHref;
        }
        inFlightRef.current = false;
        return;
      }

      // 1. Fade the CURRENT page content out in place (opacity 1 -> 0 over 280ms)
      setIsFadingOut(true);

      // 2. Once fade-out completes, call router.push to navigate
      setTimeout(() => {
        if (router) {
          router.push(targetHref);
        } else if (typeof window !== "undefined") {
          window.location.href = targetHref;
        }
      }, 280);
    },
    [router]
  );

  // Content opacity: dims out to 0 on exit, animates in to 1 on entry
  const opacity = isFadingOut ? 0 : isMounted ? 1 : 0;

  return (
    <PageFadeContext.Provider value={{ isFadingOut, navigateWithFade }}>
      <div
        className="page-fade-container"
        data-fading-out={isFadingOut}
        style={{
          opacity,
          transition: "opacity 280ms cubic-bezier(0.16, 1, 0.3, 1)",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        {children}
      </div>
    </PageFadeContext.Provider>
  );
};

export default PageFadeProvider;
