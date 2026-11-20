"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import styles from "./UndoToast.module.css";


type Props = {
  /** Changes on every new toast, so the countdown restarts */
  id: number;
  icon?: ReactNode;
  text: string;
  /** Without it there is no Undo button — a plain notice */
  onUndo?: () => void;
  onDone: () => void;
  /** "inverse" = black (delete + undo), "success" = green (saved) */
  tone?: "inverse" | "success";
  duration?: number;
};

/**
 * Black after a delete: [5.0 s] [icon + text] [Undo]. Green after a save: just the text.
 * The seconds count down; pointing at the toast pauses them.
 */
export function UndoToast({ id, icon, text, onUndo, onDone, tone = "inverse", duration = 5000 }: Props) {
  const [left, setLeft] = useState(duration);
  /** Time is up: play the exit, then tell the parent (on animationend) */
  const [leaving, setLeaving] = useState(false);
  const paused = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    setLeft(duration);
    setLeaving(false);
    let remaining = duration;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!paused.current) remaining -= now - last;
      last = now;
      if (remaining <= 0) return setLeaving(true);
      setLeft(remaining);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id, duration]);

  // Safety net: if the exit animation never reports back (animations off), close anyway
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => done.current(), 400);
    return () => clearTimeout(t);
  }, [leaving]);

  return (
    <div
      className={styles.toast}
      data-tone={tone}
      data-leaving={leaving || undefined}
      onAnimationEnd={(e) => {
        if (leaving && e.target === e.currentTarget) done.current();
      }}
      role="status"
      aria-live="polite"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {tone === "inverse" && (
        <span className={`mono-s ${styles.timer}`} aria-hidden>
          {(Math.ceil(left / 100) / 10).toFixed(1)} s
        </span>
      )}
      {icon && tone === "inverse" && <span className={styles.icon} aria-hidden>{icon}</span>}
      <span className={`body-s ${styles.text}`}>{text}</span>
      {onUndo && (
        <Button variant="soft" size="s" className={styles.undo} onClick={onUndo}>
          Undo
        </Button>
      )}
    </div>
  );
}
