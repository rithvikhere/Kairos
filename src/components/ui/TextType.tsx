"use client";

import React, { useEffect, useState } from "react";

export interface TextTypeProps {
  text: string;
  typingSpeed?: number; // ms per character
  className?: string;
  onComplete?: () => void;
}

/**
 * Typewriter text reveal based on React Bits TextType-TS-TW.
 *
 * Progressively types out a completed string.
 * Under prefers-reduced-motion, instantly renders the full text.
 */
export const TextType: React.FC<TextTypeProps> = ({
  text,
  typingSpeed = 15,
  className = "",
  onComplete,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDisplayedText(text);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsTyping(false);
      onComplete?.();
      return;
    }

    setDisplayedText("");
    setIsTyping(true);
    let index = 0;

    const interval = setInterval(() => {
      index += 1;
      setDisplayedText(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
        onComplete?.();
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [text, typingSpeed, onComplete]);

  return (
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      <span>{displayedText}</span>
      {isTyping && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-accent align-middle animate-pulse" />
      )}
    </div>
  );
};

export default TextType;
