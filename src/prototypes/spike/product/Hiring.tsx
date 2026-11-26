"use client";

import { Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, FileText, Filter, Plus, Search, X } from "./figma-icons";
import { CANDIDATES, STAGES, type Candidate, type Go, type Priority, type StageId } from "./data";
import { Face, FigmaIcon, Pop, Row, useDragDrop } from "./ui";
import styles from "./product.module.css";

export function Hiring({ go, focus }: { go: Go; focus?: string }) {
  const [list, setList] = useState<Candidate[]>(CANDIDATES);
  const [openId, setOpenId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority | "All">("All");
  const [q, setQ] = useState<string | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [closed, setClosed] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const seq = useRef(100);

  useEffect(() => {
    if (!focus) return;
    if (!CANDIDATES.some((c) => c.id === focus)) return;
    setPriority("All");
    setQ(null);
    setOpenId(focus);
    setFlash(focus);
    const raf = requestAnimationFrame(() => {
      const box = board.current;
      const el = box?.querySelector<HTMLElement>(`[data-card="${focus}"]`);
      if (box && el) {
        const s = box.getBoundingClientRect().width / box.offsetWidth || 1;
        box.scrollLeft += (el.getBoundingClientRect().left - box.getBoundingClientRect().left) / s - 12;
      }
    });
    const t = setTimeout(() => setFlash(null), 1800);
    return () => (cancelAnimationFrame(raf), clearTimeout(t));
  }, [focus]);

  const moveTo = (id: string, stage: StageId) => setList((l) => { const c = l.find((x) => x.id === id)!; return c.stage === stage ? l : [...l.filter((x) => x.id !== id), { ...c, stage }]; });
  const { drag, over, bind } = useDragDrop((id, target) => moveTo(id, target as StageId));
  const visible = (s: StageId) => list.filter((c) => c.stage === s && (priority === "All" || c.priority === priority) && (!q?.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())));
  const open = list.find((c) => c.id === openId);
  const addCandidate = () => {
    seq.current += 1;
    const id = `c${seq.current}`;
    setList((l) => [{ id, name: `New candidate ${seq.current - 100}`, years: 1, note: "Today · review application", priority: "Low", source: "Indeed", stage: "new" }, ...l]);
    setOpenId(id);
  };

  return (
    <div className={styles.page}>
      <nav className={styles.crumbsBar} aria-label="Path"><span>Stride Campaign</span><ChevronRight size={13} /><span>Stride · PL</span><ChevronRight size={13} /><b>HR-07 · Meta Ads Buyer</b></nav>
      <div className={styles.tabs}><span><FigmaIcon src="tabs/hiring/role" />Role overview</span><b data-orange><FigmaIcon src="tabs/hiring/candidates" />Candidates</b><span><FigmaIcon src="tabs/hiring/calendar" />Calendar</span><button type="button" onClick={() => go("docs", "HR-07-DOC")}><FigmaIcon src="tabs/hiring/documents" />Documents</button></div>
      <div className={styles.toolbar}>
        <span className={styles.chip}>View: Kanban</span>
        <span className={styles.chip}>Appearance: HR Manager</span>
        {q === null ? <button type="button" className={styles.icon} aria-label="Search candidates" onClick={() => setQ("")}><Search size={15} /></button> : (
          <span className={styles.inlineInput}><Search size={13} /><input autoFocus value={q} placeholder="Candidate..." aria-label="Search candidates" onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setQ(null)} /></span>
        )}
        <span className={styles.spacer} />
        <button type="button" className={styles.round} data-active={priority !== "All" || undefined} onClick={(e) => setMenu(e.currentTarget)}><Filter size={14} /> {priority === "All" ? "Filter" : priority}</button>
        <button type="button" className={styles.round} disabled={closed} onClick={addCandidate}><Plus size={14} /> Candidate</button>
        <button type="button" className={styles.primary} style={{ background: closed ? "#57534e" : "#c2500a" }} onClick={() => setClosed(!closed)}>{closed ? "Reopen role" : "Close role"}</button>
      </div>
      <div ref={board} className={styles.board} data-closed={closed || undefined} data-dragging={drag ? true : undefined}>
        {STAGES.map((s) => {
          const cards = visible(s.id);
          return (
            <section
              key={s.id}
              className={styles.column}
              aria-label={s.label}
              data-drop={s.id}
              data-over={over === s.id || undefined}
            >
              <header style={{ color: s.color }}>{s.label}<b>{cards.length}</b></header>
              <div className={styles.cards}>
                {cards.map((c) => (
                  <article
                    key={c.id}
                    className={styles.card}
                    data-card={c.id}
                    data-drag={drag?.id === c.id || undefined}
                    data-flash={flash === c.id || undefined}
                    data-active={openId === c.id || undefined}
                    style={drag?.id === c.id ? { transform: `translate(${drag.x}px, ${drag.y}px) rotate(1.5deg)` } : undefined}
                    {...(closed ? {} : bind(c.id))}
                  >
                    <button type="button" onClick={() => setOpenId(c.id)}>
                      <span className={styles.prio} data-p={c.priority}><i />{c.priority}</span>
                      <strong>{c.name}</strong>
                      <small>Meta Ads · {c.years} years<br />{c.note}</small>
                      <span className={styles.source} data-s={c.source}>{c.source}</span>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {open && (
        <aside className={styles.drawer} aria-label={open.name}>
          <header><Face name={open.name} size={36} /><div><h3>{open.name}</h3><small>Meta Ads Buyer · {open.years} years</small></div><button type="button" className={styles.icon} aria-label="Close candidate" onClick={() => setOpenId(null)}><X size={16} /></button></header>
          <p className={styles.drawerLabel}>Stage</p>
          <div className={styles.stageList}>
            {STAGES.map((s) => <button key={s.id} type="button" disabled={closed} aria-pressed={open.stage === s.id} onClick={() => moveTo(open.id, s.id)}><i style={{ background: s.color }} />{s.label}</button>)}
          </div>
          <p className={styles.drawerLabel}>Next step</p>
          <p>{open.note}</p>
          <p className={styles.drawerLabel}>Files</p>
          <p className={styles.fileLine}><FileText size={14} /> CV · {open.name.split(" ")[1] ?? "candidate"}.pdf</p>
          <p className={styles.drawerLabel}>Linked work</p>
          <button type="button" className={styles.drawerLink} onClick={() => go("docs", "HR-07-DOC")}><Link2 size={13} /> HR-07 · Role brief</button>
          <button type="button" className={styles.drawerLink} onClick={() => go("buying", "ST-03")}><Link2 size={13} /> Test task · ST-03</button>
        </aside>
      )}
      {menu && (
        <Pop anchor={menu} onClose={() => setMenu(null)} align="end" width={150}>
          {(["All", "High", "Medium", "Low"] as const).map((p) => <Row key={p} selected={priority === p} onClick={() => (setPriority(p), setMenu(null))}>{p === "All" ? "All priorities" : p}</Row>)}
        </Pop>
      )}
    </div>
  );
}
