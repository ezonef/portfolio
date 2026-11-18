"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import styles from "./UndoToast.module.css";

const DURATION = 5000;

type Props = {
  /** Changes on every new toast, so the countdown restarts */
  id: number;
  icon?: ReactNode;
  text: string;
  onUndo: () => void;
  onDone: () => void;
};

/**
 * Black toast after a delete: [5.0 s] [icon + what was deleted] [Undo].
 * The seconds count down; pointing at the toast pauses them.
 */
export function UndoToast({ id, icon, text, onUndo, onDone }: Props) {
  const [left, setLeft] = useState(DURATION);
  const paused = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    setLeft(DURATION);
    let remaining = DURATION;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!paused.current) remaining -= now - last;
      last = now;
      if (remaining <= 0) return done.current();
      setLeft(remaining);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id]);

  return (
    <div
      className={styles.toast}
      role="status"
      aria-live="polite"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <span className={`mono-s ${styles.timer}`} aria-hidden>
        {(Math.ceil(left / 100) / 10).toFixed(1)} s
      </span>
      {icon && <span className={styles.icon} aria-hidden>{icon}</span>}
      <span className={`body-s ${styles.text}`}>{text}</span>
      <Button variant="soft" size="s" className={styles.undo} onClick={onUndo}>
        Undo
      </Button>
    </div>
  );
}
