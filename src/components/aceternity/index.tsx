"use client";

import type { ReactNode } from "react";
import styles from "./aceternity.module.css";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FocusCards({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(styles.focusCards, className)}>{children}</div>;
}
