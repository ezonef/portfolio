"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { CaseUpper, GripVertical, Heading1, Heading2, Heading3, Image, List, ListOrdered, Minus, TextQuote, Type, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/Icon/Icon";
import { TEXT_BLOCK_TYPES, blockId, type CaseBlock, type CaseBlockType, type CaseTextBlockType } from "@/data/case-types";
import { AutoTextarea } from "./AutoTextarea";
import { ImageDrop } from "./ImageDrop";
import styles from "./BlockEditor.module.css";

type Props = {
  blocks: CaseBlock[];
  onChange: (blocks: CaseBlock[]) => void;
  slug: string;
  /** Block types the "/" menu offers (default: all) */
  allow?: CaseBlockType[];
  /** Hint in an empty editor */
  emptyText?: string;
  /** Called right before a block is deleted — the admin shows an Undo toast */
  onDelete?: (what: string, icon: ReactNode) => void;
};

type Command = { type: CaseBlockType; label: string; shortcut: string; icon: LucideIcon; keys: string[] };

/** What "/" offers. `keys` are what you can type: "/h1 Title" or "/" + filter. `shortcut` is the markdown way. */
const COMMANDS: Command[] = [
  { type: "text", label: "Text", shortcut: "", icon: Type, keys: ["text", "p"] },
  { type: "h1", label: "Heading 1", shortcut: "#", icon: Heading1, keys: ["h1", "heading1", "title"] },
  { type: "h2", label: "Heading 2", shortcut: "##", icon: Heading2, keys: ["h2", "heading2"] },
  { type: "h3", label: "Heading 3", shortcut: "###", icon: Heading3, keys: ["h3", "heading3"] },
  { type: "label", label: "Label", shortcut: "/label", icon: CaseUpper, keys: ["label", "caps", "eyebrow"] },
  { type: "bullet", label: "Bulleted list", shortcut: "-", icon: List, keys: ["ul", "bullet", "list"] },
  { type: "numbered", label: "Numbered list", shortcut: "1.", icon: ListOrdered, keys: ["ol", "numbered", "number"] },
  { type: "quote", label: "Quote", shortcut: ">", icon: TextQuote, keys: ["quote", "q"] },
  { type: "image", label: "Image", shortcut: "/image", icon: Image, keys: ["image", "img", "picture"] },
  { type: "divider", label: "Divider", shortcut: "---", icon: Minus, keys: ["hr", "divider", "line"] },
];

/** Markdown-style shortcuts typed at the start of a block. */
const SHORTCUTS: [RegExp, CaseTextBlockType][] = [
  [/^### /, "h3"],
  [/^## /, "h2"],
  [/^# /, "h1"],
  [/^[-*] /, "bullet"],
  [/^1[.)] /, "numbered"],
  [/^> /, "quote"],
];

const PLACEHOLDER: Record<CaseTextBlockType, string> = {
  text: "Type / for commands — or /h1 Title",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  label: "LABEL — e.g. Problem",
  bullet: "List",
  numbered: "List",
  quote: "Quote",
};

const newId = blockId;
const isText = (b: CaseBlock): b is Extract<CaseBlock, { text: string }> => TEXT_BLOCK_TYPES.includes(b.type as CaseTextBlockType);

function makeBlock(type: CaseBlockType, text = ""): CaseBlock {
  if (type === "image") return { id: newId(), type, src: "", caption: "" };
  if (type === "divider") return { id: newId(), type };
  return { id: newId(), type, text };
}

function matchCommands(query: string, allow?: CaseBlockType[]) {
  const q = query.toLowerCase();
  return COMMANDS.filter(
    (c) => (!allow || allow.includes(c.type)) && (c.keys.some((k) => k.startsWith(q)) || c.label.toLowerCase().includes(q)),
  );
}

/** Blocks as plain text with markdown marks — what ⌘C puts on the clipboard. */
function blocksToText(list: CaseBlock[]) {
  const mark: Partial<Record<CaseBlockType, string>> = { h1: "# ", h2: "## ", h3: "### ", bullet: "- ", numbered: "1. ", quote: "> " };
  return list
    .map((b) => (isText(b) ? (mark[b.type] ?? "") + b.text : b.type === "divider" ? "---" : b.caption || b.src))
    .join("\n");
}

/**
 * Notion-style editor. Type "/" for the block menu, "/h1 Title" to make a heading in one go,
 * or markdown shortcuts (# , - , 1. , > , ---). Enter = new block, Backspace at the start = merge / unformat.
 * Several blocks: drag across them (or from the margin), ⌘A twice, or Shift+↑/↓ at the edge of a block —
 * then Backspace deletes, ⌘C / ⌘X copy or cut, Esc or a click clears.
 */
export function BlockEditor({ blocks, onChange, slug, allow, emptyText = "Click to start writing — type / for commands", onDelete }: Props) {
  const refs = useRef(new Map<string, HTMLElement>());
  const sheet = useRef<HTMLDivElement>(null);
  /** Block selection: anchor (where it started) and the other end, as block indexes */
  const [sel, setSel] = useState<{ from: number; to: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Moving blocks by the ⋮⋮ handle: which blocks, and the gap (0…n) they would land in */
  const [moving, setMoving] = useState<{ lo: number; hi: number; gap: number } | null>(null);
  const lo = sel ? Math.max(0, Math.min(sel.from, sel.to)) : -1;
  const hi = sel ? Math.min(blocks.length - 1, Math.max(sel.from, sel.to)) : -2;
  const [focus, setFocus] = useState<{ id: string; at: number | "end" } | null>(null);
  /** `turn`: opened from the hover button to change an existing block (keeps its text) — not from typing "/". */
  const [menu, setMenu] = useState<{ id: string; active: number; turn?: boolean } | null>(null);

  /**
   * Keep the menu inside the visible area, like Notion: open below the block when it fits,
   * otherwise above it, never under the sticky header or the save bar. Once the block
   * scrolls out of view the menu closes.
   */
  const [place, setPlace] = useState<{ side: "below" | "above"; max: number }>({ side: "below", max: 420 });
  const menuId = menu?.id;
  useLayoutEffect(() => {
    if (!menuId) return;
    const fit = () => {
      const block = refs.current.get(menuId)?.closest<HTMLElement>("[data-block]");
      if (!block) return;
      const r = block.getBoundingClientRect();
      const top = document.querySelector("[data-admin-top]")?.getBoundingClientRect().bottom ?? 0;
      const bottom = document.querySelector("[data-admin-bar]")?.getBoundingClientRect().top ?? window.innerHeight;
      if (r.bottom < top || r.top > bottom) return setMenu(null);
      const below = bottom - r.bottom - 12;
      const above = r.top - top - 12;
      const side = below >= 280 || below >= above ? "below" : "above";
      setPlace({ side, max: Math.max(160, Math.min(420, side === "below" ? below : above)) });
    };
    fit();
    window.addEventListener("scroll", fit, true);
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("scroll", fit, true);
      window.removeEventListener("resize", fit);
    };
  }, [menuId]);

  useEffect(() => {
    if (!focus) return;
    const el = refs.current.get(focus.id);
    if (!el) return;
    el.focus();
    if (el instanceof HTMLTextAreaElement) {
      const at = focus.at === "end" ? el.value.length : focus.at;
      el.setSelectionRange(at, at);
    }
    setFocus(null);
  }, [focus, blocks]);

  const replace = (i: number, ...next: CaseBlock[]) => onChange([...blocks.slice(0, i), ...next, ...blocks.slice(i + 1)]);

  /** Turn block i into another type. Image / divider also get a fresh text block after them to keep typing. */
  const convert = (i: number, type: CaseBlockType, text = "") => {
    const id = blocks[i].id;
    if (type === "image" || type === "divider") {
      const after = makeBlock("text", text);
      replace(i, { ...makeBlock(type), id }, after);
      setFocus({ id: type === "image" ? id : after.id, at: 0 });
    } else {
      replace(i, { id, type, text });
      setFocus({ id, at: text.length });
    }
    setMenu(null);
  };

  const onText = (i: number, text: string) => {
    const b = blocks[i];
    // "/h1 Title" → heading with the text after the command
    const cmd = text.match(/^\/(\S+)\s([\s\S]*)$/);
    if (cmd) {
      const c = COMMANDS.find((x) => x.keys.includes(cmd[1].toLowerCase()) && (!allow || allow.includes(x.type)));
      if (c) return convert(i, c.type, cmd[2]);
    }
    if (b.type === "text" || b.type === "bullet" || b.type === "numbered") {
      if (text === "---" && (!allow || allow.includes("divider"))) return convert(i, "divider");
      for (const [re, type] of SHORTCUTS) if (re.test(text) && b.type !== type && (!allow || allow.includes(type))) return convert(i, type, text.replace(re, ""));
    }
    replace(i, { ...b, text } as CaseBlock);
    setMenu(/^\/\S*$/.test(text) ? { id: b.id, active: 0 } : null);
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLTextAreaElement>) => {
    const b = blocks[i];
    if (!isText(b)) return;
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    // ⌘A on a block that is already all selected → select every block
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && start === 0 && end === b.text.length && blocks.length > 1) {
      e.preventDefault();
      return selectBlocks(0, blocks.length - 1);
    }
    // Shift+↑ at the start / Shift+↓ at the end → grow into a block selection
    if (e.shiftKey && e.key === "ArrowUp" && start === 0 && end === 0 && i > 0) {
      e.preventDefault();
      return selectBlocks(i, i - 1);
    }
    if (e.shiftKey && e.key === "ArrowDown" && start === b.text.length && end === b.text.length && i < blocks.length - 1) {
      e.preventDefault();
      return selectBlocks(i, i + 1);
    }

    if (menu?.id === b.id) {
      const items = matchCommands(menu.turn ? "" : b.text.slice(1), allow);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenu({ ...menu, active: Math.min(items.length - 1, menu.active + 1) });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenu({ ...menu, active: Math.max(0, menu.active - 1) });
        return;
      }
      if (e.key === "Enter" && items[menu.active]) {
        e.preventDefault();
        convert(i, items[menu.active].type, menu.turn ? b.text : "");
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMenu(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Enter on an empty list item / quote leaves the list
      if (b.type !== "text" && b.text === "" ) return convert(i, "text");
      const keepType = b.type === "bullet" || b.type === "numbered" ? b.type : "text";
      const next = makeBlock(keepType, b.text.slice(end));
      replace(i, { ...b, text: b.text.slice(0, start) }, next);
      setFocus({ id: next.id, at: 0 });
      return;
    }

    if (e.key === "Backspace" && start === 0 && end === 0) {
      if (b.type !== "text") {
        e.preventDefault();
        return convert(i, "text", b.text);
      }
      if (i === 0) return;
      e.preventDefault();
      const prev = blocks[i - 1];
      if (isText(prev)) {
        onChange([...blocks.slice(0, i - 1), { ...prev, text: prev.text + b.text }, ...blocks.slice(i + 1)]);
        setFocus({ id: prev.id, at: prev.text.length });
      } else if (b.text === "") {
        onChange(blocks.filter((_, j) => j !== i));
        setFocus({ id: prev.id, at: 0 });
      } else {
        setFocus({ id: prev.id, at: 0 });
      }
      return;
    }

    if (e.key === "ArrowUp" && start === 0 && i > 0) {
      e.preventDefault();
      setFocus({ id: blocks[i - 1].id, at: "end" });
    } else if (e.key === "ArrowDown" && end === b.text.length && i < blocks.length - 1) {
      e.preventDefault();
      setFocus({ id: blocks[i + 1].id, at: 0 });
    }
  };

  /** Image / divider blocks: Backspace or Delete removes them, arrows move on. */
  const onBlockKey = (i: number, e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      remove(i);
    } else if (e.key === "ArrowUp" && i > 0) {
      e.preventDefault();
      setFocus({ id: blocks[i - 1].id, at: "end" });
    } else if ((e.key === "ArrowDown" || e.key === "Enter") && i < blocks.length - 1) {
      e.preventDefault();
      setFocus({ id: blocks[i + 1].id, at: 0 });
    }
  };

  const insertAfter = (i: number) => {
    const next = makeBlock("text");
    onChange([...blocks.slice(0, i + 1), next, ...blocks.slice(i + 1)]);
    setFocus({ id: next.id, at: 0 });
  };

  const remove = (i: number) => {
    const b = blocks[i];
    const name = COMMANDS.find((c) => c.type === b.type)?.label ?? "Block";
    onDelete?.(isText(b) && b.text.trim() ? `${name} “${b.text.trim()}” deleted` : `${name} deleted`, <BlockGlyph type={b.type} />);
    const rest = blocks.filter((_, j) => j !== i);
    onChange(rest);
    const near = rest[Math.max(0, i - 1)];
    if (near) setFocus({ id: near.id, at: "end" });
  };

  const blockEls = () => Array.from(sheet.current?.querySelectorAll<HTMLElement>(":scope > [data-block]") ?? []);
  /** Block under a screen Y — above the first = first, below the last = last */
  const indexAt = (y: number, els = blockEls()) => {
    if (!els.length) return -1;
    const hit = els.findIndex((el) => y < el.getBoundingClientRect().bottom);
    return hit === -1 ? els.length - 1 : hit;
  };

  const selectBlocks = (from: number, to: number) => {
    (document.activeElement as HTMLElement | null)?.blur();
    setMenu(null);
    setSel({ from, to });
    sheet.current?.focus({ preventScroll: true });
  };

  /**
   * Press inside a block and drag onto another one (or start in the margin and drag) → the text
   * selection turns into a block selection, like Notion. A plain click still just places the caret.
   */
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setSel(null);
    const t = e.target as HTMLElement;
    if (t.closest("button, input, a, label")) return;
    const els = blockEls();
    const anchor = indexAt(e.clientY, els);
    if (anchor < 0) return;
    const inText = t.tagName === "TEXTAREA";
    const focusable = t.closest("textarea, [tabindex]");
    if (!focusable || focusable === sheet.current) e.preventDefault(); // margin: no native text selection
    const x0 = e.clientX;
    const y0 = e.clientY;
    let active = false;

    const move = (ev: globalThis.PointerEvent) => {
      const idx = indexAt(ev.clientY, els);
      if (!active) {
        if (inText ? idx === anchor : Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        active = true;
        setDragging(true);
        if (inText) (t as HTMLTextAreaElement).setSelectionRange(0, 0);
        selectBlocks(anchor, idx);
      }
      window.getSelection()?.removeAllRanges();
      setSel({ from: anchor, to: idx });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("mousemove", move as unknown as (ev: MouseEvent) => void);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setDragging(false);
    };
    // Safari can hold back pointermove while it extends a text selection — mouse events cover that
    window.addEventListener("pointermove", move);
    window.addEventListener("mousemove", move as unknown as (ev: MouseEvent) => void);
    window.addEventListener("pointerup", up);
    window.addEventListener("mouseup", up);
    window.addEventListener("pointercancel", up);
  };

  /**
   * ⋮⋮ handle: drag to move the block — or all selected blocks when it belongs to the selection.
   * A click without moving selects the block (Shift+click grows the selection).
   */
  const onHandleDown = (i: number, e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const inSel = sel && i >= lo && i <= hi;
    const range = inSel ? { lo, hi } : { lo: i, hi: i };
    const els = blockEls();
    const y0 = e.clientY;
    let moved = false;
    let gap = range.lo;

    const gapAt = (y: number) => {
      const idx = els.findIndex((el) => {
        const r = el.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
      return idx === -1 ? els.length : idx;
    };
    const onMove = (ev: globalThis.PointerEvent) => {
      if (!moved && Math.abs(ev.clientY - y0) < 4) return;
      if (!moved) {
        moved = true;
        (document.activeElement as HTMLElement | null)?.blur();
        setMenu(null);
        setDragging(true);
      }
      gap = gapAt(ev.clientY);
      setMoving({ ...range, gap });
    };
    const onUp = (ev: globalThis.PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDragging(false);
      setMoving(null);
      if (!moved) {
        // click = select this block (Shift = extend from the current anchor)
        return selectBlocks(ev.shiftKey && sel ? sel.from : i, i);
      }
      if (gap >= range.lo && gap <= range.hi + 1) return; // dropped where it was
      const picked = blocks.slice(range.lo, range.hi + 1);
      const rest = [...blocks.slice(0, range.lo), ...blocks.slice(range.hi + 1)];
      const at = gap > range.hi ? gap - picked.length : gap;
      onChange([...rest.slice(0, at), ...picked, ...rest.slice(at)]);
      selectBlocks(at, at + picked.length - 1);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  /** A click anywhere outside the editor clears the block selection */
  useEffect(() => {
    if (!sel) return;
    const off = (ev: globalThis.PointerEvent) => {
      if (!sheet.current?.contains(ev.target as Node)) setSel(null);
    };
    window.addEventListener("pointerdown", off);
    return () => window.removeEventListener("pointerdown", off);
  }, [sel]);

  const removeSelected = () => {
    const n = hi - lo + 1;
    if (n === 1) return remove(lo), setSel(null);
    onDelete?.(`${n} blocks deleted`, <Icon name="trash-2" />);
    const rest = blocks.filter((_, j) => j < lo || j > hi);
    onChange(rest);
    setSel(null);
    const near = rest[Math.max(0, lo - 1)];
    if (near) setFocus({ id: near.id, at: "end" });
  };

  const onSheetKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!sel || e.target !== e.currentTarget) return;
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      removeSelected();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSel(null);
    } else if (mod && (key === "c" || key === "x")) {
      e.preventDefault();
      void navigator.clipboard?.writeText(blocksToText(blocks.slice(lo, hi + 1)));
      if (key === "x") removeSelected();
    } else if (mod && key === "a") {
      e.preventDefault();
      setSel({ from: 0, to: blocks.length - 1 });
    } else if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const to = Math.max(0, Math.min(blocks.length - 1, sel.to + (e.key === "ArrowUp" ? -1 : 1)));
      setSel({ ...sel, to });
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const b = blocks[e.key === "ArrowUp" ? lo : hi];
      setSel(null);
      if (b) setFocus({ id: b.id, at: e.key === "ArrowUp" ? 0 : "end" });
    }
  };

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  };

  let listNumber = 0;

  return (
    <div
      ref={sheet}
      className={styles.sheet}
      tabIndex={-1}
      data-selecting={dragging || undefined}
      onPointerDown={onPointerDown}
      onKeyDown={onSheetKey}
    >
      {blocks.length === 0 && (
        <button type="button" className={`body-l ${styles.start}`} onClick={() => insertAfter(-1)}>
          {emptyText}
        </button>
      )}
      {blocks.map((b, i) => {
        listNumber = b.type === "numbered" ? (blocks[i - 1]?.type === "numbered" ? listNumber + 1 : 1) : 0;
        const menuItems = menu?.id === b.id && isText(b) ? matchCommands(menu!.turn ? "" : b.text.slice(1), allow) : [];
        return (
          <div
            key={b.id}
            className={styles.block}
            data-type={b.type}
            data-block
            data-selected={(i >= lo && i <= hi) || undefined}
            data-moving={(moving && i >= moving.lo && i <= moving.hi) || undefined}
            data-drop={moving ? (moving.gap === i ? "before" : i === blocks.length - 1 && moving.gap === blocks.length ? "after" : undefined) : undefined}
          >
            <div className={styles.gutter}>
              <button
                type="button"
                className={`${styles.gutterBtn} ${styles.handle}`}
                aria-label="Drag to move, click to select"
                title="Drag to move · click to select"
                onPointerDown={(e) => onHandleDown(i, e)}
              >
                <GripVertical size={14} strokeWidth={1.75} aria-hidden />
              </button>
              {isText(b) && (
                <button
                  type="button"
                  className={styles.gutterBtn}
                  aria-label="Change block style"
                  title="Change style"
                  aria-expanded={menu?.id === b.id && menu.turn}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    refs.current.get(b.id)?.focus();
                    setMenu((m) => (m?.id === b.id && m.turn ? null : { id: b.id, active: 0, turn: true }));
                  }}
                >
                  <BlockGlyph type={b.type} />
                </button>
              )}
              <button type="button" className={styles.gutterBtn} aria-label="Delete block" title="Delete block" onClick={() => remove(i)}>
                <Icon name="trash-2" />
              </button>
            </div>

            {isText(b) ? (
              <div className={styles.textRow}>
                {b.type === "bullet" && <span className={styles.marker} aria-hidden>▪</span>}
                {b.type === "numbered" && <span className={`mono-m ${styles.marker}`} aria-hidden>{String(listNumber).padStart(2, "0")}</span>}
                <AutoTextarea
                  ref={register(b.id)}
                  className={styles.text}
                  data-type={b.type}
                  value={b.text}
                  placeholder={PLACEHOLDER[b.type]}
                  aria-label={COMMANDS.find((c) => c.type === b.type)?.label}
                  onChange={(e) => onText(i, e.target.value)}
                  onKeyDown={(e) => onKey(i, e)}
                  onBlur={() => setMenu((m) => (m?.id === b.id ? null : m))}
                />
              </div>
            ) : b.type === "divider" ? (
              <div ref={register(b.id)} tabIndex={0} className={styles.divider} role="separator" aria-label="Divider — Backspace deletes" onKeyDown={(e) => onBlockKey(i, e)} />
            ) : (
              <div ref={register(b.id)} tabIndex={-1} className={styles.image} onKeyDown={(e) => onBlockKey(i, e)}>
                <ImageDrop slug={slug} value={b.src} framed onChange={(src) => replace(i, { ...b, src })} />
                <input
                  className={`mono-s ${styles.caption}`}
                  value={b.caption}
                  placeholder="Caption (optional)"
                  onChange={(e) => replace(i, { ...b, caption: e.target.value })}
                />
              </div>
            )}

            {menuItems.length > 0 && (
              <div className={styles.menu} data-side={place.side} style={{ maxHeight: place.max }}>
                <p className={styles.menuHint}>{menu!.turn ? "Turn into" : "Basic blocks"}</p>
                <ul className={styles.menuList} role="listbox" aria-label="Block type">
                  {menuItems.map((c, j) => {
                    const Glyph = c.icon;
                    return (
                      <li key={c.type} role="option" aria-selected={j === menu!.active}>
                        <button
                          type="button"
                          className={styles.menuItem}
                          data-active={j === menu!.active || undefined}
                          ref={j === menu!.active ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                          data-current={(menu!.turn && c.type === b.type) || undefined}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setMenu({ ...menu!, active: j })}
                          onClick={() => convert(i, c.type, menu!.turn && isText(b) ? b.text : "")}
                        >
                          <Glyph size={16} strokeWidth={1.5} aria-hidden className={styles.glyph} />
                          <span className={styles.menuLabel}>{c.label}</span>
                          <span className={styles.menuKey}>{c.shortcut}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" className={styles.menuClose} onMouseDown={(e) => e.preventDefault()} onClick={() => setMenu(null)}>
                  <span>Close menu</span>
                  <span className={styles.menuKey}>esc</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
      {blocks.length > 0 && (
        <button type="button" className={styles.tail} aria-label="Add a block at the end" onClick={() => insertAfter(blocks.length - 1)} />
      )}
    </div>
  );
}

/** The block's own style icon — the hover button shows what the block is now. */
export function BlockGlyph({ type }: { type: CaseBlockType }) {
  const Glyph = COMMANDS.find((c) => c.type === type)?.icon ?? Type;
  return <Glyph size={14} strokeWidth={1.75} aria-hidden />;
}
