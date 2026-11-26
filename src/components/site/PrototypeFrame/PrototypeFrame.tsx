"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { findPrototype } from "@/prototypes/registry";
import { PROTOTYPE_COMPONENTS } from "@/prototypes/components";
import { PrototypeScale } from "@/prototypes/tools-slot";
import styles from "./PrototypeFrame.module.css";

/** Below this window width a product can't reflow, so fullscreen keeps scaling it. */
const MIN_REAL_WIDTH = 1120;

/** What a viewer can act on inside a prototype */
const LIVE = 'a[href], button:not(:disabled), input:not(:disabled), select, textarea, label, summary, [role="button"], [role="switch"], [role="checkbox"], [role="tab"], [role="menuitem"], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
/** A click does something when it lands on a control, or on anything that shows a hand or a drag cursor */
const isLive = (t: Element) => !!t.closest(LIVE) || !["auto", "default", "text", "none", ""].includes(getComputedStyle(t).cursor);
/** Dark ink on a light surface, light ink on a dark one: read from the first filled background under the click */
function inkFor(t: Element) {
  for (let el: Element | null = t; el; el = el.parentElement) {
    const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    if (!m || (m.length > 3 && Number(m[3]) === 0)) continue;
    const [r, g, b] = m.map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? "light" : "dark";
  }
  return "dark";
}
/** What makes two controls "the same kind": the element, its role and look, and the first word of its label ("Turn on …", "Sort …") */
const kindOf = (el: Element) => [el.tagName, el.getAttribute("role") ?? "", el.className, (el.getAttribute("aria-label") ?? "").split(" ")[0]].join("|");
type Hint = { id: number; x: number; y: number; ink: "light" | "dark"; spots: { x: number; y: number; w: number; h: number; r: string }[] };

/**
 * A live code prototype inside a screen box. It renders at the size it was designed at
 * and is scaled down to fit (like an image with object-fit: contain), so its layout never reflows.
 * Clicks, typing and scrolling inside it work as in the real thing.
 */
export function PrototypeFrame({ id, label }: { id: string; label?: string }) {
  const meta = findPrototype(id);
  const Proto = PROTOTYPE_COMPONENTS[id];
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0, w: 0, h: 0 });
  // A click on something that does nothing: every control on screen pulses once, so it is clear what can be clicked
  const [hint, setHint] = useState<Hint | null>(null);
  const showHint = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as Element;
    const b = box.current;
    if (!b || e.button !== 0 || isLive(t) || window.getSelection()?.toString()) return;
    const at = b.getBoundingClientRect();
    const device = e.currentTarget.getBoundingClientRect();
    const spots = [...e.currentTarget.querySelectorAll(LIVE)]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 4 && r.height > 4 && r.right > device.left && r.left < device.right && r.bottom > device.top && r.top < device.bottom)
      // controls that only appear on hover (row checkboxes, ⋯ menus) are not shown as clickable yet
      .filter(({ el }) => {
        const cs = getComputedStyle(el);
        return cs.visibility !== "hidden" && Number(cs.opacity) > 0.05;
      })
      // a control inside another one (an icon in a button) is shown once, by its outer box
      .filter(({ el }, _, all) => !all.some((o) => o.el !== el && o.el.contains(el)))
      // a control that repeats (a switch on every row, a header on every column) is shown once, the first time;
      // a prototype marks with data-hint="each" the ones that differ in what they open, like navigation
      .filter(({ el }, i, all) => el.getAttribute("data-hint") === "each" || !all.slice(0, i).some((o) => kindOf(o.el) === kindOf(el)))
      .map(({ el, r }) => ({ x: r.left - at.left, y: r.top - at.top, w: r.width, h: r.height, r: getComputedStyle(el).borderRadius }))
      // controls side by side (a header and its resize handle) share one pulse
      .filter((s, i, all) => !all.slice(0, i).some((o) => Math.hypot(o.x + o.w / 2 - (s.x + s.w / 2), o.y + o.h / 2 - (s.y + s.h / 2)) < 22))
      .slice(0, 160);
    setHint({ id: Date.now(), x: e.clientX - at.left, y: e.clientY - at.top, ink: inkFor(t), spots });
  };

  useEffect(() => {
    const el = box.current;
    if (!el || !meta) return;
    const measure = () => {
      if (meta.fill && el.closest("[data-full]") && el.clientWidth >= MIN_REAL_WIDTH) {
        // fullscreen: the real product at its real sizes, reflowed to the window
        setFit({ scale: 1, w: el.clientWidth, h: el.clientHeight });
      } else if (meta.fill) {
        // edge to edge: scaled by width, and as tall as the box at that scale
        const scale = el.clientWidth / meta.width;
        setFit({ scale, w: meta.width, h: el.clientHeight / scale });
      } else setFit({ scale: Math.min(el.clientWidth / meta.width, el.clientHeight / meta.height), w: meta.width, h: meta.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [meta]);

  if (!meta || !Proto) return <div className={`mono-xs ${styles.missing}`}>Unknown prototype “{id}”</div>;

  return (
    <div ref={box} className={styles.box}>
      <div
        className={styles.device}
        data-fill={meta.fill || undefined}
        role="group"
        aria-label={label ?? meta.title}
        onClick={showHint}
        style={{
          width: fit.w || meta.width,
          height: fit.h || meta.height,
          transform: `translate(-50%, -50%) scale(${fit.scale})`,
          opacity: fit.scale ? 1 : 0,
        }}
      >
        <PrototypeScale.Provider value={fit.scale || 1}>
          <Proto />
        </PrototypeScale.Provider>
      </div>
      {hint && (
        <div key={hint.id} className={styles.hint} data-ink={hint.ink} aria-hidden onAnimationEnd={(e) => e.target === e.currentTarget && setHint(null)}>
          {/* Every control on screen pulses once with a dot and a soft ring; the empty spot clicked shows nothing */}
          {hint.spots.map((s, i) => (
            <span key={i} className={styles.hintSpot} style={{ left: s.x + s.w / 2, top: s.y + s.h / 2 }}>
              <span className={styles.hintRing} />
              <span className={styles.hintDot} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
