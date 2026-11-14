import type { ReactNode } from "react";
import styles from "./Tag.module.css";

type TagProps = {
  /** Figma: Tone */
  tone?: "outline" | "muted" | "inverse";
  children: ReactNode;
};

/** Non-interactive label. For filtering use Chip. */
export function Tag({ tone = "outline", children }: TagProps) {
  return <span className={`${styles.tag} ${styles[tone]}`}>{children}</span>;
}
