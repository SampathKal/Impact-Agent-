import * as React from "react";
import { motion, type Transition } from "motion/react";

export type GlowEffectProps = {
  className?: string;
  style?: React.CSSProperties;
  colors?: string[];
  mode?: "rotate" | "pulse" | "breathe" | "colorShift" | "flowHorizontal" | "static";
  blur?: number | "softest" | "soft" | "medium" | "strong" | "stronger" | "strongest" | "none";
  transition?: Transition;
  scale?: number;
  duration?: number;
};

export function GlowEffect({
  className = "",
  style,
  colors = ["#fcdbdf", "#fd688d", "#fabefc", "#c34ec7", "#fd6a6a", "#e844f7"],
  mode = "rotate",
  blur = "medium",
  transition,
  scale = 1,
  duration = 5,
}: GlowEffectProps) {
  const base = { repeat: Infinity, duration, ease: "linear" as const };
  const gradients = colors.map((color, i) => {
    const next = colors[(i + 1) % colors.length];
    return mode === "flowHorizontal"
      ? `linear-gradient(90deg, ${color}, ${next})`
      : `conic-gradient(from ${i * 360 / colors.length}deg, ${color}, ${next}, ${color})`;
  });
  const animate = mode === "static"
    ? { background: `linear-gradient(90deg, ${colors.join(", ")})` }
    : mode === "pulse" || mode === "breathe"
      ? { background: gradients, scale: mode === "pulse" ? [scale, scale * 1.08, scale] : [scale, scale * 1.03, scale], opacity: [0.65, 0.95, 0.65], transition: transition ?? { ...base, repeatType: "mirror" as const } }
      : { background: mode === "rotate" ? [`conic-gradient(from 0deg, ${colors.join(", ")})`, `conic-gradient(from 360deg, ${colors.join(", ")})`] : gradients, transition: transition ?? { ...base, repeatType: "mirror" as const } };
  const blurValue = typeof blur === "number" ? `${blur}px` : ({ softest: "4px", soft: "8px", medium: "14px", strong: "20px", stronger: "28px", strongest: "36px", none: "0px" } as const)[blur];
  return (
    <motion.div
      aria-hidden="true"
      style={{ ...style, filter: `blur(${blurValue})`, transform: `scale(${scale})`, willChange: "transform", pointerEvents: "none" }}
      animate={animate}
      className={`glow-effect-layer ${className}`}
    />
  );
}
