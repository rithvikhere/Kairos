"use client";

import { useInView, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";

export interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Animated number counter primitive based on React Bits CountUp-TS-TW.
 */
export function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 0.6,
  className = "",
  startWhen = true,
  separator = ",",
  prefix = "",
  suffix = "",
  decimals,
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? to : from);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);

  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
  });

  const isInView = useInView(ref, { once: true, margin: "0px" });

  const getDecimalPlaces = (num: number): number => {
    if (decimals !== undefined) return decimals;
    const str = num.toString();
    if (str.includes(".")) {
      const dec = str.split(".")[1];
      if (dec && parseInt(dec) !== 0) {
        return Math.min(dec.length, 2);
      }
    }
    return 0;
  };

  const maxDecimals = decimals ?? Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;

      const options: Intl.NumberFormatOptions = {
        useGrouping: Boolean(separator),
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      };

      let formattedNumber = Intl.NumberFormat("en-US", options).format(latest);
      if (separator && separator !== ",") {
        formattedNumber = formattedNumber.replace(/,/g, separator);
      }

      return `${prefix}${formattedNumber}${suffix}`;
    },
    [maxDecimals, separator, prefix, suffix]
  );

  useEffect(() => {
    motionValue.set(to);
  }, [to, motionValue]);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(direction === "down" ? to : from);
    }
  }, [from, to, direction, formatValue]);

  useEffect(() => {
    if (isInView && startWhen) {
      if (typeof onStart === "function") {
        onStart();
      }

      const timeoutId = setTimeout(() => {
        motionValue.set(to);
      }, delay * 1000);

      const durationTimeoutId = setTimeout(
        () => {
          if (typeof onEnd === "function") {
            onEnd();
          }
        },
        delay * 1000 + duration * 1000
      );

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest: number) => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });

    return () => unsubscribe();
  }, [springValue, formatValue]);

  return <span className={className} ref={ref} />;
}

export default CountUp;
