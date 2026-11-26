"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styles from "./product.module.css";

/** Icons exported from the AI CHAT and Button Icons components in Figma */
const ICONS = {
  x: [16, "M12 4L4 12", "M4 4L12 12"],
  external: [16, "M12 8.66667V12.6667C12 13.0203 11.8595 13.3594 11.6095 13.6095C11.3594 13.8595 11.0203 14 10.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V5.33333C2 4.97971 2.14048 4.64057 2.39052 4.39052C2.64057 4.14048 2.97971 4 3.33333 4H7.33333", "M10 2H14V6", "M6.66699 9.33333L14.0003 2"],
  share: [16, "M14 3.33301C14 4.43758 13.1046 5.33301 12 5.33301C10.8954 5.33301 10 4.43758 10 3.33301C10 2.22844 10.8954 1.33301 12 1.33301C13.1046 1.33301 14 2.22844 14 3.33301Z", "M6 8C6 9.10457 5.10457 10 4 10C2.89543 10 2 9.10457 2 8C2 6.89543 2.89543 6 4 6C5.10457 6 6 6.89543 6 8Z", "M14 12.667C14 13.7716 13.1046 14.667 12 14.667C10.8954 14.667 10 13.7716 10 12.667C10 11.5624 10.8954 10.667 12 10.667C13.1046 10.667 14 11.5624 14 12.667Z", "M5.72656 9.00684L10.2799 11.6602", "M10.2732 4.33984L5.72656 6.99318"],
  chevron: [14, "M3.5 5.25L7 8.75L10.5 5.25"],
  plus: [16, "M3.33301 8H12.6663", "M8 3.33301V12.6663"],
  upload: [16, "M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10", "M11.3337 5.33333L8.00033 2L4.66699 5.33333", "M8 2V10"],
  context: [14, "M11.667 4.08301H6.41699", "M8.16699 9.91699H2.91699", "M11.667 9.91699C11.667 10.8835 10.8835 11.667 9.91699 11.667C8.95049 11.667 8.16699 10.8835 8.16699 9.91699C8.16699 8.95049 8.95049 8.16699 9.91699 8.16699C10.8835 8.16699 11.667 8.95049 11.667 9.91699Z", "M5.83301 4.08301C5.83301 5.04951 5.04951 5.83301 4.08301 5.83301C3.11651 5.83301 2.33301 5.04951 2.33301 4.08301C2.33301 3.11651 3.11651 2.33301 4.08301 2.33301C5.04951 2.33301 5.83301 3.11651 5.83301 4.08301Z"],
  mic: [16, "M8 1.33301C7.46957 1.33301 6.96086 1.54372 6.58579 1.91879C6.21071 2.29387 6 2.80257 6 3.33301V7.99967C6 8.53011 6.21071 9.03882 6.58579 9.41389C6.96086 9.78896 7.46957 9.99967 8 9.99967C8.53043 9.99967 9.03914 9.78896 9.41421 9.41389C9.78929 9.03882 10 8.53011 10 7.99967V3.33301C10 2.80257 9.78929 2.29387 9.41421 1.91879C9.03914 1.54372 8.53043 1.33301 8 1.33301Z", "M12.6663 6.66699V8.00033C12.6663 9.238 12.1747 10.425 11.2995 11.3002C10.4243 12.1753 9.23735 12.667 7.99967 12.667C6.762 12.667 5.57501 12.1753 4.69984 11.3002C3.82467 10.425 3.33301 9.238 3.33301 8.00033V6.66699", "M8 12.667V14.667"],
  arrowUp: [16, "M3.33301 7.99967L7.99967 3.33301L12.6663 7.99967", "M8 12.6663V3.33301"],
  search: [14, "M11.0833 6.41667C11.0833 8.994 8.994 11.0833 6.41667 11.0833C3.83934 11.0833 1.75 8.994 1.75 6.41667C1.75 3.83934 3.83934 1.75 6.41667 1.75C8.994 1.75 11.0833 3.83934 11.0833 6.41667Z", "M12.2495 12.2495L9.74121 9.74121"],
} as const;

function FigmaIcon({ name }: { name: keyof typeof ICONS }) {
  const [size, ...paths] = ICONS[name];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}


const CHATS = [
  { title: "Best Offer of the Week", unread: 1 },
  { title: "Ad Stats Review for the Year", unread: 0 },
  { title: "Bonus_UA_scale Review", unread: 0 },
  { title: "Which Account Is More Stable", unread: 1 },
];
const PROMPTS = ["Flow Analysis", "Check My Creatives", "Monthly Overview"];
const NEW_CHAT = "New Chat";

export function AiChat({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState(NEW_CHAT);
  const [listOpen, setListOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const picker = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listOpen) return;
    const down = (e: PointerEvent) => {
      if (!picker.current?.contains(e.target as globalThis.Node)) setListOpen(false);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [listOpen]);

  const keys = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    if (listOpen) setListOpen(false);
    else onClose();
  };
  const q = query.trim().toLowerCase();
  const chats = CHATS.filter((c) => c.title.toLowerCase().includes(q));
  const unread = CHATS.reduce((sum, c) => sum + c.unread, 0);

  return (
    <aside className={styles.aiChat} aria-label="AI assistant" onKeyDown={keys}>
      <div className={styles.aiTools}>
        <span className={styles.aiIcon}><FigmaIcon name="external" /></span>
        <span className={styles.aiIcon}><FigmaIcon name="share" /></span>
      </div>
      <div ref={picker} className={styles.aiPicker}>
        <button type="button" className={styles.aiTrigger} aria-expanded={listOpen} onClick={() => setListOpen(!listOpen)}>
          <span>{title}</span>
          {unread > 0 && <b>{unread}</b>}
          <FigmaIcon name="chevron" />
        </button>
        <button type="button" className={styles.aiIcon} aria-label="New chat" onClick={() => { setTitle(NEW_CHAT); setText(""); setListOpen(false); }}><FigmaIcon name="plus" /></button>
        {listOpen && (
          <div className={styles.aiChats}>
            <label className={styles.aiChatSearch}>
              <FigmaIcon name="search" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
            </label>
            <div className={styles.aiChatList}>
              {chats.map((c) => (
                <button key={c.title} type="button" onClick={() => { setTitle(c.title); setListOpen(false); }}>
                  <span>{c.title}</span>
                  {c.unread > 0 && <b>{c.unread}</b>}
                </button>
              ))}
              {!chats.length && <p>Nothing found</p>}
            </div>
          </div>
        )}
      </div>
      <div className={styles.aiContent}>
        <h3>How can I help?</h3>
        <div className={styles.aiPrompts}>
          {PROMPTS.map((p) => <button key={p} type="button" onClick={() => setText(p)}>{p}</button>)}
        </div>
        <div className={styles.aiPrompt}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask anything" aria-label="Ask the AI" />
          <div>
            <span className={styles.aiIcon}><FigmaIcon name="upload" /></span>
            <span className={styles.aiContext}><FigmaIcon name="context" />Context</span>
            <i />
            <span className={styles.aiIcon}><FigmaIcon name="mic" /></span>
            <span className={styles.aiSend}><FigmaIcon name="arrowUp" /></span>
          </div>
        </div>
      </div>
    </aside>
  );
}
