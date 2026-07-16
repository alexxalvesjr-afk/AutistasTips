"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  animated?: boolean;
};

/**
 * Marca do AutistasTips: um monograma "A" que também lê como um pico de
 * crescimento (tips que sobem), dentro de um tile arredondado com
 * gradiente crimson premium.
 */
export function LogoMark({ className, animated = false }: LogoMarkProps) {
  const id = useId();
  const gradientId = `${id}-grad`;
  const glowId = `${id}-glow`;

  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="AutistasTips"
      className={cn("h-8 w-8", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb5a76" />
          <stop offset="55%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#a10f34" />
        </linearGradient>
        <linearGradient id={glowId} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Tile */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${gradientId})`} />
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="13"
        fill={`url(#${glowId})`}
      />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="12.25"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.14"
        strokeWidth="1.5"
      />

      {/* Monograma "A" / pico ascendente */}
      {animated ? (
        <motion.g
          initial="hidden"
          animate="visible"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <motion.path
            d="M13 35 L24 13 L35 35"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 1,
                transition: { duration: 0.9, ease: "easeInOut" },
              },
            }}
          />
          <motion.path
            d="M18.4 27.2 L29.6 27.2"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 1,
                transition: { duration: 0.4, delay: 0.75, ease: "easeOut" },
              },
            }}
          />
        </motion.g>
      ) : (
        <g
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d="M13 35 L24 13 L35 35" />
          <path d="M18.4 27.2 L29.6 27.2" />
        </g>
      )}

      {/* Spark no ápice */}
      <circle cx="24" cy="12.5" r="2.4" fill="#ffffff" />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  animated?: boolean;
  showWordmark?: boolean;
};

/** Marca completa: símbolo + wordmark "AutistasTips". */
export function Logo({
  className,
  markClassName,
  wordmarkClassName,
  animated = false,
  showWordmark = true,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn("h-8 w-8", markClassName)} animated={animated} />
      {showWordmark ? (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight text-foreground",
            wordmarkClassName,
          )}
        >
          Autistas<span className="text-primary">Tips</span>
        </span>
      ) : null}
    </div>
  );
}
