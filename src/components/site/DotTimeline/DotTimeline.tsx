"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./DotTimeline.module.css";

type Column = { label: string; median: number; spread: number };
type Props = {
  columns: Column[];
  aiFrom: number;
  /** Heading and text shown above the chart, inside the pinned stage */
  children?: ReactNode;
  dotsPer?: number;
};

const W = 1400;
const H = 540;
const PAD = { l: 48, r: 16, t: 48, b: 48 };

/** Small deterministic RNG, so server and client draw the same dots */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
/** roughly normal, from three uniforms */
const gauss = (r: () => number) => (r() + r() + r() - 1.5) / 1.5;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A strip plot that assembles itself as you scroll. The section is pinned for a while:
 * at first every dot sits on an even grid (the same dot grid as the hero), then column by column
 * the dots slide to their place — one dot per feature, by the hours a stage took — and the axes fade in.
 * Dim before AI, bright with AI; a dashed line splits the two.
 */
export function DotTimeline({ columns, aiFrom, children, dotsPer = 26 }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const col = iw / columns.length;
  const r = rng(7);
  // Each feature's hours: log-normal around the median (real work has a long tail of slow ones),
  // and now and then an outlier that ran well over.
  const hours = columns.map((c) =>
    Array.from({ length: dotsPer }, () => {
      const h = c.median * Math.exp(gauss(r) * 3 * c.spread);
      return r() < 0.06 ? h * (1.4 + r() * 0.4) : h;
    }),
  );
  // the axis fits the data, in steps of a round number of hours
  const top = Math.max(...hours.flat());
  const step = top > 16 ? 4 : 2;
  const MAX = Math.ceil(top / step) * step;
  const TICKS = Array.from({ length: MAX / step + 1 }, (_, i) => i * step);
  const y = (h: number) => PAD.t + ih - (Math.min(MAX, Math.max(0.1, h)) / MAX) * ih;
  const aiX = PAD.l + col * aiFrom;
  const sum = (cs: Column[]) => Math.round(cs.reduce((n, c) => n + c.median, 0) * 10) / 10;
  const before = sum(columns.slice(0, aiFrom));
  const after = sum(columns.slice(aiFrom));

  // Grid spot and chart spot for every dot. The grid has two lattice columns per chart column.
  const rows = Math.ceil(dotsPer / 2);
  const gx = iw / (columns.length * 2);
  const gy = ih / rows;
  const dots = columns.flatMap((_, i) =>
    Array.from({ length: dotsPer }, (_, k) => ({
      i,
      from: [PAD.l + gx * (i * 2 + (k % 2) + 0.5), PAD.t + gy * (Math.floor(k / 2) + 0.5)],
      to: [PAD.l + col * (i + 0.5) + gauss(r) * col * 0.3, y(hours[i][k])],
    })),
  );

  useEffect(() => {
    const el = wrap.current;
    const s = svg.current;
    if (!el || !s) return;
    const circles = [...s.querySelectorAll<SVGCircleElement>("circle[data-dot]")];
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = (p: number) => {
      circles.forEach((c, n) => {
        const d = dots[n];
        // each column starts a little after the one before it
        const t = ease(clamp01((p - 0.08 - d.i * 0.03) / 0.5));
        c.setAttribute("cx", String(d.from[0] + (d.to[0] - d.from[0]) * t));
        c.setAttribute("cy", String(d.from[1] + (d.to[1] - d.from[1]) * t));
      });
      s.style.setProperty("--axes", String(clamp01((p - 0.55) / 0.3)));
      s.style.setProperty("--lit", String(clamp01((p - 0.6) / 0.3)));
    };

    if (still) {
      draw(1);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      draw(travel > 0 ? clamp01(-rect.top / travel) : 1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // dots are derived from props; the effect only wires scrolling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, aiFrom, dotsPer]);

  return (
    <div ref={wrap} className={styles.scrolly}>
      <div className={styles.stage}>
        {children}
        <svg
          ref={svg}
          className={styles.chart}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Hours per stage of a feature. Before AI: ${columns
            .slice(0, aiFrom)
            .map((c) => `${c.label} ${c.median}`)
            .join(", ")} hours, ${before} in all. With AI: ${columns
            .slice(aiFrom)
            .map((c) => `${c.label} ${c.median}`)
            .join(", ")} hours, ${after} in all.`}
        >
          <g className={styles.axes}>
            {TICKS.map((t) => (
              <g key={t}>
                <line className={styles.grid} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
                <text className={styles.tick} x={PAD.l - 12} y={y(t) + 4} textAnchor="end">
                  {t}h
                </text>
              </g>
            ))}
            <text className={styles.era} x={PAD.l + 8} y={20}>
              Before AI · {before} h a feature
            </text>
            <line className={styles.ai} x1={aiX} x2={aiX} y1={4} y2={H - PAD.b} />
            <text className={`${styles.era} ${styles.eraOn}`} x={aiX + 12} y={20}>
              With AI · {after} h a feature
            </text>
            {columns.map((c, i) => (
              <text key={i} className={styles.stageLabel} x={PAD.l + col * (i + 0.5)} y={H - PAD.b + 26} textAnchor="middle">
                {c.label}
              </text>
            ))}
          </g>

          {dots.map((d, n) => (
            <circle
              key={n}
              data-dot=""
              className={d.i >= aiFrom ? styles.after : styles.before}
              cx={d.from[0]}
              cy={d.from[1]}
              r={3.8}
              style={{ "--i": d.i } as CSSProperties}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
