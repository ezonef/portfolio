"use client";

import { useEffect, useState } from "react";
import { Step } from "@/components/ui/Step/Step";
import styles from "./ProcessStepper.module.css";

type Props = { stages: { id: string; name: string }[] };

/**
 * Figma: My design process → Stage stepper.
 * Clicking a step scrolls to that stage; the step of the stage in view is Active.
 */
export function ProcessStepper({ stages }: Props) {
  const [active, setActive] = useState(stages[0]?.id);

  useEffect(() => {
    const els = stages.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [stages]);

  const go = (id: string) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setActive(id);
  };

  return (
    <nav aria-label="Process stages" className={`container ${styles.stepper}`}>
      {stages.map((s, i) => (
        <Step
          key={s.id}
          size="m"
          number={String(i + 1).padStart(2, "0")}
          title={s.name}
          active={active === s.id}
          aria-current={active === s.id ? "step" : undefined}
          onClick={() => go(s.id)}
          className={styles.step}
        />
      ))}
    </nav>
  );
}
