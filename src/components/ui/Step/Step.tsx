import type { ButtonHTMLAttributes } from "react";
import styles from "./Step.module.css";

type StepProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  number: string;
  title: string;
  /** Figma: State=Active */
  active?: boolean;
};

/** Figma: Step (Size=S) — numbered tab in the case player. */
export function Step({ number, title, active = false, className, ...rest }: StepProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[styles.step, active && styles.active, className].filter(Boolean).join(" ")}
      {...rest}
    >
      <span className={styles.number}>{number}</span>
      <span className={styles.title}>{title}</span>
    </button>
  );
}
