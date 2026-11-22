"use client";

import { useState, type CSSProperties } from "react";
import { PALETTES, STEPS, type PaletteName, type Step } from "./palette";
import { SpikeScreen } from "./SpikeScreen";
import styles from "./spike.module.css";

/** Rebind one token, or swap the brand palette: the whole Spike screen follows. Surfaces and text stay on the neutral ramp. */
const DEFAULTS = {
  "color/button/primary/default": 600,
  "color/button/primary/hover": 800,
  "color/control/on": 600,
  "color/surface/sidebar-primary": 100,
  "color/surface/sidebar-secondary": 50,
  "color/surface/row-hover": 100,
  "color/text/primary": 900,
  "color/text/secondary": 500,
} satisfies Record<string, Step>;
type Token = keyof typeof DEFAULTS;
const TOKENS = Object.keys(DEFAULTS) as Token[];
const BRAND = new Set<Token>(["color/button/primary/default", "color/button/primary/hover", "color/control/on"]);
/** The list, grouped by the component or role each token belongs to */
const GROUPS: { name: string; prefix: string; tokens: Token[] }[] = [
  { name: "Button", prefix: "color/button/", tokens: ["color/button/primary/default", "color/button/primary/hover"] },
  { name: "Control", prefix: "color/control/", tokens: ["color/control/on"] },
  { name: "Surface", prefix: "color/surface/", tokens: ["color/surface/sidebar-primary", "color/surface/sidebar-secondary", "color/surface/row-hover"] },
  { name: "Text", prefix: "color/text/", tokens: ["color/text/primary", "color/text/secondary"] },
];
const cssVar = (t: Token) => `--${t.replaceAll("/", "-")}`;

export default function Tokens() {
  const [palette, setPalette] = useState<PaletteName>("Blue");
  const [map, setMap] = useState<Record<Token, Step>>(DEFAULTS);
  const [picked, setPicked] = useState<Token>("color/button/primary/hover");
    const rampOf = (t: Token) => (BRAND.has(t) ? PALETTES[palette] : PALETTES.Neutral);
  const ramp = rampOf(picked);
  const vars = Object.fromEntries(TOKENS.map((t) => [cssVar(t), rampOf(t)[map[t]]])) as CSSProperties;
  const changed = TOKENS.some((t) => map[t] !== DEFAULTS[t]) || palette !== "Blue";

  return (
    <div className={styles.app}>
      <aside className={styles.side}>
        <p className={`mono-label ${styles.eyebrow}`}>Semantic tokens</p>
        <div className={styles.tokenGroups}>
          {GROUPS.map((g) => (
            <div key={g.name} role="group" aria-label={g.name}>
              <p className={`mono-xs ${styles.tokenGroup}`}>{g.name}</p>
              <ul className={styles.tokens}>
                {g.tokens.map((t) => (
                  <li key={t}>
                    <button type="button" className={`mono-xs ${styles.token}`} aria-label={t} aria-pressed={picked === t} onClick={() => setPicked(t)}>
                      <span className={styles.swatch} style={{ background: rampOf(t)[map[t]] }} aria-hidden />
                      {t.replace(g.prefix, "")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className={`mono-label ${styles.eyebrow} ${styles.gapTop}`}>Points at primitive</p>
        <div className={styles.ramp} role="group" aria-label={`Primitive for ${picked}`}>
          {STEPS.map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`primitive/${s}`}
              aria-pressed={map[picked] === s}
              style={{ background: ramp[s] }}
              onClick={() => setMap((m) => ({ ...m, [picked]: s }))}
            />
          ))}
        </div>

        <p className={`mono-label ${styles.eyebrow} ${styles.gapTop}`}>Palette</p>
        <div className={styles.chips}>
          {(Object.keys(PALETTES) as PaletteName[]).map((p) => (
            <button key={p} type="button" className="mono-xs" aria-pressed={palette === p} onClick={() => setPalette(p)}>
              {p}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`mono-xs ${styles.reset}`}
          disabled={!changed}
          onClick={() => {
            setMap(DEFAULTS);
            setPalette("Blue");
          }}
        >
          Reset
        </button>
      </aside>

      <section className={styles.main}>
        <p className={`mono-xs ${styles.chain}`}>
          <b>{picked}</b> → primitive/{map[picked]} → {ramp[map[picked]]}
          <span>var({cssVar(picked)})</span>
        </p>

        <SpikeScreen style={vars} />
      </section>
    </div>
  );
}
