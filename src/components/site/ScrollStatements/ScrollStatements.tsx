"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ScrollStatements.module.css";

/**
 * Lines that come into focus one by one as you scroll: a line is sharp once it has
 * risen above two thirds of the screen, soft and faded below that.
 */
export function ScrollStatements({ lines, size = "heading-h2" }: { lines: string[]; /** type style of each line */ size?: string }) {
  const refs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.66;
      setLit(refs.current.filter((el) => el && el.getBoundingClientRect().top < line).length);
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
  }, []);

  return (
    <div className={styles.lines}>
      {lines.map((l, i) => (
        <p key={l} ref={(el) => void (refs.current[i] = el)} className={`${size} ${styles.line}`} data-lit={i < lit || undefined}>
          {l}
        </p>
      ))}
    </div>
  );
}
