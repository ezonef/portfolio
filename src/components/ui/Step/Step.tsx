import type { ButtonHTMLAttributes } from "react";
import styles from "./Step.module.css";

type StepProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  number: string;
  title: string;
  /** Figma: State=Active */
  active?: boolean;
  /** Figma: Size — S in the case player, M on the process page */
  size?: "s" | "m";
};

/** Figma: Step — numbered tab: Size=S in the case player, Size=M on the process page. */
export function Step({ number, title, active = false, size = "s", className, ...rest }: StepProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[styles.step, size === "m" && styles.m, active && styles.active, className].filter(Boolean).join(" ")}
      {...rest}
    >
      <span className={styles.number}>{number}</span>
      <span className={styles.title}>{title}</span>
    </button>
  );
}
