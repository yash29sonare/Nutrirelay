"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./magic-ui.module.css";

type StyleVars = CSSProperties & Record<`--${string}`, string | number>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reducedMotion;
}

export function BlurFade({
  children,
  className = "",
  delay = 0,
  duration = 520,
  offset = 16,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  offset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-40px 0px -8% 0px", threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      className={cx(styles.blurFade, visible && styles.blurFadeVisible, className)}
      style={
        {
          "--blur-delay": `${delay}ms`,
          "--blur-duration": `${duration}ms`,
          "--blur-offset": `${offset}px`,
        } as StyleVars
      }
    >
      {children}
    </div>
  );
}

export function AnimatedList({
  items,
  className = "",
  delay = 1450,
}: {
  items: Array<{ label: string; detail: string; accent?: string }>;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion || items.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, delay);

    return () => window.clearInterval(interval);
  }, [delay, items.length, reducedMotion]);

  return (
    <div className={cx(styles.animatedList, className)} aria-label="NutriRelay workflow preview">
      {items.map((item, index) => (
        <div
          className={cx(styles.animatedListItem, index === activeIndex && styles.animatedListItemActive)}
          key={item.label}
          style={{ "--item-accent": item.accent ?? "#63ffb7" } as StyleVars}
        >
          <span className={styles.workflowDot} />
          <div>
            <p className="text-sm font-semibold text-white">{item.label}</p>
            <p className="mt-0.5 text-xs leading-5 text-white/64">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Marquee({
  children,
  className = "",
  duration = 36,
}: {
  children: ReactNode[];
  className?: string;
  duration?: number;
}) {
  const items = useMemo(() => [...children, ...children], [children]);

  return (
    <div className={cx(styles.marqueeMask, className)}>
      <div className={styles.marqueeTrack} style={{ "--marquee-duration": `${duration}s` } as StyleVars}>
        {items.map((child, index) => (
          <div className={styles.marqueeItem} key={index}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

export function NumberTicker({
  value,
  className = "",
  duration = 900,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (reducedMotion) return;

    let frame = 0;
    const startedAt = performance.now();

    const tick = (time: number) => {
      const progress = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reducedMotion, value]);

  return <span className={className}>{displayValue.toLocaleString("en-IN")}</span>;
}

export function BorderBeam({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(styles.borderBeam, className)}>{children}</div>;
}

export function MovingBorder({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(styles.movingBorder, className)}>{children}</div>;
}

export function StickyScrollReveal({
  items,
  className = "",
  intro,
}: {
  items: Array<{ title: string; body: string; image: string }>;
  className?: string;
  intro?: ReactNode;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = items[activeIndex] ?? items[0];

  return (
    <div className={cx(styles.stickyReveal, className)}>
      <div className={styles.stickyRevealContent}>
        {intro ? <div className={styles.stickyRevealIntro}>{intro}</div> : null}
        <div className={styles.stickyRevealList}>
          {items.map((item, index) => (
            <article
              className={cx(styles.stickyRevealItem, index === activeIndex && styles.stickyRevealItemActive)}
              key={item.title}
              onFocus={() => setActiveIndex(index)}
              onPointerEnter={() => setActiveIndex(index)}
              tabIndex={0}
            >
              <div className={styles.stickyRevealIndex}>{index + 1}</div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className={styles.stickyRevealMedia} aria-hidden="true">
        <div
          className={styles.stickyRevealImage}
          style={{ "--sticky-image": `url(${activeItem?.image ?? ""})` } as StyleVars}
        />
      </div>
    </div>
  );
}
