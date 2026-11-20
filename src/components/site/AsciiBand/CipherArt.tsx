"use client";

import { useEffect, useRef, useState } from "react";
import { cipherRow, easeOut, randomGlyph, reducedMotion } from "@/lib/cipher";
import styles from "./AsciiBand.module.css";

type Props = { art: string; className: string };

const DURATION = 2600;
/** Where the cipher front is when the decrypt front starts following it (in progress units) */
const LAG = 0.32;

/**
 * The ASCII art arrives encrypted: an oval of ciphertext grows from the centre,
 * and right behind its edge every character decrypts into the real picture.
 * Server HTML holds the real art, so without JS (or with reduced motion) it is simply there.
 * Once decrypted, a ring of light opens from the centre every 10 s (CSS only).
 */
export function CipherArt({ art, className }: Props) {
  const ref = useRef<HTMLPreElement>(null);
  const [state, setState] = useState<"waiting" | "playing" | "done">("waiting");
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      setState("done");
      return;
    }

    const rows = art.split("\n").map((l) => [...l]);
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const cipher = rows.map(() => [...cipherRow(w)]);
    // per cell: when the cipher shows up, and when it turns into the real character
    const showAt: number[][] = [];
    const realAt: number[][] = [];
    for (let r = 0; r < h; r++) {
      showAt.push([]);
      realAt.push([]);
      for (let c = 0; c < w; c++) {
        const dx = (c - (w - 1) / 2) / (w / 2);
        const dy = (r - (h - 1) / 2) / (h / 2);
        const d = Math.min(1, Math.hypot(dx, dy) / Math.SQRT2);
        const s = d * (1 - LAG - 0.12) + Math.random() * 0.08;
        showAt[r].push(s);
        realAt[r].push(s + LAG * (0.7 + Math.random() * 0.6));
      }
    }

    let raf = 0;
    let start = 0;
    let lastFlicker = 0;
    const frame = (now: number) => {
      if (!start) start = now;
      const p = easeOut(Math.min(1, (now - start) / DURATION));
      const flicker = now - lastFlicker > 70;
      if (flicker) lastFlicker = now;
      let out = "";
      for (let r = 0; r < h; r++) {
        const row = rows[r];
        const ci = cipher[r];
        for (let c = 0; c < w; c++) {
          if (p < showAt[r][c]) out += " ";
          else if (p < realAt[r][c]) {
            if (flicker && ci[c] !== " " && ci[c] !== "." && ci[c] !== ":" && Math.random() < 0.12) ci[c] = randomGlyph();
            out += ci[c];
          } else out += row[c] ?? " ";
        }
        if (r < h - 1) out += "\n";
      }
      el.textContent = out;
      if (p < 1) raf = requestAnimationFrame(frame);
      else {
        el.textContent = art;
        setState("done");
        setGlow(true);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setState("playing");
        raf = requestAnimationFrame(frame);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = art;
    };
  }, [art]);

  return (
    <div className={styles.stage}>
      <pre ref={ref} className={`${className} ${styles.cipher}`} data-cipher={state}>
        {art}
      </pre>
      {glow && (
        <pre className={`${styles.art} ${styles.glow}`} aria-hidden>
          {art}
        </pre>
      )}
    </div>
  );
}
