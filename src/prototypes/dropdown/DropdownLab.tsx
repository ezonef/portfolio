"use client";

import Image from "next/image";
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { PrototypeToolsSlot } from "../tools-slot";
import { buildMenu, levelsOf, trail, type IconName, type MenuItem } from "./data";
import { inTriangle, placeMenu, placeSubmenu, type Placement, type Rect, type Side } from "./placement";
import styles from "./dropdown.module.css";

/**
 * A dropdown you can drag around a photo. Wherever you drop it, it opens where there is room:
 * down by default, up near the bottom, lined up to the right edge near the right side,
 * capped and scrolling when there is room nowhere. Folders open submenus beside it (popovers, not a modal);
 * a chain keeps going the way it started and turns back at the edge.
 *
 * The canvas plays the screen (it takes whatever size the player gives it): menus stay inside it, 12px from the edge. The rules live in ./placement.ts.
 */

const EDGE = 12;
/** How long the pointer may travel across other items toward an open submenu before they take over */
const AIM_MS = 350;
/** A short wait before a hovered folder opens, so sweeping down the list doesn't flash every submenu */
const OPEN_MS = 90;
/** A list longer than this gets a search field on top */
const SEARCH_FROM = 12;
/** The request goes out only after this much quiet since the last keystroke */
const DEBOUNCE_MS = 1000;
/** A pretend round trip to the server */
const LATENCY_MS = 350;

type Search = { text: string; applied: string; phase: "idle" | "waiting" | "loading"; keys: number; requests: number };
const NO_SEARCH: Search = { text: "", applied: "", phase: "idle", keys: 0, requests: 0 };

export type Preset = {
  /** Unique per screen: ids for aria-controls (stable on server and client) */
  name: string;
  /** Where the button starts, as a share of the room it can move in: {x: 0, y: 0} top-left, {x: 1, y: 1} bottom-right */
  at: { x: number; y: number };
  open?: boolean;
  /** Folders open on start: ["move", "field"] = Move to → Field notes */
  chain?: string[];
  guides?: boolean;
  safe?: boolean;
  longList?: boolean;
  longNames?: boolean;
};

type Placed = Placement & { w: number; h: number; natural: number };
type Pt = [number, number];
type Focus = { L: number; id?: string; input?: boolean } | "trigger" | null;

const enabled = (list: MenuItem[]) => list.filter((i) => !i.disabled);
const r = Math.round;

export function DropdownLab({ preset }: { preset: Preset }) {
  // the canvas size, measured (the first render guesses)
  const [size, setSize] = useState({ w: 960, h: 600 });
  const W = size.w;
  const H = size.h;
  const BOUND: Rect = { x: EDGE, y: EDGE, w: W - 2 * EDGE, h: H - 2 * EDGE };
  const startAt = (w: number, h: number, tw = 210, th = 44) => ({
    x: EDGE + preset.at.x * (w - 2 * EDGE - tw),
    y: EDGE + preset.at.y * (h - 2 * EDGE - th),
  });
  const [pos, setPos] = useState(() => startAt(960, 600));
  const [open, setOpen] = useState(!!preset.open);
  const [chain, setChain] = useState<string[]>(preset.chain ?? []);
  const [hl, setHl] = useState<(string | null)[]>(preset.chain ?? []);
  const [opt, setOpt] = useState({
    guides: !!preset.guides,
    safe: !!preset.safe,
    longList: !!preset.longList,
    longNames: !!preset.longNames,
  });
  const [hud, setHud] = useState<Placed[]>([]);
  const settings = useContext(PrototypeToolsSlot);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRoot = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const [tri, setTri] = useState<{ a: Pt; b: Pt; c: Pt; p: Pt } | null>(null);

  const menu = buildMenu(opt);
  // the root list is always rendered (hidden while closed), so the button can show where it *will* open
  const levels = open ? levelsOf(menu, chain) : [menu];

  // ---------- search in long lists: filters by what's typed, asks the "server" once typing stops ----------
  const [searches, setSearches] = useState<Record<string, Search>>({});
  const debounce = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef(new Map<string, number>());
  const appliedRef = useRef(new Map<string, string>());
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const searchable = (L: number) => L > 0 && levels[L].length > SEARCH_FROM;
  const searchOf = (L: number) => searches[chain[L - 1]] ?? NO_SEARCH;
  const shown = levels.map((list, L) => {
    const q = searchable(L) ? searchOf(L).applied.toLowerCase() : "";
    return q ? list.filter((i) => i.label.toLowerCase().includes(q)) : list;
  });
  const patchSearch = (f: string, p: (s: Search) => Partial<Search>) =>
    setSearches((all) => {
      const cur = all[f] ?? NO_SEARCH;
      return { ...all, [f]: { ...cur, ...p(cur) } };
    });
  /** One request per pause in typing. An answer to an older query is dropped when it arrives late. */
  const runSearch = (f: string, query: string) => {
    const id = (latest.current.get(f) ?? 0) + 1;
    latest.current.set(f, id);
    if (query === appliedRef.current.get(f)) {
      patchSearch(f, () => ({ phase: "idle" })); // the same query again: no new request
      return;
    }
    patchSearch(f, (s) => ({ phase: "loading", requests: s.requests + 1 }));
    setTimeout(() => {
      if (latest.current.get(f) !== id) return;
      appliedRef.current.set(f, query);
      patchSearch(f, () => ({ applied: query, phase: "idle" }));
    }, LATENCY_MS);
  };
  const onSearchInput = (L: number, text: string) => {
    const f = chain[L - 1];
    const query = text.trim();
    clearTimeout(debounce.current.get(f));
    latest.current.set(f, (latest.current.get(f) ?? 0) + 1); // whatever is on its way is now stale
    setChain((c) => c.slice(0, L));
    setHl((h) => h.slice(0, L));
    if (!query) {
      // empty field: the full list is already here, no request
      appliedRef.current.set(f, "");
      patchSearch(f, (s) => ({ text, applied: "", phase: "idle", keys: s.keys + 1 }));
      return;
    }
    patchSearch(f, (s) => ({ text, phase: "waiting", keys: s.keys + 1 }));
    debounce.current.set(f, setTimeout(() => runSearch(f, query), DEBOUNCE_MS));
  };

  const uid = `dropdown-${preset.name}`;
  const canvas = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const items = useRef(new Map<string, HTMLButtonElement>());
  const placed = useRef<Placed[]>([]);
  const keep = useRef<Side[]>([]);
  const focusNext = useRef<Focus>(null);
  const pointer = useRef<Pt>([0, 0]);
  const exit = useRef<{ L: number; p: Pt } | null>(null);
  const pending = useRef<{ L: number; item: MenuItem } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chainRef = useRef(chain);
  const drag = useRef<{ cx: number; cy: number; x: number; y: number; s: number; on: boolean } | null>(null);
  const dragged = useRef(false);
  const tween = useRef(0);

  /** The case page scales the canvas down to fit: screen pixels → canvas pixels */
  const scale = () => {
    const c = canvas.current;
    return c ? c.getBoundingClientRect().width / c.offsetWidth || 1 : 1;
  };
  const toLocal = (cx: number, cy: number): Pt => {
    const c = canvas.current!.getBoundingClientRect();
    const s = scale();
    return [(cx - c.left) / s, (cy - c.top) / s];
  };
  const clampPos = (x: number, y: number) => {
    const t = trigger.current;
    const tw = t?.offsetWidth ?? 200;
    const th = t?.offsetHeight ?? 44;
    return {
      x: Math.min(Math.max(x, BOUND.x), BOUND.x + BOUND.w - tw),
      y: Math.min(Math.max(y, BOUND.y), BOUND.y + BOUND.h - th),
    };
  };

  // follow the player's size: before the first touch the button keeps its spot (a share of the room), after it stays inside
  const touchedRef = useRef(false);
  touchedRef.current = touched;
  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const measure = () => {
      const w = c.offsetWidth;
      const h = c.offsetHeight;
      if (!w || !h) return;
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
      const t = trigger.current;
      const tw = t?.offsetWidth ?? 210;
      const th = t?.offsetHeight ?? 44;
      setPos((p) => {
        const next = touchedRef.current
          ? { x: Math.min(Math.max(p.x, EDGE), w - EDGE - tw), y: Math.min(Math.max(p.y, EDGE), h - EDGE - th) }
          : startAt(w, h, tw, th);
        return next.x === p.x && next.y === p.y ? p : next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- placement: measure every open list, place it, remember the side ----------
  useLayoutEffect(() => {
    chainRef.current = chain;
    const t = trigger.current;
    if (!t) return;
    const anchor: Rect = { x: pos.x, y: pos.y, w: t.offsetWidth, h: t.offsetHeight };
    const out: Placed[] = [];
    for (let L = 0; L < levels.length; L++) {
      const el = panels.current[L];
      if (!el) break;
      // natural size, measured at the left edge so the width isn't squeezed by the canvas edge
      el.style.maxHeight = "";
      el.style.left = "0px";
      el.style.top = "0px";
      const size = { w: el.offsetWidth, h: el.offsetHeight };
      const k = open ? keep.current[L] : undefined;
      let p: Placement;
      if (L === 0) {
        p = placeMenu(anchor, size, BOUND, k);
      } else {
        const par = out[L - 1];
        const parEl = panels.current[L - 1]!;
        const it = items.current.get(`${L - 1}:${chain[L - 1]}`);
        const item: Rect = { x: par.x, y: par.y + (it ? it.offsetTop - parEl.scrollTop : 0), w: par.w, h: it?.offsetHeight ?? 0 };
        const prefer = L === 1 ? "right" : par.side === "left" ? "left" : "right";
        p = placeSubmenu({ x: par.x, y: par.y, w: par.w, h: par.h }, item, size, BOUND, prefer, k);
      }
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.style.maxHeight = p.maxH ? `${p.maxH}px` : "";
      el.style.transformOrigin = p.origin;
      out.push({ ...p, w: size.w, h: p.maxH ?? size.h, natural: size.h });
    }
    keep.current = open ? out.map((p) => p.side) : [];
    placed.current = out;
    setHud((prev) => (JSON.stringify(prev) === JSON.stringify(out) ? prev : out));

    const f = focusNext.current;
    if (f) {
      focusNext.current = null;
      if (f === "trigger") trigger.current?.focus({ preventScroll: true });
      else if (f.input) inputs.current.get(f.L)?.focus({ preventScroll: true });
      else {
        const panel = panels.current[f.L];
        const el = f.id ? items.current.get(`${f.L}:${f.id}`) : panel;
        el?.focus({ preventScroll: true });
        if (panel && el && el !== panel) reveal(panel, el);
      }
    }
    // re-place whenever the button moves, a list opens or changes, or focus moves (levels follows chain/open/opt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, size, open, chain, hl, searches, opt.longList, opt.longNames]);

  // ---------- open / close ----------
  const close = (refocus: boolean) => {
    clearTimeout(timer.current);
    pending.current = null;
    exit.current = null;
    setTri(null);
    setOpen(false);
    setChain([]);
    setHl([]);
    debounce.current.forEach((t) => clearTimeout(t));
    debounce.current.clear();
    latest.current.clear(); // answers still on their way are dropped
    appliedRef.current.clear();
    setSearches({});
    if (refocus) focusNext.current = "trigger";
  };
  const openMenu = (focus: "first" | "last" | "panel" | "none") => {
    const list = enabled(menu);
    const id = focus === "first" ? list[0]?.id : focus === "last" ? list[list.length - 1]?.id : undefined;
    setOpen(true);
    setChain([]);
    setHl(id ? [id] : []);
    if (focus !== "none") focusNext.current = { L: 0, id };
  };

  // a click anywhere else closes everything (it's a popover: the page around it stays live)
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Element;
      if (trigger.current?.contains(t)) return;
      if (panels.current.some((p) => p?.contains(t))) return;
      if (settingsRoot.current?.contains(t)) return; // changing a setting keeps the menu open to show the effect
      close(false);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  });

  // the settings card closes on a click elsewhere, on Esc, and when another screen is shown
  useEffect(() => {
    if (!settingsOpen) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Element;
      if (settingsRoot.current?.contains(t) || canvas.current?.contains(t)) return;
      setSettingsOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setSettingsOpen(false);
      settingsButton.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key, true);
    };
  }, [settingsOpen]);
  useEffect(() => {
    if (settings === null) setSettingsOpen(false);
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => () => (clearTimeout(timer.current), cancelAnimationFrame(tween.current)), []);

  // ---------- hover, with the safe triangle toward an open submenu ----------
  const activate = (L: number, item: MenuItem, delay = 0) => {
    clearTimeout(timer.current);
    pending.current = null;
    if (item.disabled) {
      setHl((h) => h.slice(0, L));
      setChain((c) => c.slice(0, L));
      return;
    }
    setHl((h) => {
      const n = h[L] === item.id ? [...h] : h.slice(0, L);
      n[L] = item.id;
      return n;
    });
    if (item.children) {
      const go = () => setChain((c) => (c[L] === item.id ? c : [...c.slice(0, L), item.id]));
      if (delay) timer.current = setTimeout(go, delay);
      else go();
    } else setChain((c) => c.slice(0, L));
  };

  /** Is the pointer still heading for the submenu opened from level L? */
  const inSafe = (L: number) => {
    const sub = placed.current[L + 1];
    const e = exit.current;
    if (!sub || !e || e.L !== L) return false;
    const nx = sub.side === "right" ? sub.x : sub.x + sub.w;
    return inTriangle(pointer.current, e.p, [nx, sub.y], [nx, sub.y + sub.h]);
  };

  const hover = (L: number, item: MenuItem, e: ReactPointerEvent) => {
    // enter fires before the canvas sees the move: take the position from this event
    pointer.current = toLocal(e.clientX, e.clientY);
    const openHere = chainRef.current[L];
    if (openHere && openHere !== item.id && inSafe(L)) {
      // crossing other items on the way to the submenu: don't switch yet
      clearTimeout(timer.current);
      pending.current = { L, item };
      timer.current = setTimeout(() => activate(L, item), AIM_MS);
      return;
    }
    activate(L, item, item.children ? OPEN_MS : 0);
  };

  const onCanvasMove = (e: ReactPointerEvent) => {
    pointer.current = toLocal(e.clientX, e.clientY);
    const p = pending.current;
    if (p && !inSafe(p.L)) activate(p.L, p.item, p.item.children ? OPEN_MS : 0);
    if (opt.safe) {
      const ex = exit.current;
      const sub = ex && placed.current[ex.L + 1];
      if (ex && sub && chainRef.current.length > ex.L) {
        const nx = sub.side === "right" ? sub.x : sub.x + sub.w;
        setTri({ a: ex.p, b: [nx, sub.y], c: [nx, sub.y + sub.h], p: pointer.current });
      } else if (tri) setTri(null);
    }
  };

  // ---------- choosing ----------
  const choose = (L: number, item: MenuItem) => {
    if (item.disabled) return;
    if (item.children) {
      activate(L, item);
      return;
    }
    const path = trail(menu, chain.slice(0, L), item.id);
    const DONE: Record<string, string> = {
      open: "Opened jasmine_042.jpg",
      rename: "Renaming jasmine_042.jpg…",
      duplicate: "Duplicated as jasmine_042 copy.jpg",
      archive: "Archived",
      delete: "Deleted (it's a demo — nothing is gone)",
    };
    const text =
      chain[0] === "move" && L > 0
        ? `Moved to ${path.slice(1).join(" / ")}`
        : chain[0] === "share" && L > 0
          ? `${path.slice(1).join(" → ")} ✓`
          : (DONE[item.id] ?? `${item.label} ✓`);
    setToast({ key: Date.now(), text });
    close(true);
  };

  // ---------- keyboard inside a list ----------
  const onMenuKey = (L: number, e: ReactKeyboardEvent) => {
    const list = enabled(shown[L]);
    const idx = list.findIndex((i) => i.id === hl[L]);
    const cur = list[idx];
    const focusItem = (item: MenuItem) => {
      setHl((h) => [...h.slice(0, L), item.id]);
      setChain((c) => c.slice(0, L));
      focusNext.current = { L, id: item.id };
    };
    const back = () => {
      if (L === 0) close(true);
      else {
        const parent = chain[L - 1];
        setChain((c) => c.slice(0, L - 1));
        setHl((h) => h.slice(0, L));
        focusNext.current = { L: L - 1, id: parent };
      }
    };
    const input = inputs.current.get(L);
    if (input && e.target === input) {
      // in the search field: letters, Backspace and ←/→ edit the text; ↓ goes to the results
      if (e.key === "ArrowDown" || e.key === "Enter") {
        if (list[0]) focusItem(list[0]);
      } else if (e.key === "Escape") {
        if (input.value) onSearchInput(L, "");
        else back();
      } else if (e.key === "Tab") close(true);
      else return;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!list.length) return;
    switch (e.key) {
      case "ArrowDown":
        focusItem(list[(idx + 1) % list.length]);
        break;
      case "ArrowUp":
        if (idx <= 0 && input) {
          setHl((h) => h.slice(0, L));
          input.focus({ preventScroll: true });
        } else focusItem(list[idx <= 0 ? list.length - 1 : idx - 1]);
        break;
      case "Home":
        focusItem(list[0]);
        break;
      case "End":
        focusItem(list[list.length - 1]);
        break;
      case "ArrowRight":
      case "Enter":
      case " ":
        if (!cur) break;
        if (cur.children) {
          const first = enabled(cur.children)[0];
          const withSearch = cur.children.length > SEARCH_FROM;
          setChain((c) => [...c.slice(0, L), cur.id]);
          setHl((h) => [...h.slice(0, L), cur.id, withSearch ? null : (first?.id ?? null)]);
          focusNext.current = withSearch ? { L: L + 1, input: true } : { L: L + 1, id: first?.id };
        } else if (e.key !== "ArrowRight") choose(L, cur);
        break;
      case "ArrowLeft":
        if (L > 0) back();
        break;
      case "Escape":
        back();
        break;
      case "Tab":
        close(true);
        break;
      default: {
        // type a letter to jump to the next item that starts with it
        if (e.key.length !== 1 || e.metaKey || e.ctrlKey) return;
        // a list with a search field: typing goes into the field instead
        if (input) {
          input.focus({ preventScroll: true });
          return;
        }
        const k = e.key.toLowerCase();
        const after = [...list.slice(idx + 1), ...list.slice(0, idx + 1)];
        const hit = after.find((i) => i.label.toLowerCase().startsWith(k));
        if (hit) focusItem(hit);
        else return;
      }
    }
    // Esc, arrows and Tab belong to the menu, not to the page around it
    e.preventDefault();
    e.stopPropagation();
  };

  // ---------- dragging the button ----------
  const onTriggerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(tween.current);
    drag.current = { cx: e.clientX, cy: e.clientY, x: pos.x, y: pos.y, s: scale(), on: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onTriggerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.cx) / d.s;
    const dy = (e.clientY - d.cy) / d.s;
    if (!d.on) {
      if (Math.hypot(dx, dy) < 4) return; // a click that wobbled is still a click
      d.on = true;
      setDragging(true);
      setTouched(true);
    }
    setPos(clampPos(d.x + dx, d.y + dy));
  };
  const onTriggerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.on) {
      dragged.current = true;
      setDragging(false);
    }
  };
  const onTriggerClick = (e: ReactMouseEvent) => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    if (open) close(false);
    else openMenu(e.detail === 0 ? "first" : "panel"); // detail 0: Enter/Space, not a pointer
  };
  const onTriggerKey = (e: ReactKeyboardEvent) => {
    const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const a = arrows[e.key];
    if (e.shiftKey && a) {
      // Shift + arrows move the button: dragging without a mouse
      e.preventDefault();
      setTouched(true);
      setPos((p) => clampPos(p.x + a[0] * 40, p.y + a[1] * 40));
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(e.key === "ArrowDown" ? "first" : "last");
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      close(true);
    }
  };

  /** Glide the button to one of nine spots (menus follow it every frame) */
  const snapTo = (col: number, row: number) => {
    const t = trigger.current;
    if (!t) return;
    const xs = [BOUND.x + 8, (W - t.offsetWidth) / 2, BOUND.x + BOUND.w - 8 - t.offsetWidth];
    const ys = [BOUND.y + 8, (H - t.offsetHeight) / 2, BOUND.y + BOUND.h - 8 - t.offsetHeight];
    const from = pos;
    const to = { x: xs[col], y: ys[row] };
    const start = performance.now();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 0 : 420;
    cancelAnimationFrame(tween.current);
    setTouched(true);
    const step = (now: number) => {
      const k = ms ? Math.min(1, (now - start) / ms) : 1;
      const e = 1 - Math.pow(1 - k, 3);
      setPos({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e });
      if (k < 1) tween.current = requestAnimationFrame(step);
    };
    tween.current = requestAnimationFrame(step);
  };

  // ---------- drawing ----------
  const root = hud[0];
  const up = root?.side === "top";
  const subDir = (L: number): "left" | "right" =>
    hud[L + 1] && chain[L] ? (hud[L + 1].side as "left" | "right") : L > 0 && hud[L]?.side === "left" ? "left" : "right";
  const tw = trigger.current?.offsetWidth ?? 200;
  const th = trigger.current?.offsetHeight ?? 44;
  const guideX = pos.x > 64 ? pos.x - 18 : pos.x + tw + 18;

  const settingsUi = (
    <div ref={settingsRoot} className={styles.settings}>
      {settingsOpen && (
        <div id={`${uid}-settings`} className={styles.settingsCard} role="group" aria-label="Prototype settings">
        <div className={styles.snap} role="group" aria-label="Move the button to">
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <button
                key={`${row}${col}`}
                type="button"
                className={styles.snapDot}
                aria-label={`${["Top", "Middle", "Bottom"][row]} ${["left", "centre", "right"][col]}`}
                onClick={() => snapTo(col, row)}
              />
            )),
          )}
        </div>
        <div className={styles.toggles}>
          {(
            [
              ["guides", "Room guides"],
              ["safe", "Safe triangle"],
              ["longList", "Long list"],
              ["longNames", "Long names"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`mono-xs ${styles.toggle}`}
              aria-pressed={opt[k]}
              onClick={() => setOpt((o) => ({ ...o, [k]: !o[k] }))}
            >
              <span className={styles.box} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        </div>
      )}
      <button
        ref={settingsButton}
        type="button"
        className={`mono-s ${styles.settingsButton}`}
        aria-expanded={settingsOpen}
        aria-controls={`${uid}-settings`}
        onClick={() => setSettingsOpen((v) => !v)}
      >
        <Glyph name="sliders" />
        Settings
      </button>
    </div>
  );

  return (
    <div ref={canvas} className={styles.canvas} onPointerMove={onCanvasMove} data-dragging={dragging || undefined}>
      <Image src="/images/cases/dropdown/flowers.webp" alt="" fill sizes="960px" className={styles.photo} priority />
      <div className={styles.shade} aria-hidden />

      {opt.guides && (
        <div className={styles.guides} aria-hidden>
          <div className={styles.bound}>
            <span className="mono-xs">boundary · 12px from the edge</span>
          </div>
          {root && (
            <>
              <div
                className={styles.rule}
                data-on={up || undefined}
                style={{ left: guideX, top: BOUND.y, height: Math.max(0, pos.y - 8 - BOUND.y) }}
              >
                <span className="mono-xs">↑ {r(root.room.before)}</span>
              </div>
              <div
                className={styles.rule}
                data-on={!up || undefined}
                style={{ left: guideX, top: pos.y + th + 8, height: Math.max(0, BOUND.y + BOUND.h - pos.y - th - 8) }}
              >
                <span className="mono-xs">↓ {r(root.room.after)}</span>
              </div>
            </>
          )}
          {open && hud[1] && root && (
            <>
              <div
                className={styles.ruleH}
                data-on={hud[1].side === "left" || undefined}
                style={{ left: BOUND.x, top: hud[1].y - 10, width: Math.max(0, root.x - 4 - BOUND.x) }}
              >
                <span className="mono-xs">← {r(hud[1].room.before)}</span>
              </div>
              <div
                className={styles.ruleH}
                data-on={hud[1].side === "right" || undefined}
                style={{ left: root.x + root.w + 4, top: hud[1].y - 10, width: Math.max(0, BOUND.x + BOUND.w - root.x - root.w - 4) }}
              >
                <span className="mono-xs">{r(hud[1].room.after)} →</span>
              </div>
            </>
          )}
        </div>
      )}

      {opt.safe && tri && (
        <svg className={styles.tri} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <polygon
            points={`${tri.a.join(",")} ${tri.b.join(",")} ${tri.c.join(",")}`}
            data-in={inTriangle(tri.p, tri.a, tri.b, tri.c) || undefined}
          />
        </svg>
      )}

      <p className={`mono-xs ${styles.hint}`} data-gone={touched || open || undefined}>
        Drag the button anywhere · click to open · hover a folder
      </p>

      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        style={{ left: pos.x, top: pos.y }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${uid}-0`}
        aria-keyshortcuts="Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight"
        onPointerDown={onTriggerDown}
        onPointerMove={onTriggerMove}
        onPointerUp={onTriggerUp}
        onPointerCancel={onTriggerUp}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKey}
      >
        <span className={styles.grip} aria-hidden>
          <Glyph name="grip" />
        </span>
        <span className={styles.thumb} aria-hidden />
        <span className={styles.triggerLabel}>jasmine_042.jpg</span>
        {/* points where the menu will open — even before you open it */}
        <span className={styles.chevron} data-up={up || undefined} aria-hidden>
          <Glyph name="chevron" />
        </span>
      </button>

      {shown.map((list, L) => {
        const dir = subDir(L);
        const s = searchOf(L);
        return (
          <div
            key={L === 0 ? "root" : `${L}:${chain[L - 1]}`}
            id={`${uid}-${L}`}
            ref={(el) => {
              panels.current[L] = el;
            }}
            role="menu"
            aria-label={L === 0 ? "jasmine_042.jpg" : levels[L - 1].find((i) => i.id === chain[L - 1])?.label}
            tabIndex={-1}
            className={styles.panel}
            data-open={open || undefined}
            data-sub={L > 0 || undefined}
            data-scrolls={hud[L]?.maxH ? true : undefined}
            style={{ zIndex: 30 + L }}
            inert={!open}
            onKeyDown={(e) => onMenuKey(L, e)}
            onScroll={(e) => {
              clipRows(e.currentTarget);
              // a submenu hangs off a row: when its row scrolls away, it closes
              if (chainRef.current.length > L) {
                setChain((c) => c.slice(0, L));
                setHl((h) => h.slice(0, L + 1));
              }
            }}
            onPointerEnter={() => {
              if (L === 0) return;
              clearTimeout(timer.current);
              pending.current = null;
              exit.current = null;
              setTri(null);
              setHl((h) => {
                const n = h.slice(0, L + 1);
                n[L - 1] = chainRef.current[L - 1];
                return n;
              });
            }}
            onPointerLeave={() => {
              if (pending.current?.L === L) {
                clearTimeout(timer.current);
                pending.current = null;
              }
              if (chainRef.current.length <= L) setHl((h) => h.slice(0, L));
            }}
          >
            {searchable(L) && (
              <div className={styles.search} role="none" data-search>
                <label className={styles.field}>
                  <span className={styles.icon} aria-hidden>
                    <Glyph name="search" />
                  </span>
                  <input
                    ref={(el) => {
                      if (el) inputs.current.set(L, el);
                      else inputs.current.delete(L);
                    }}
                    className={styles.input}
                    type="text"
                    value={s.text}
                    placeholder="Search folders"
                    aria-label="Search folders"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => onSearchInput(L, e.target.value)}
                    onFocus={() => setHl((h) => h.slice(0, L))}
                  />
                  {s.phase === "loading" ? (
                    <span className={styles.spinner} aria-hidden />
                  ) : (
                    s.keys > 0 && (
                      <span className={`mono-xs ${styles.searchMeta}`} aria-hidden>
                        {s.keys} {s.keys === 1 ? "key" : "keys"} → {s.requests} req
                      </span>
                    )
                  )}
                </label>
                {/* the 1-second pause runs along the divider under the field */}
                <div className={styles.wait} aria-hidden>
                  {s.phase === "waiting" && <span key={s.keys} className={styles.waitBar} />}
                </div>
                <p className="visually-hidden" aria-live="polite">
                  {s.phase === "loading" ? "Searching" : s.applied ? `${list.length} found` : ""}
                </p>
              </div>
            )}
            {searchable(L) && s.applied && !list.length && s.phase === "idle" && (
              <p className={`mono-xs ${styles.empty}`}>No folders match “{s.applied}”</p>
            )}
            <div role="none" data-rows>
            {list.map((item) => (
              <div key={item.id} role="none">
                {item.separated && <div role="separator" className={styles.sep} />}
                <button
                  ref={(el) => {
                    if (el) items.current.set(`${L}:${item.id}`, el);
                    else items.current.delete(`${L}:${item.id}`);
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={styles.item}
                  data-hl={hl[L] === item.id || undefined}
                  data-danger={item.danger || undefined}
                  aria-disabled={item.disabled || undefined}
                  aria-haspopup={item.children ? "menu" : undefined}
                  aria-expanded={item.children ? chain[L] === item.id : undefined}
                  title={item.label.length > 30 ? item.label : undefined}
                  onPointerEnter={(e) => hover(L, item, e)}
                  onPointerLeave={(e) => {
                    if (chainRef.current[L] === item.id) exit.current = { L, p: toLocal(e.clientX, e.clientY) };
                  }}
                  onClick={() => choose(L, item)}
                >
                  {item.icon && (
                    <span className={styles.icon} aria-hidden>
                      <Glyph name={item.icon} />
                    </span>
                  )}
                  <span className={styles.label}>{searchable(L) && s.applied ? mark(item.label, s.applied) : item.label}</span>
                  {item.shortcut && <kbd className={`mono-xs ${styles.kbd}`}>{item.shortcut}</kbd>}
                  {item.children && (
                    <span className={styles.more} data-left={dir === "left" || undefined} aria-hidden>
                      <Glyph name="chevron" />
                    </span>
                  )}
                </button>
              </div>
            ))}
            </div>
          </div>
        );
      })}

      {/* The knobs for the worst cases: a button beside the player's Description */}
      {settings !== null && (settings ? createPortal(settingsUi, settings) : <div className={styles.localTools}>{settingsUi}</div>)}

      <p className={`mono-xs ${styles.toast}`} role="status" data-on={toast ? true : undefined} key={toast?.key}>
        {toast?.text}
      </p>
    </div>
  );
}

/** Keep the focused row inside a scrolling list without scrolling the page around it */
function reveal(panel: HTMLElement, el: HTMLElement) {
  const top = el.offsetTop;
  const bottom = top + el.offsetHeight;
  // a pinned search field covers the top of the list
  const head = panel.querySelector<HTMLElement>("[data-search]")?.offsetHeight ?? 0;
  if (top < panel.scrollTop + head + 6) panel.scrollTop = top - head - 6;
  else if (bottom > panel.scrollTop + panel.clientHeight - 6) panel.scrollTop = bottom - panel.clientHeight + 6;
}

/** The search field has no fill of its own (it shares the panel's glass), so rows are cut off at its bottom edge */
function clipRows(panel: HTMLElement) {
  const head = panel.querySelector<HTMLElement>("[data-search]");
  const rows = panel.querySelector<HTMLElement>("[data-rows]");
  if (!head || !rows) return;
  const cut = Math.max(0, panel.scrollTop + head.offsetHeight - rows.offsetTop);
  rows.style.clipPath = cut ? `inset(${cut}px 0 0)` : "";
}

/** The matched part of a label, highlighted */
function mark(label: string, q: string) {
  const i = label.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return label;
  return (
    <>
      {label.slice(0, i)}
      <mark className={styles.mark}>{label.slice(i, i + q.length)}</mark>
      {label.slice(i + q.length)}
    </>
  );
}

/** 16px line icons */
function Glyph({ name }: { name: IconName | "chevron" | "grip" | "search" | "sliders" }) {
  const P: Record<string, ReactNode> = {
    chevron: <path d="M6 4l4 4-4 4" />,
    sliders: <path d="M2.5 5h6M12 5h1.5M2.5 11H4M7.5 11h6M10 3.2a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM6 9.2a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6z" />,
    search: <path d="M7 12a5 5 0 100-10 5 5 0 000 10zM10.6 10.6L14 14" />,
    grip: (
      <>
        <circle cx="6" cy="4" r=".9" />
        <circle cx="10" cy="4" r=".9" />
        <circle cx="6" cy="8" r=".9" />
        <circle cx="10" cy="8" r=".9" />
        <circle cx="6" cy="12" r=".9" />
        <circle cx="10" cy="12" r=".9" />
      </>
    ),
    open: <path d="M9 3h4v4M13 3L7.5 8.5M11 9.5V13H3V5h3.5" />,
    rename: <path d="M10.5 3.5l2 2L6 12H4v-2l6.5-6.5zM9 13h4" />,
    copy: <path d="M5.5 5.5h7v7h-7zM10.5 5.5v-2h-7v7h2" />,
    folder: <path d="M2.5 4.5h4l1.5 1.5h5.5v6.5h-11z" />,
    share: <path d="M8 2.5v8M5 5.5l3-3 3 3M3.5 9v4h9V9" />,
    link: <path d="M7 9l2-2M6 6.5L4.8 7.7a2.3 2.3 0 003.2 3.2L9.2 9.8M10 9.5l1.2-1.2a2.3 2.3 0 00-3.2-3.2L6.8 6.2" />,
    user: <path d="M8 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3.5 13.5c.6-2.3 2.4-3.5 4.5-3.5s3.9 1.2 4.5 3.5" />,
    download: <path d="M8 2.5v8M5 7.5l3 3 3-3M3.5 13.5h9" />,
    archive: <path d="M2.5 3.5h11v3h-11zM3.5 6.5v6h9v-6M6.5 9h3" />,
    trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5" />,
    star: <path d="M8 2.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z" />,
  };
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill={name === "grip" ? "currentColor" : "none"} stroke={name === "grip" ? "none" : "currentColor"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </svg>
  );
}
