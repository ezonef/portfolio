"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CaseUpper, Heading1, Heading2, Heading3, Image, List, ListOrdered, Minus, TextQuote, Type, type LucideIcon } from "lucide-react";
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

/**
 * Notion-style editor. Type "/" for the block menu, "/h1 Title" to make a heading in one go,
 * or markdown shortcuts (# , - , 1. , > , ---). Enter = new block, Backspace at the start = merge / unformat.
 */
export function BlockEditor({ blocks, onChange, slug, allow, emptyText = "Click to start writing — type / for commands", onDelete }: Props) {
  const refs = useRef(new Map<string, HTMLElement>());
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

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  };

  let listNumber = 0;

  return (
    <div className={styles.sheet}>
      {blocks.length === 0 && (
        <button type="button" className={`body-l ${styles.start}`} onClick={() => insertAfter(-1)}>
          {emptyText}
        </button>
      )}
      {blocks.map((b, i) => {
        listNumber = b.type === "numbered" ? (blocks[i - 1]?.type === "numbered" ? listNumber + 1 : 1) : 0;
        const menuItems = menu?.id === b.id && isText(b) ? matchCommands(menu!.turn ? "" : b.text.slice(1), allow) : [];
        return (
          <div key={b.id} className={styles.block} data-type={b.type} data-block>
            <div className={styles.gutter}>
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
