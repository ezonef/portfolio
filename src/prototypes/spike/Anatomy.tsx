"use client";

import { Fragment, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import menu from "../dropdown/dropdown.module.css";
import { PrototypeToolsSlot } from "../tools-slot";
import { PALETTES, type Step } from "./palette";
import styles from "./spike.module.css";

/** One private primitive holds geometry and content; the public Button only adds variants and colour. */
const SIZES = {
  Small: { h: 32, px: 12, gap: 6, r: 6, fs: 13, icon: 14 },
  Medium: { h: 40, px: 16, gap: 8, r: 8, fs: 14, icon: 16 },
  Large: { h: 48, px: 20, gap: 8, r: 10, fs: 16, icon: 18 },
};
type Size = keyof typeof SIZES;
const TYPES = ["Primary", "Secondary", "Ghost"] as const;
const STATES = ["Default", "Hover", "Pressed", "Disabled"] as const;
type Kind = (typeof TYPES)[number];
type State = (typeof STATES)[number];

export const SURFACE: Record<Kind, Record<State, { bg: Step | null; fg: Step }>> = {
  Primary: { Default: { bg: 950, fg: 50 }, Hover: { bg: 800, fg: 50 }, Pressed: { bg: 900, fg: 50 }, Disabled: { bg: 200, fg: 400 } },
  Secondary: { Default: { bg: 100, fg: 950 }, Hover: { bg: 200, fg: 950 }, Pressed: { bg: 300, fg: 950 }, Disabled: { bg: 100, fg: 400 } },
  Ghost: { Default: { bg: null, fg: 950 }, Hover: { bg: 100, fg: 950 }, Pressed: { bg: 200, fg: 950 }, Disabled: { bg: null, fg: 400 } },
};

const PROPS = [
  ["leadingSlot", "Leading slot"],
  ["leadingIcon", "Leading icon"],
  ["trailingIcon", "Trailing icon"],
  ["trailingSlot", "Trailing slot"],
] as const;

export default function Anatomy() {
  const [on, setOn] = useState({ leadingSlot: false, leadingIcon: true, trailingIcon: false, trailingSlot: false });
  const [label, setLabel] = useState("Button");
  const [kind, setKind] = useState<Kind>("Primary");
  const [size, setSize] = useState<Size>("Medium");
  const [state, setState] = useState<State>("Default");
  const [spacing, setSpacing] = useState(true);
  const [outlines, setOutlines] = useState(true);
  const g = SIZES[size];
  const c = SURFACE[kind][state];
  const ramp = PALETTES.Neutral;
  const token = `color/button/${kind.toLowerCase()}/${state.toLowerCase()}`;
  const text = label.trim() || "Label";

  const parts = [
    on.leadingSlot && { k: "Leading slot", el: <span className={styles.slot} style={{ width: g.icon, height: g.icon }} /> },
    on.leadingIcon && { k: "Leading icon", el: <Mark d="M8 3v10M3 8h10" size={g.icon} /> },
    { k: "Label", el: <span className={styles.btnLabel}>{text}</span> },
    on.trailingIcon && { k: "Trailing icon", el: <Mark d="M4 6l4 4 4-4" size={g.icon} /> },
    on.trailingSlot && { k: "Trailing slot", el: <span className={styles.count}>3</span> },
  ].filter(Boolean) as { k: string; el: ReactNode }[];

  return (
    <div className={styles.app}>
      <aside className={styles.side}>
        <p className={`mono-label ${styles.eyebrow}`}>Public Button</p>
        <Choice label="Type" value={kind} options={TYPES} onPick={setKind} />
        <Choice label="Size" value={size} options={Object.keys(SIZES) as Size[]} onPick={setSize} />
        <Choice label="State" value={state} options={STATES} onPick={setState} />

        <p className={`mono-label ${styles.eyebrow} ${styles.gapTop}`}>_Button{size}</p>
        <label className={styles.field}>
          <span className="mono-xs">Label · required</span>
          <input value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} aria-invalid={!label.trim()} />
        </label>
        <div className={styles.checks}>
          {PROPS.map(([k, name]) => (
            <button key={k} type="button" className={`mono-xs ${styles.check}`} aria-pressed={on[k]} onClick={() => setOn((o) => ({ ...o, [k]: !o[k] }))}>
              <span aria-hidden />
              {name}
            </button>
          ))}
        </div>

        <div className={styles.specs}>
          <dl>
            <div><dt className="mono-xs">Height</dt><dd className="mono-s">{g.h}</dd></div>
            <div><dt className="mono-xs">Padding</dt><dd className="mono-s">{g.px}</dd></div>
            <div><dt className="mono-xs">Gap</dt><dd className="mono-s">{g.gap}</dd></div>
            <div><dt className="mono-xs">Radius</dt><dd className="mono-s">{g.r}</dd></div>
          </dl>
          <p className={`mono-xs ${styles.tokenLine}`}>
            {c.bg ? `${token} → primitive/${c.bg} → ${ramp[c.bg]}` : `${token} → transparent`}
          </p>
        </div>
      </aside>

      <section className={styles.main}>
        <div className={styles.artboard}>
          <div
            className={styles.btn}
            data-spacing={spacing || undefined}
            data-outlines={outlines || undefined}
            style={{
              height: g.h,
              borderRadius: g.r,
              fontSize: g.fs,
              background: c.bg ? ramp[c.bg] : "transparent",
              color: ramp[c.fg],
              boxShadow: kind === "Ghost" && !c.bg ? `inset 0 0 0 1px ${spacing || outlines ? ramp[300] : "transparent"}` : undefined,
            }}
          >
            <i className={styles.space} style={{ width: g.px }} />
            {parts.map((p, i) => (
              <Fragment key={p.k}>
                {i > 0 && <i className={styles.space} style={{ width: g.gap }} />}
                <span className={styles.part} data-name={p.k}>
                  {p.el}
                </span>
              </Fragment>
            ))}
            <i className={styles.space} style={{ width: g.px }} />
          </div>
        </div>

      </section>

      <GuidesMenu spacing={spacing} outlines={outlines} onSpacing={setSpacing} onOutlines={setOutlines} />
    </div>
  );
}

/** Same Settings button and card as the dropdown case, beside the player's Description */
function GuidesMenu({
  spacing,
  outlines,
  onSpacing,
  onOutlines,
}: {
  spacing: boolean;
  outlines: boolean;
  onSpacing: (v: boolean) => void;
  onOutlines: (v: boolean) => void;
}) {
  const slot = useContext(PrototypeToolsSlot);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      button.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key, true);
    };
  }, [open]);
  useEffect(() => {
    if (slot === null) setOpen(false);
  }, [slot]);

  if (slot === null) return null;
  const rows = [
    { label: "Spacing", on: spacing, set: onSpacing },
    { label: "Content", on: outlines, set: onOutlines },
  ];
  const ui = (
    <div ref={root} className={menu.settings}>
      {open && (
        <div id="anatomy-settings" className={menu.settingsCard} role="group" aria-label="Guides">
          <p className="mono-label" style={{ color: "var(--color-text-tertiary)" }}>Guides</p>
          <div className={menu.toggles}>
            {rows.map((r) => (
              <button key={r.label} type="button" className={`mono-xs ${menu.toggle}`} aria-pressed={r.on} onClick={() => r.set(!r.on)}>
                <span className={menu.box} aria-hidden />
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        ref={button}
        type="button"
        className={`mono-s ${menu.settingsButton}`}
        aria-expanded={open}
        aria-controls="anatomy-settings"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
          <path d="M2.5 5h6M12 5h1.5M2.5 11H4M7.5 11h6M10 3.2a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM6 9.2a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6z" />
        </svg>
        Settings
      </button>
    </div>
  );
  return slot ? createPortal(ui, slot) : <div className={menu.localTools}>{ui}</div>;
}

function Choice<T extends string>({ label, value, options, onPick }: { label: string; value: T; options: readonly T[]; onPick: (v: T) => void }) {
  return (
    <div className={styles.choice} role="group" aria-label={label}>
      <span className={`mono-xs ${styles.dim}`}>{label}</span>
      <div className={styles.chips}>
        {options.map((o) => (
          <button key={o} type="button" className="mono-xs" aria-pressed={value === o} onClick={() => onPick(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Mark({ d, size }: { d: string; size: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
