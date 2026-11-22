"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Segmented.module.css";

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** What is being chosen, for screen readers */
  label: string;
  /** m: the size of SectionNav. s: for tight spots, like inside a player */
  size?: "m" | "s";
  className?: string;
};

/**
 * Figma: SectionNav as a control — the same grey bar and one pill sliding under the chosen chip,
 * for switching between a few options on the spot.
 */
export function Segmented<T extends string>({ options, value, onChange, label, size = "m", className }: Props<T>) {
  const list = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const place = () => {
      const chip = el.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (chip) setPill((p) => ({ x: chip.offsetLeft, w: chip.offsetWidth, moved: p !== null }));
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div className={[styles.bar, className].filter(Boolean).join(" ")} data-size={size}>
      <div ref={list} className={styles.list} role="group" aria-label={label}>
        {pill && <span aria-hidden className={styles.pill} data-moved={pill.moved || undefined} style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} />}
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`${size === "s" ? "mono-xs" : "mono-s"} ${styles.chip}`}
            aria-pressed={o.value === value}
            onClick={(e) => {
              onChange(o.value);
              // a mouse click leaves no focus ring behind
              if (e.detail > 0) e.currentTarget.blur();
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
