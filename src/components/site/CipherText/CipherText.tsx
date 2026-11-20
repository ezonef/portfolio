"use client";

import { useEffect, useRef, useState } from "react";
import { randomGlyph, reducedMotion } from "@/lib/cipher";
import styles from "./CipherText.module.css";

type Props = {
  /** One string per visual line; each line keeps its own width while it is encrypted */
  lines: string[];
  /** ms before the first character starts decrypting */
  delay?: number;
  duration?: number;
  /** Encrypt and decrypt again every N ms after the first time (off when omitted) */
  repeat?: number;
};

/**
 * Text that arrives as ciphertext and decrypts character by character, roughly left to right.
 * With `repeat` it scrambles and decrypts again on that interval.
 * The real text stays in the layout (hidden while scrambling), the cipher is drawn on top of it,
 * so nothing reflows. Screen readers only ever get the real text.
 */
export function CipherText({ lines, delay = 250, duration = 1100, repeat }: Props) {
  const fakes = useRef<(HTMLSpanElement | null)[]>([]);
  const [state, setState] = useState<"waiting" | "playing" | "done">("waiting");

  useEffect(() => {
    if (reducedMotion()) {
      setState("done");
      return;
    }
    const total = lines.reduce((n, l) => n + l.length, 0);
    let raf = 0;
    let timer = 0;

    const play = (wait: number) => {
      let k = 0;
      // when each character becomes real: left-to-right with some scatter
      const at = lines.map((l) =>
        [...l].map(() => {
          const t = (k++ / total) * 0.7 + Math.random() * 0.3;
          return wait + t * duration;
        }),
      );
      const glyphs = lines.map((l) => [...l].map((ch) => (ch === " " ? " " : randomGlyph())));
      let start = 0;
      let last = 0;
      const frame = (now: number) => {
        if (!start) start = now;
        const t = now - start;
        if (now - last > 55) {
          last = now;
          lines.forEach((l, i) => {
            const el = fakes.current[i];
            if (!el) return;
            el.textContent = [...l]
              .map((ch, j) => {
                if (ch === " " || t >= at[i][j]) return ch;
                if (Math.random() < 0.35) glyphs[i][j] = randomGlyph();
                return glyphs[i][j];
              })
              .join("");
          });
        }
        if (t < wait + duration) raf = requestAnimationFrame(frame);
        else {
          setState("done");
          if (repeat) timer = window.setTimeout(() => play(0), repeat);
        }
      };
      setState("playing");
      raf = requestAnimationFrame(frame);
    };

    play(delay);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [lines, delay, duration, repeat]);

  return (
    <span className={styles.text} data-cipher={state}>
      {lines.map((l, i) => (
        <span key={i} className={styles.line}>
          <span className={styles.real}>{l}</span>
          <span ref={(el) => void (fakes.current[i] = el)} className={styles.fake} aria-hidden>
            {l}
          </span>
        </span>
      ))}
    </span>
  );
}
