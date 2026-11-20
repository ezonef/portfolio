import type { ReactNode } from "react";
import styles from "./SkillArt.module.css";

export type SkillArtName = "component" | "audit" | "edge" | "prototype" | "figure";

/**
 * Line drawings for the skills bento, in the same hairline style as the Hairline figures:
 * thin strokes in the text colour, one bright mark per drawing. Decorative (aria-hidden).
 */
export function SkillArt({ name }: { name: SkillArtName }) {
  return (
    <svg className={styles.art} viewBox="0 0 320 180" aria-hidden focusable={false}>
      {ART[name]}
    </svg>
  );
}

const ART: Record<SkillArtName, ReactNode> = {
  /* A component set: three sizes of one button, each with an icon slot, inside a dashed set frame */
  component: (
    <>
      <rect className={styles.dash} x="28" y="22" width="264" height="136" rx="10" />
      <text className={styles.label} x="36" y="16">
        Button
      </text>
      {[
        { x: 52, w: 64, h: 24 },
        { x: 132, w: 76, h: 30 },
        { x: 224, w: 52, h: 36 },
      ].map((b, i) => (
        <g key={i}>
          <rect className={i === 1 ? styles.hi : styles.line} x={b.x} y={90 - b.h / 2} width={b.w} height={b.h} rx={b.h / 2} />
          <rect className={styles.dash} x={b.x + 10} y={90 - b.h / 4} width={b.h / 2} height={b.h / 2} rx="2" />
          <line className={styles.soft} x1={b.x + 16 + b.h / 2} x2={b.x + b.w - 12} y1="90" y2="90" />
          <text className={styles.label} x={b.x} y={90 + b.h / 2 + 18}>
            {["S", "M", "L"][i]}
          </text>
        </g>
      ))}
    </>
  ),

  /* An audit: a list of rows ticked off, one flagged, a lens over the flagged one */
  audit: (
    <>
      <rect className={styles.line} x="40" y="20" width="196" height="140" rx="10" />
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 44 + i * 24;
        const flagged = i === 2;
        return (
          <g key={i}>
            {flagged ? (
              <circle className={styles.hiFill} cx="60" cy={y} r="4" />
            ) : (
              <path className={styles.line} d={`M55 ${y} l3.5 3.5 l6 -7`} />
            )}
            <line className={flagged ? styles.hi : styles.soft} x1="76" x2={flagged ? 200 : 170 + (i % 2) * 30} y1={y} y2={y} />
          </g>
        );
      })}
      <circle className={styles.hi} cx="226" cy="92" r="30" />
      <line className={styles.hi} x1="248" y1="114" x2="272" y2="138" />
    </>
  ),

  /* Edge cases: a name that does not fit, a counter that overflows, an empty list */
  edge: (
    <>
      <rect className={styles.line} x="24" y="28" width="168" height="36" rx="18" />
      <circle className={styles.line} cx="44" cy="46" r="9" />
      <text className={styles.text} x="62" y="51">
        Maximilian Alexan…
      </text>
      <rect className={styles.hi} x="212" y="30" width="64" height="32" rx="16" />
      <text className={styles.hiText} x="244" y="50" textAnchor="middle">
        9,999+
      </text>
      <rect className={styles.dash} x="24" y="84" width="272" height="72" rx="10" />
      <rect className={styles.line} x="148" y="102" width="24" height="18" rx="3" />
      <line className={styles.soft} x1="128" x2="192" y1="134" y2="134" />
      <line className={styles.soft} x1="140" x2="180" y1="144" y2="144" />
    </>
  ),

  /* A prototype in code: a browser window, a switch being clicked, the cursor */
  prototype: (
    <>
      <rect className={styles.line} x="24" y="16" width="272" height="148" rx="10" />
      <line className={styles.line} x1="24" x2="296" y1="40" y2="40" />
      {[40, 54, 68].map((x) => (
        <circle key={x} className={styles.soft} cx={x} cy="28" r="3.5" />
      ))}
      <text className={styles.label} x="96" y="32">
        localhost:3000
      </text>
      <line className={styles.soft} x1="48" x2="168" y1="72" y2="72" />
      <line className={styles.soft} x1="48" x2="140" y1="88" y2="88" />
      <rect className={styles.line} x="48" y="108" width="96" height="28" rx="6" />
      <rect className={styles.hi} x="200" y="66" width="44" height="24" rx="12" />
      <circle className={styles.hiFill} cx="232" cy="78" r="8" />
      <path className={styles.hiFill} d="M238 92 l0 26 l7 -6 l5 11 l5 -2 l-5 -11 l9 0 z" />
    </>
  ),

  /* Illustrations: stacked isometric plates, the top one bright */
  figure: (
    <>
      {[0, 1, 2].map((i) => {
        const y = 118 - i * 30;
        const d = `M160 ${y - 34} L250 ${y} L160 ${y + 34} L70 ${y} Z`;
        return <path key={i} className={i === 2 ? styles.hi : styles.line} d={d} />;
      })}
      <line className={styles.dash} x1="70" x2="70" y1="58" y2="118" />
      <line className={styles.dash} x1="250" x2="250" y1="58" y2="118" />
      <line className={styles.dash} x1="160" x2="160" y1="92" y2="152" />
      <path className={styles.soft} d="M130 58 L160 46 L190 58 L160 70 Z" />
    </>
  ),
};
