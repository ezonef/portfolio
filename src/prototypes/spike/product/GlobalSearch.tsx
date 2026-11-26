"use client";

import { ArrowDown, ArrowUp, CornerDownLeft, ListChecks, Workflow } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Clock, FileText, Megaphone, Search, UserRound, X } from "./figma-icons";
import { SEARCH, type Go, type SearchItem, type SearchKind } from "./data";
import styles from "./product.module.css";

const SCOPES: { id: SearchKind | "All"; label: string }[] = [
  { id: "All", label: "All" },
  { id: "Task", label: "Tasks" },
  { id: "Campaign", label: "Buying" },
  { id: "Workflow", label: "Automation" },
  { id: "Candidate", label: "Hiring" },
  { id: "Document", label: "Docs" },
];
const KIND: Record<SearchKind, { icon: ReactNode; group: string; color: string }> = {
  Task: { icon: <ListChecks size={15} />, group: "Tasks", color: "#5b5bd6" },
  Campaign: { icon: <Megaphone size={15} />, group: "Buying", color: "#2563eb" },
  Workflow: { icon: <Workflow size={15} />, group: "Automation", color: "#15803d" },
  Candidate: { icon: <UserRound size={15} />, group: "Hiring", color: "#c2500a" },
  Document: { icon: <FileText size={15} />, group: "Documents", color: "#44403c" },
};
const RECENT = ["camp-ST-03", "wf-auto", "cand-c9", "doc-BRIEF-01"];
const IDEAS = ["ST-06", "cart", "Kovalev", "offer"];

function score(it: SearchItem, words: string[]) {
  const title = it.title.toLowerCase();
  // Shared fields like the owner stay out, or "cart" would match every task owned by Emma Carter
  const details = it.kind === "Candidate" ? it.preview.map((p) => p[1]).join(" ").toLowerCase() : "";
  const text = `${title} ${it.meta.toLowerCase()} ${details}`;
  if (!words.every((w) => text.includes(w))) return 0;
  return words.reduce((n, w) => n + (title.startsWith(w) ? 4 : title.includes(w) ? 2 : 1), 0);
}

function Mark({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return <>{text.split(re).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}

export function GlobalSearch({ go, onClose, initial = "" }: { go: Go; onClose: () => void; initial?: string }) {
  const [q, setQ] = useState(initial);
  const [scope, setScope] = useState<SearchKind | "All">("All");
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    input.current?.focus({ preventScroll: true });
    return () => {
      if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus({ preventScroll: true });
    };
  }, []);

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = useMemo(() => {
    const pool = SEARCH.filter((s) => scope === "All" || s.kind === scope);
    if (!words.length) return scope === "All" ? RECENT.map((id) => SEARCH.find((s) => s.id === id)!) : pool.slice(0, 8);
    return pool
      .map((it) => ({ it, s: score(it, words) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 24)
      .map((x) => x.it);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, scope]);
  const ordered = useMemo(() => {
    if (!words.length && scope === "All") return results;
    return (Object.keys(KIND) as SearchKind[]).flatMap((k) => results.filter((r) => r.kind === k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);
  const current = ordered[Math.min(at, ordered.length - 1)];

  useEffect(() => setAt(0), [q, scope]);
  useEffect(() => {
    const box = list.current;
    const el = box?.querySelector<HTMLElement>("[aria-selected='true']");
    if (!box || !el) return;
    if (el.offsetTop < box.scrollTop + 24) box.scrollTop = el.offsetTop - 24;
    else if (el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight;
  }, [at, ordered]);

  const open = (it?: SearchItem) => {
    if (!it) return;
    onClose();
    go(it.view, it.focus);
  };
  const keys = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    else if (e.key === "ArrowDown" && ordered.length) { e.preventDefault(); setAt((a) => (a + 1) % ordered.length); }
    else if (e.key === "ArrowUp" && ordered.length) { e.preventDefault(); setAt((a) => (a - 1 + ordered.length) % ordered.length); }
    else if (e.key === "Enter") { e.preventDefault(); open(current); }
    else if (e.key === "Tab") {
      e.preventDefault();
      const i = SCOPES.findIndex((s) => s.id === scope);
      setScope(SCOPES[(i + (e.shiftKey ? SCOPES.length - 1 : 1)) % SCOPES.length].id);
    }
  };

  let lastGroup = "";
  const showRecent = !words.length && scope === "All";

  return (
    <div className={styles.searchScrim} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.searchModal} role="dialog" aria-modal="true" aria-label="Search everywhere" onKeyDown={keys}>
        <div className={styles.searchField}>
          <Search size={18} />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks, campaigns, people and documents"
            role="combobox"
            aria-expanded="true"
            aria-controls="spike-search-results"
            aria-activedescendant={current ? `sr-${current.id}` : undefined}
            aria-label="Search everywhere"
          />
          {q && <button type="button" tabIndex={-1} aria-label="Clear search" onClick={() => { setQ(""); input.current?.focus(); }}><X size={15} /></button>}
          <kbd>Esc</kbd>
        </div>
        <div className={styles.scopes} role="group" aria-label="Search in">
          {SCOPES.map((s) => {
            const n = s.id === "All" ? null : words.length ? SEARCH.filter((x) => x.kind === s.id && score(x, words) > 0).length : null;
            return <button key={s.id} type="button" tabIndex={-1} aria-pressed={scope === s.id} onClick={() => { setScope(s.id); input.current?.focus(); }}>{s.label}{n !== null && <small>{n}</small>}</button>;
          })}
        </div>
        <div className={styles.searchBody}>
          <div ref={list} id="spike-search-results" className={styles.results} role="listbox" aria-label="Results">
            {showRecent && <p className={styles.groupLabel}>Recent</p>}
            {ordered.map((it, i) => {
              const g = KIND[it.kind].group;
              const head = !showRecent && g !== lastGroup;
              lastGroup = g;
              return (
                <div key={it.id}>
                  {head && <p className={styles.groupLabel}>{g}</p>}
                  <button type="button" tabIndex={-1} id={`sr-${it.id}`} role="option" aria-selected={i === at} className={styles.result} onPointerMove={() => at !== i && setAt(i)} onClick={() => open(it)}>
                    <i style={{ color: KIND[it.kind].color }}>{showRecent ? <Clock size={15} /> : KIND[it.kind].icon}</i>
                    <span><b><Mark text={it.title} words={words} /></b><small><Mark text={it.meta} words={words} /></small></span>
                    {i === at && <CornerDownLeft size={13} />}
                  </button>
                </div>
              );
            })}
            {!ordered.length && (
              <div className={styles.noResults}>
                <strong>Nothing found for “{q}”</strong>
                <span>Try one of these</span>
                <div>{IDEAS.map((x) => <button key={x} type="button" tabIndex={-1} onClick={() => { setQ(x); setScope("All"); input.current?.focus(); }}>{x}</button>)}</div>
              </div>
            )}
          </div>
          <aside className={styles.preview} aria-label="Preview">
            {current ? (
              <div key={current.id}>
                <span className={styles.previewKind} style={{ color: KIND[current.kind].color }}>{KIND[current.kind].icon} {KIND[current.kind].group}</span>
                <h3>{current.title}</h3>
                <p>{current.meta}</p>
                <dl>{current.preview.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                <button type="button" tabIndex={-1} onClick={() => open(current)}>Open in {KIND[current.kind].group}</button>
              </div>
            ) : <p className={styles.previewEmpty}>Select a result to preview it</p>}
          </aside>
        </div>
        <footer className={styles.searchFoot}>
          <span><kbd><ArrowUp size={10} /></kbd><kbd><ArrowDown size={10} /></kbd> Navigate</span>
          <span><kbd><CornerDownLeft size={10} /></kbd> Open</span>
          <span><kbd>Tab</kbd> Change product</span>
          <em>{words.length ? `${ordered.length} results` : `${SEARCH.length} items across 5 products`}</em>
        </footer>
      </div>
    </div>
  );
}
