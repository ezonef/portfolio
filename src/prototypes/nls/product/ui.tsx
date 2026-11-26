"use client";

import { Check, ChevronRight, CircleHelp, Filter, X } from "lucide-react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./product.module.css";

/** The app root: popovers render here so they stay inside the scaled player and are never clipped by a table. */
export const RootEl = createContext<HTMLElement | null>(null);

const TINTS = ["#f3d9c8", "#d9e4fb", "#dcefdf", "#f6dbe3", "#e9defa"];
export function Avatar({ text, size = 24 }: { text: string; size?: number }) {
  const tint = TINTS[(text.charCodeAt(0) + (text.charCodeAt(1) || 0)) % TINTS.length];
  return (
    <span className={styles.avatar} style={{ width: size, height: size, background: tint, fontSize: size * 0.38 }} aria-hidden>
      {text}
    </span>
  );
}

/**
 * A small "?" that explains why something is off limits. Hover or focus shows the reason above it.
 * The bubble renders at the prototype root, so a scrolling list never clips it. On a dark surface it turns light.
 */
export function HelpTip({ text, onDark }: { text: string; onDark?: boolean }) {
  const root = useContext(RootEl);
  const ref = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const show = () => {
    const el = ref.current;
    if (!root || !el) return;
    const r = root.getBoundingClientRect();
    const scale = r.width / root.offsetWidth || 1;
    const a = el.getBoundingClientRect();
    setAt({ x: (a.left + a.width / 2 - r.left) / scale, y: (a.top - r.top) / scale });
  };
  return (
    <>
      <button ref={ref} type="button" className={styles.helpTipBtn} aria-label={text} onPointerEnter={show} onPointerLeave={() => setAt(null)} onFocus={show} onBlur={() => setAt(null)}>
        <CircleHelp size={14} />
      </button>
      {at && root && createPortal(<span className={styles.helpTip} data-on-dark={onDark || undefined} role="tooltip" style={{ left: at.x, top: at.y }}>{text}</span>, root)}
    </>
  );
}

/** People in a table cell, the same in every table: the first one's avatar and name, then how many more */
export function PeopleCell({ names }: { names: string[] }) {
  if (!names.length) return <>—</>;
  const first = names[0];
  return (
    <span className={styles.buyer} title={names.join(", ")}>
      <Avatar text={first.split(" ").map((w) => w[0]).join("")} size={20} />
      <span>{names.length > 1 ? `${first.split(" ")[0]} +${names.length - 1}` : first}</span>
    </span>
  );
}

/** On/off switch. "mixed" is for a group where some items are on and some are off: the knob waits in the middle */
export function Toggle({ on, label, disabled, onChange, look }: { on: boolean | "mixed"; label: string; disabled?: boolean; onChange?: () => void; look?: boolean }) {
  // Only the look, for a control that is a switch as a whole (a button with a label): no button inside a button
  if (look) return <span className={styles.toggle} aria-checked={on} aria-hidden data-disabled={disabled || undefined}><i /></span>;
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={styles.toggle} onClick={onChange}>
      <i />
    </button>
  );
}

export function Checkbox({ state, label, onChange }: { state: boolean | "mixed"; label: string; onChange: () => void }) {
  return (
    // A row whose children are only partly picked stays empty: only what was picked shows a tick
    <button type="button" role="checkbox" aria-checked={state === true} aria-label={label} className={styles.check} onClick={onChange}>
      {state === true ? <Check size={11} strokeWidth={3} /> : null}
    </button>
  );
}

/**
 * Lets a modal be moved by its header: press on empty header space and drag.
 * Put data-drag-panel on the modal and this handler on its header's onPointerDown.
 */
export function dragPanel(e: ReactPointerEvent<HTMLElement>) {
  if (e.button !== 0 || (e.target as HTMLElement).closest("button, input, textarea, select, a, label")) return;
  const panel = e.currentTarget.closest<HTMLElement>("[data-drag-panel]");
  if (!panel) return;
  e.preventDefault();
  // The prototype can be drawn scaled down, so screen pixels are turned back into its own
  const scale = panel.getBoundingClientRect().width / panel.offsetWidth || 1;
  const [ox, oy] = (panel.dataset.dragAt ?? "0,0").split(",").map(Number);
  const sx = e.clientX;
  const sy = e.clientY;
  const move = (ev: PointerEvent) => {
    const x = ox + (ev.clientX - sx) / scale;
    const y = oy + (ev.clientY - sy) / scale;
    panel.dataset.dragAt = `${x},${y}`;
    panel.style.translate = `${x}px ${y}px`;
  };
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    document.body.style.cursor = "";
  };
  document.body.style.cursor = "grabbing";
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
}

/**
 * Reorders a list by dragging a row's grip. Rows carry data-reorder-row and sit side by side in one parent.
 * `shown` is the visible part of `all` (a filtered view): only those items move, the rest keep their places.
 */
export function dragReorder<T extends { id: number | string }>(e: ReactPointerEvent<HTMLElement>, all: T[], shown: T[], id: T["id"], onChange: (next: T[]) => void) {
  if (e.button !== 0) return;
  const row = e.currentTarget.closest<HTMLElement>("[data-reorder-row]");
  const box = row?.parentElement;
  if (!row || !box) return;
  e.preventDefault();
  let order = shown.map((x) => x.id);
  row.dataset.dragging = "";
  const rebuild = () => {
    const byId = new Map(all.map((x) => [x.id, x]));
    const queue = order.map((k) => byId.get(k)!);
    const visible = new Set(order);
    return all.map((x) => (visible.has(x.id) ? queue.shift()! : x));
  };
  const move = (ev: PointerEvent) => {
    const others = [...box.querySelectorAll<HTMLElement>(":scope > [data-reorder-row]")].filter((r) => r !== row);
    const to = others.filter((r) => { const b = r.getBoundingClientRect(); return ev.clientY > b.top + b.height / 2; }).length;
    const from = order.indexOf(id);
    if (to === from) return;
    order = [...order];
    order.splice(from, 1);
    order.splice(to, 0, id);
    onChange(rebuild());
  };
  const end = () => {
    delete row.dataset.dragging;
    document.body.style.cursor = "";
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  };
  document.body.style.cursor = "grabbing";
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
}

const FLAG_CODE: Record<string, string> = { Poland: "pl", Germany: "de", Italy: "it", USA: "us", Spain: "es", France: "fr", UK: "gb" };
/** A round country flag drawn in CSS, for geo rows */
export function CountryFlag({ country }: { country: string }) {
  return <span className={styles.countryFlag} data-country={FLAG_CODE[country] ?? "none"} aria-hidden />;
}

const filterWord = (n: number) => (n === 1 ? "filter" : "filters");

/**
 * The toolbar's filter button. Empty, it is a round glass icon; with filters on it names how many,
 * and a cross to clear them shows when the pointer is over it.
 */
export function FilterButton({ count, open, onClick, onClear, spot }: { count: number; open: boolean; onClick: () => void; onClear: () => void; spot?: string }) {
  if (!count)
    return (
      <button type="button" className={`${styles.iconBtn} ${styles.glass}`} data-spot={spot} data-filter-toggle aria-label="Filters" aria-pressed={open} onClick={onClick}>
        <Filter size={17} />
      </button>
    );
  return (
    <span className={`${styles.glass} ${styles.filterBtn}`} data-open={open || undefined}>
      <button type="button" data-spot={spot} data-filter-toggle aria-label={`Filters: ${count}`} aria-pressed={open} onClick={onClick}>
        <Filter size={16} /> {count} {filterWord(count)}
      </button>
      <button type="button" className={styles.filterClear} aria-label="Reset filters" onClick={onClear}>
        <X size={14} />
      </button>
    </span>
  );
}

/**
 * The dimmed layer under every modal. It renders in the app root, so it covers the whole product
 * (rail and top bar too), not only the screen that opened it. A press on the dim closes the modal.
 */
export function Layer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const root = useContext(RootEl);
  if (!root) return null;
  return createPortal(
    <div className={styles.pickerLayer} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>,
    root,
  );
}

/** Hairline drawing for features in progress: a dashboard with one widget still being put together */
/** Hairline art for the beta note: a dashboard draws itself in, then the widget that is on its way keeps waiting in a dashed slot */
function BetaArt() {
  // Each stroke draws in after the one before; d is its delay in steps
  const draw = (d: number) => ({ className: styles.betaDraw, pathLength: 1, style: { "--d": d } as CSSProperties });
  return (
    <svg className={styles.betaArt} viewBox="0 0 320 150" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round">
        {/* the dashboard */}
        <rect x="40.5" y="20.5" width="240" height="112" rx="8" {...draw(0)} />
        <path d="M40.5 38.5h240" {...draw(1)} />
        <circle cx="52.5" cy="29.5" r="2" {...draw(1)} />
        <circle cx="60.5" cy="29.5" r="2" {...draw(1)} />
        {/* a line chart widget */}
        <rect x="52.5" y="50.5" width="104" height="70" rx="5" {...draw(2)} />
        <path d="M62.5 62.5h28" {...draw(3)} />
        <path d="M62.5 106.5l18-16 14 8 20-22 16 10 14-12" {...draw(4)} />
        {/* a bar widget */}
        <rect x="166.5" y="50.5" width="102" height="30" rx="5" {...draw(2)} />
        <path d="M176.5 72.5v-6M184.5 72.5v-10M192.5 72.5v-4M200.5 72.5v-12" {...draw(3)} />
        <path d="M214.5 61.5h40M214.5 68.5h26" {...draw(4)} />
      </g>
      {/* the widget on its way: a dashed slot whose border keeps moving, with a plus that breathes */}
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" className={styles.betaSoon}>
        <rect x="166.5" y="88.5" width="102" height="32" rx="5" strokeDasharray="3 3" className={styles.betaSlot} />
        <path d="M217.5 99.5v10M212.5 104.5h10" className={styles.betaPlus} />
      </g>
      {/* sparkles */}
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M290.5 22.5v8M286.5 26.5h8" className={styles.betaSpark} />
        <path d="M24.5 104.5v6M21.5 107.5h6" className={styles.betaSpark} style={{ animationDelay: "1.2s" }} />
        <circle cx="300.5" cy="118.5" r="1.5" className={styles.betaSpark} style={{ animationDelay: "0.6s" }} />
      </g>
    </svg>
  );
}

/** A feature that is not out yet: art on top, what it is and when, and one button to go back */
export function BetaModal({ title, onClose }: { title: string; onClose: () => void }) {
  useEffect(() => {
    const key = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <Layer onClose={onClose}>
      <section className={styles.betaModal} role="dialog" aria-label={title}>
        <div className={styles.betaHero}>
          <BetaArt />
          <button type="button" className={styles.betaClose} aria-label="Close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <div className={styles.betaBody}>
          <h3>{title} is on its way</h3>
          <p>We are still building this part. It comes in one of the next updates; until then, everything else here works as usual.</p>
          <button type="button" className={styles.betaBtn} autoFocus onClick={onClose}>Got it</button>
        </div>
      </section>
    </Layer>
  );
}

/**
 * Open popovers, oldest first. A popover opened from inside another (a menu inside a panel) comes later,
 * so a click in it is not "outside" for the one that opened it; a click outside all of them closes them all.
 */
const layers: HTMLElement[] = [];
/** Whether a click landed in a popover opened after `el` (or in any open popover, without `el`) */
export function inLaterLayer(t: globalThis.Node, el?: HTMLElement | null) {
  const from = el ? layers.indexOf(el) + 1 : 0;
  return layers.slice(from).some((l) => l.contains(t));
}

export function Popover({
  anchor,
  onClose,
  align = "start",
  width,
  className,
  draggable,
  spot,
  side,
  onPointerEnter,
  onPointerLeave,
  children,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  align?: "start" | "end";
  width?: number;
  /** Replaces the NLS popover look, for another product's prototype */
  className?: string;
  /** The popover is a modal that can be moved by its header (see dragPanel) */
  draggable?: boolean;
  /** Lets the onboarding point at this popover */
  spot?: string;
  /** A submenu: opens beside its row, first row level with it, and turns back at the edge */
  side?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  children: ReactNode;
}) {
  const root = useContext(RootEl);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; max?: number } | null>(null);
  // The side the menu took; it keeps it while it still fits, so it never jumps under the pointer
  const took = useRef<"down" | "up" | "right" | "left" | null>(null);

  useLayoutEffect(() => {
    const pop = ref.current;
    if (!root || !pop) return;
    const place = () => {
      const r = root.getBoundingClientRect();
      const scale = r.width / root.offsetWidth || 1;
      const a = anchor.getBoundingClientRect();
      const W = root.offsetWidth;
      const H = root.offsetHeight;
      const w = pop.offsetWidth;
      const h = pop.scrollHeight + 2;
      const left = (a.left - r.left) / scale;
      const right = (a.right - r.left) / scale;
      const top = (a.top - r.top) / scale;
      const bottom = (a.bottom - r.top) / scale;
      if (side) {
        // Prefer the right; at the edge open to the left, and stay there while it fits
        const fitsRight = right + 4 + w <= W - 8;
        const fitsLeft = left - 4 - w >= 8;
        const goRight = took.current === "left" ? !fitsLeft && fitsRight : fitsRight || !fitsLeft;
        took.current = goRight ? "right" : "left";
        const x = Math.max(8, Math.min(W - w - 8, goRight ? right + 4 : left - 4 - w));
        const max = H - 16;
        const y = Math.max(8, Math.min(H - 8 - Math.min(h, max), top - 7));
        setPos({ x, y, max: h > max ? max : undefined });
        return;
      }
      // Line up with the button's right edge near the right side, and slide back inside if still too wide
      const x = Math.max(8, Math.min(W - w - 8, align === "end" ? right - w : left));
      // Prefer down. Flip up only when the list doesn't fit; with no room either way take the roomier
      // side, cap the height and scroll inside. A menu that flips up keeps a wider gap to clear a bar under it.
      const below = H - bottom - 6 - 8;
      const above = top - 14 - 8;
      const keep = took.current;
      const dir = keep === "down" && h <= below ? "down" : keep === "up" && h <= above ? "up" : h <= below ? "down" : h <= above ? "up" : below >= above ? "down" : "up";
      took.current = dir;
      const room = dir === "down" ? below : above;
      const shown = Math.min(h, room);
      setPos({ x, y: dir === "down" ? bottom + 6 : top - 14 - shown, max: h > room ? room : undefined });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(pop);
    ro.observe(root);
    return () => ro.disconnect();
  }, [anchor, root, align, side]);

  useEffect(() => {
    const el = ref.current;
    if (el) layers.push(el);
    return () => {
      const i = el ? layers.indexOf(el) : -1;
      if (i >= 0) layers.splice(i, 1);
    };
  }, []);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      // Only clicks inside the prototype close it, so the case player's own controls leave it open.
      // A click in a menu this one opened (a submenu, a dropdown inside a panel) is not outside.
      if (root?.contains(t) && !ref.current?.contains(t) && !anchor.contains(t) && !inLaterLayer(t, ref.current)) onClose();
    };
    const scroll = (e: Event) => {
      const t = e.target as globalThis.Node;
      // The list under a submenu scrolled: the submenu's row moved away, so it closes
      if (root?.contains(t) && !ref.current?.contains(t)) onClose();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("scroll", scroll, true);
    };
  }, [anchor, onClose, root, side]);

  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    // Esc and ← in a submenu go back one level, to its row
    if (e.key === "Escape" || (side && e.key === "ArrowLeft")) {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      anchor.focus();
      return;
    }
    const items = [...(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input") ?? [])];
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (at + 1) % items.length;
    else if (e.key === "ArrowUp") next = (at - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key.length === 1 && !(document.activeElement instanceof HTMLInputElement)) {
      // Typing a letter jumps to the next row that starts with it
      const k = e.key.toLowerCase();
      const order = [...items.slice(at + 1), ...items.slice(0, at + 1)];
      const hit = order.find((el) => el.textContent?.trim().toLowerCase().startsWith(k));
      if (hit) next = items.indexOf(hit);
    }
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    items[next].focus();
  };

  if (!root) return null;
  return createPortal(
    <div
      ref={ref}
      className={className ?? styles.pop}
      data-drag-panel={draggable || undefined}
      data-submenu={side || undefined}
      data-spot={spot}
      role={side ? "menu" : undefined}
      style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, width, maxHeight: pos?.max, visibility: pos ? "visible" : "hidden" }}
      onKeyDown={keys}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>,
    root,
  );
}

/**
 * Submenus that open on hover. A row opens its submenu after a short pause; moving to another row closes it
 * only after a grace delay, so a diagonal move into the submenu crosses rows on the way without switching.
 */
export function useSubmenu<K extends string>() {
  const [sub, setSub] = useState<{ el: HTMLElement; kind: K } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clear = () => clearTimeout(timer.current);
  const open = (kind: K, el: HTMLElement, now = false) => {
    clear();
    if (now) return setSub({ el, kind });
    timer.current = setTimeout(() => setSub({ el, kind }), 120);
  };
  const leave = () => {
    clear();
    timer.current = setTimeout(() => setSub(null), 280);
  };
  useEffect(() => clear, []);
  return { sub, open, leave, stay: clear, close: () => (clear(), setSub(null)) };
}

export function MenuRow({
  icon,
  children,
  hint,
  selected,
  danger,
  disabled,
  trailing,
  folder,
  onClick,
}: {
  icon?: ReactNode;
  children: ReactNode;
  /** Shown at the row's right edge, e.g. an arrow to a submenu */
  trailing?: ReactNode;
  /** Opens a submenu: shows the arrow, opens on hover and on → */
  folder?: { open: boolean; onOpen: (el: HTMLElement) => void; kind?: string };
  /** Secondary line under the label */
  hint?: ReactNode;
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.menuRow}
      data-selected={selected || undefined}
      data-danger={danger || undefined}
      data-folder={folder ? "" : undefined}
      data-folder-kind={folder?.kind}
      data-open={folder?.open || undefined}
      aria-haspopup={folder ? "menu" : undefined}
      aria-expanded={folder ? folder.open : undefined}
      disabled={disabled}
      onClick={folder ? (e) => folder.onOpen(e.currentTarget) : onClick}
      onKeyDown={folder ? (e) => e.key === "ArrowRight" && (e.preventDefault(), folder.onOpen(e.currentTarget)) : undefined}
    >
      {icon}
      {hint ? (
        <span className={styles.menuText}>
          <span>{children}</span>
          <small>{hint}</small>
        </span>
      ) : (
        // Long names are cut with an ellipsis and shown in full on hover
        <span title={typeof children === "string" ? children : undefined}>{children}</span>
      )}
      {(trailing || folder) && <span className={styles.menuTrailing}>{trailing ?? <ChevronRight size={15} />}</span>}
      {selected && <Check size={15} className={styles.menuCheck} />}
    </button>
  );
}

/**
 * Pointer drag between targets marked with data-drop="id". Works inside the scaled player.
 * Touch is left to scrolling; those screens offer another way to do the same action.
 */
export function useDragDrop(onDrop: (id: string, target: string) => void, ignore = "") {
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const moved = useRef(false);
  const drop = useRef(onDrop);
  drop.current = onDrop;

  const bind = (id: string) => ({
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (e.button !== 0 || e.pointerType === "touch" || (ignore && (e.target as Element).closest(ignore))) return;
      const el = e.currentTarget;
      const scale = el.getBoundingClientRect().width / el.offsetWidth || 1;
      const start = { x: e.clientX, y: e.clientY };
      let target: string | null = null;
      moved.current = false;
      const move = (ev: PointerEvent) => {
        const x = ev.clientX - start.x;
        const y = ev.clientY - start.y;
        if (!moved.current && Math.hypot(x, y) < 5) return;
        moved.current = true;
        setDrag({ id, x: x / scale, y: y / scale });
        const hit = document
          .elementsFromPoint(ev.clientX, ev.clientY)
          .map((n) => n.closest<HTMLElement>("[data-drop]"))
          .find((n) => n && n.dataset.drop !== id);
        target = hit?.dataset.drop ?? null;
        setOver(target);
      };
      const end = (ev: Event) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        if (ev.type === "pointerup" && moved.current && target) drop.current(id, target);
        setDrag(null);
        setOver(null);
        // A release outside the row sends no click to swallow, so the next real click must still work
        setTimeout(() => { moved.current = false; }, 0);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    },
    onClickCapture(e: ReactMouseEvent) {
      if (!moved.current) return;
      moved.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  });
  return { drag, over, bind };
}
