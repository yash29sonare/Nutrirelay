"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useCallback } from "react";
import styles from "./react-bits.module.css";

type ComponentProps = {
  children?: ReactNode;
  className?: string;
};

type StyleVars = CSSProperties & Record<`--${string}`, string | number>;

export function Aurora({
  className = "",
  opacity = 0.42,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.aurora} ${className}`}
      style={{ "--aurora-opacity": opacity } as StyleVars}
    />
  );
}

export function SplitText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const words = text.split(" ");

  return (
    <span className={`${styles.splitText} ${className}`} aria-label={text}>
      {words.map((word, index) => (
        <span
          aria-hidden="true"
          className={styles.splitWord}
          key={`${word}-${index}`}
          style={{ "--split-index": index } as StyleVars}
        >
          {word}
          {index < words.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </span>
  );
}

export function ShinyText({
  children,
  className = "",
  base = "#b9c4d0",
  highlight = "#ffffff",
}: ComponentProps & {
  base?: string;
  highlight?: string;
}) {
  return (
    <span
      className={`${styles.shinyText} ${className}`}
      style={
        {
          "--shine-base": base,
          "--shine-highlight": highlight,
        } as StyleVars
      }
    >
      {children}
    </span>
  );
}

export function SpotlightCard({
  children,
  className = "",
  color = "rgba(155, 220, 255, 0.18)",
}: ComponentProps & {
  color?: string;
}) {
  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div
      className={`${styles.spotlightCard} ${className}`}
      onPointerMove={handlePointerMove}
      style={{ "--spotlight-color": color } as StyleVars}
    >
      {children}
    </div>
  );
}

export type MagicBentoItem = {
  body: string;
  eyebrow: string;
  title: string;
  wide?: boolean;
};

export function MagicBento({
  items,
  className = "",
}: {
  items: MagicBentoItem[];
  className?: string;
}) {
  return (
    <div className={`${styles.bentoGrid} ${className}`}>
      {items.map((item) => (
        <SpotlightCard
          className={`${styles.bentoCard} rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card-strong)] p-5 ${
            item.wide ? "lg:col-span-2" : ""
          }`}
          color="rgba(95, 228, 166, 0.16)"
          key={item.title}
        >
          <div className="relative z-10 flex h-full flex-col justify-between gap-6">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--landing-accent-strong)]">
                {item.eyebrow}
              </p>
              <h3 className="mt-3 text-base font-semibold leading-6 text-[var(--landing-ink)]">{item.title}</h3>
            </div>
            <p className="text-sm leading-6 text-[var(--landing-muted)]">{item.body}</p>
          </div>
        </SpotlightCard>
      ))}
    </div>
  );
}

export function BorderGlow({
  children,
  className = "",
  glowOpacity = 0.72,
}: ComponentProps & {
  glowOpacity?: number;
}) {
  return (
    <div
      className={`${styles.borderGlow} ${className}`}
      style={{ "--border-glow-opacity": glowOpacity } as StyleVars}
    >
      {children}
    </div>
  );
}
