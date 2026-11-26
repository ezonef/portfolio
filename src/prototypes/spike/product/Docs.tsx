"use client";

import { ChevronsLeft, Columns2, Minimize2 } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, ChevronsRight, MoveDiagonal2 } from "./figma-icons";
import { DOCS, resolveRef, type Doc, type Go } from "./data";
import styles from "./product.module.css";

function inline(text: string, go: Go): ReactNode {
  return text.split(/(\*\*.+?\*\*|\[\[.+?\]\])/g).map((part, i) => {
    if (part.startsWith("**")) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith("[[")) {
      const ref = part.slice(2, -2);
      const r = resolveRef(ref);
      return <button key={i} type="button" className={styles.ref} onClick={() => go(r.view, r.focus)}>{ref}</button>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Article({ doc, go, flash }: { doc: Doc; go: Go; flash?: string }) {
  return (
    <article className={styles.article}>
      <h2>{doc.title}</h2>
      {doc.blocks.map((b, i) =>
        b.h ? <h3 key={i} data-sec={b.id} data-flash={flash === b.id || undefined}>{b.h}</h3> : b.li ? <p key={i} className={styles.bullet}>{inline(b.li, go)}</p> : <p key={i}>{inline(b.p ?? "", go)}</p>,
      )}
    </article>
  );
}

export function Docs({ go, focus }: { go: Go; focus?: string }) {
  const [left, setLeft] = useState("BRIEF-01");
  const [right, setRight] = useState("STRATEGY-02");
  const [split, setSplit] = useState(true);
  const [wide, setWide] = useState<"left" | "right" | null>(null);
  const [flash, setFlash] = useState<string>();
  const pane = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focus) return;
    const [id, sec] = focus.split("#");
    if (!DOCS.some((d) => d.id === id)) return;
    setLeft(id);
    if (id === right) setRight(DOCS.find((d) => d.id !== id)!.id);
    setWide(null);
    setFlash(sec);
    const raf = requestAnimationFrame(() => {
      const box = pane.current;
      if (!box) return;
      const el = sec ? box.querySelector<HTMLElement>(`[data-sec="${sec}"]`) : null;
      if (!el) return void (box.scrollTop = 0);
      const s = box.getBoundingClientRect().height / box.offsetHeight || 1;
      box.scrollTop += (el.getBoundingClientRect().top - box.getBoundingClientRect().top) / s - 16;
    });
    const t = setTimeout(() => setFlash(undefined), 1800);
    return () => (cancelAnimationFrame(raf), clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const leftDoc = DOCS.find((d) => d.id === left)!;
  const rightDoc = DOCS.find((d) => d.id === right)!;
  const pick = (id: string) => {
    if (id === right) setRight(left);
    setLeft(id);
    pane.current?.scrollTo({ top: 0 });
  };

  return (
    <div className={styles.docsPage}>
      <aside className={styles.docsTree}>
        <div className={styles.sideHead}><strong>Documentation</strong></div>
        <ul>
          {DOCS.map((d) => (
            <li key={d.id}>
              <button type="button" data-on={d.id === left || undefined} onClick={() => pick(d.id)}>{d.title}</button>
              {d.id === left && (
                <ul>
                  {d.blocks.filter((b) => b.h).map((b) => <li key={b.id}><button type="button" onClick={() => go("docs", `${d.id}#${b.id}`)}>{b.h}</button></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </aside>
      {wide !== "right" && (
        <section className={styles.docPane}>
          <header>
            <nav className={styles.crumbs} aria-label="Path"><span>Documents</span><ChevronRight size={13} /><b>{leftDoc.id}</b></nav>
            <span className={styles.spacer} />
            {!split && <button type="button" className={styles.icon} aria-label="Open side by side" onClick={() => setSplit(true)}><Columns2 size={15} /></button>}
            {split && <button type="button" className={styles.icon} aria-label={wide ? "Show both documents" : "Expand this document"} onClick={() => setWide(wide ? null : "left")}>{wide ? <Minimize2 size={14} /> : <MoveDiagonal2 size={14} />}</button>}
          </header>
          <div ref={pane} className={styles.docScroll}><Article doc={leftDoc} go={go} flash={flash} /></div>
        </section>
      )}
      {split && wide !== "left" && (
        <section className={styles.docPane} data-side>
          <header>
            <button type="button" className={styles.icon} aria-label="Close side document" onClick={() => { setSplit(false); setWide(null); }}><ChevronsRight size={15} /></button>
            <button type="button" className={styles.icon} aria-label={wide ? "Show both documents" : "Expand side document"} onClick={() => setWide(wide ? null : "right")}>{wide ? <ChevronsLeft size={15} /> : <MoveDiagonal2 size={14} />}</button>
          </header>
          <div className={styles.docScroll}><Article doc={rightDoc} go={go} /></div>
        </section>
      )}
    </div>
  );
}
