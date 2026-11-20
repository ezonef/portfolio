import type { CSSProperties } from "react";
import { CipherArt } from "./CipherArt";
import styles from "./AsciiBand.module.css";

type AsciiBandProps = {
  art: string;
  /** Figma: text colour token of the illustration */
  tone?: "accent" | "tertiary";
  bordered?: boolean;
  /** Decrypt from ciphertext the first time it scrolls into view (home hero only) */
  reveal?: boolean;
};

/**
 * Figma: Illustration/ascii-band — decorative ASCII art that always spans the full screen width.
 * The font size is derived from the container width and the longest line,
 * so the art scales with the viewport instead of being cropped or leaving gaps.
 * With `reveal` it arrives encrypted on first view: an oval of ciphertext grows from the centre and decrypts into the art.
 */
export function AsciiBand({ art, tone = "accent", bordered = false, reveal = false }: AsciiBandProps) {
  const cols = Math.max(...art.split("\n").map((line) => [...line].length));
  return (
    <div
      className={[styles.band, bordered && styles.bordered].filter(Boolean).join(" ")}
      style={{ "--cols": cols } as CSSProperties}
      aria-hidden
    >
      {reveal ? (
        <CipherArt art={art} className={`${styles.art} ${styles[tone]}`} />
      ) : (
        <pre className={`${styles.art} ${styles[tone]}`}>{art}</pre>
      )}
    </div>
  );
}
