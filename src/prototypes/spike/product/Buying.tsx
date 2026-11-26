"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ChevronRight, Filter, Plus, Search, Settings2, UserRound } from "./figma-icons";
import { CAMPAIGNS, pln, stats, type Campaign, type Go } from "./data";
import { Face, FigmaIcon, Pop, Row } from "./ui";
import { useColumnDrag } from "../../useColumnDrag";
import styles from "./product.module.css";

type Col = "spend" | "purchases" | "cpa" | "roas";
const COLS: { key: Col; label: string }[] = [
  { key: "spend", label: "Spend (PLN)" },
  { key: "purchases", label: "Purchases" },
  { key: "cpa", label: "CPA (PLN)" },
  { key: "roas", label: "ROAS" },
];
type Delivery = "all" | "active" | "paused";

export function Buying({ go, focus }: { go: Go; focus?: string }) {
  const [rows, setRows] = useState<Campaign[]>(CAMPAIGNS);
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState<Col[]>(["spend", "purchases", "cpa", "roas"]);
  const [delivery, setDelivery] = useState<Delivery>("all");
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: Col; dir: 1 | -1 } | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; kind: "filter" | "display" } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const added = useRef(0);
  const colDrag = useColumnDrag<Col>(setVisible);

  useEffect(() => {
    if (!focus || !rows.some((r) => r.id === focus)) return;
    setDelivery("all");
    setQ(null);
    setMine(false);
    setClosed(new Set());
    setFlash(focus);
    const raf = requestAnimationFrame(() => {
      const box = scroll.current;
      const el = box?.querySelector<HTMLElement>(`[data-row="${focus}"]`);
      if (box && el) box.scrollTop += (el.getBoundingClientRect().top - box.getBoundingClientRect().top) / (box.getBoundingClientRect().height / box.offsetHeight) - 120;
    });
    const t = setTimeout(() => setFlash(null), 1800);
    return () => (cancelAnimationFrame(raf), clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const value = (c: Campaign, k: Col) => { const s = stats([c]); return s[k]; };
  const shown = (archived: boolean) => {
    let l = rows.filter((c) => !!c.archived === archived);
    if (delivery !== "all") l = l.filter((c) => c.on === (delivery === "active"));
    if (mine) l = l.filter((c) => c.on);
    if (q?.trim()) l = l.filter((c) => `${c.id} ${c.name}`.toLowerCase().includes(q.trim().toLowerCase()));
    if (sort) l = [...l].sort((a, b) => (value(a, sort.key) - value(b, sort.key)) * sort.dir);
    return l;
  };
  const add = (archived: boolean) => {
    added.current += 1;
    const id = `NEW-0${added.current}`;
    setRows((r) => { const at = archived ? r.length : r.filter((c) => !c.archived).length; return [...r.slice(0, at), { id, name: "New campaign", spend: 0, purchases: 0, on: false, archived }, ...r.slice(at)]; });
  };
  const cols = visible.map((k) => COLS.find((c) => c.key === k)!);
  const cell = (s: ReturnType<typeof stats>, k: Col) => k === "spend" ? pln(s.spend) : k === "purchases" ? s.purchases : k === "cpa" ? (s.purchases ? pln(s.cpa) : "—") : s.spend ? `${s.roas.toFixed(2)}×` : "—";

  const group = (id: string, title: string, totalLabel: string, archived: boolean) => {
    const list = shown(archived);
    const t = stats(list);
    const isOpen = !closed.has(id);
    return (
      <section className={styles.dGroup} key={id}>
        <button type="button" className={styles.dGroupHead} aria-expanded={isOpen} onClick={() => setClosed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })}>
          {!archived && <span className={styles.badgeA}>A</span>}
          {title} <i data-open={isOpen || undefined}>▾</i>
        </button>
        {isOpen && (
          <table className={styles.dTable}>
            <colgroup><col style={{ width: 62 }} /><col />{cols.map((c) => <col key={c.key} style={{ width: 112 }} />)}</colgroup>
            <thead>
              <tr className={styles.dTotal}><td /><td><b>{totalLabel}</b></td>{cols.map((c) => <td key={c.key} {...colDrag.cell(c.key)}>{c.key === "spend" ? <em data-t="bad">{pln(t.spend)}</em> : c.key === "purchases" ? <em data-t="good">{t.purchases}</em> : cell(t, c.key)}</td>)}</tr>
              <tr><th>On/Off</th><th>Campaign / delivery</th>{cols.map((c) => (
                <th key={c.key} {...colDrag.head(c.key)} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                  <button type="button" onClick={() => setSort(sort?.key !== c.key ? { key: c.key, dir: -1 } : sort.dir === -1 ? { key: c.key, dir: 1 } : null)}>{c.label}{sort?.key === c.key && (sort.dir === 1 ? " ↑" : " ↓")}</button>
                </th>
              ))}</tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <Fragment key={c.id}>
                  <tr data-row={c.id} data-flash={flash === c.id || undefined}>
                    <td><span role="switch" aria-checked={c.on} aria-disabled aria-label={`Delivery ${c.id}`} className={styles.switch}><i /></span></td>
                    <td>
                      <div className={styles.dName}>
                        <span>{c.id} · {c.name}</span>
                        <button type="button" aria-expanded={expanded === c.id} aria-label={`Details ${c.id}`} data-open={expanded === c.id || undefined} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>▶</button>
                      </div>
                    </td>
                    {cols.map((k) => <td key={k.key} {...colDrag.cell(k.key)}>{cell(stats([c]), k.key)}</td>)}
                  </tr>
                  {expanded === c.id && (
                    <tr className={styles.dDetail}><td /><td colSpan={cols.length + 1}>
                      <span>Linked work</span>
                      <button type="button" onClick={() => go("tasks", "STRIDE-123")}>STRIDE-123 · Task <ChevronRight size={12} /></button>
                      <button type="button" onClick={() => go("automation", "AUTO-01")}>AUTO-01 · Cart recovery <ChevronRight size={12} /></button>
                      <button type="button" onClick={() => go("docs", "BRIEF-01")}>BRIEF-01 · Brief <ChevronRight size={12} /></button>
                    </td></tr>
                  )}
                </Fragment>
              ))}
              {!list.length && <tr><td /><td colSpan={cols.length + 1} className={styles.dEmpty}>No campaigns match this view</td></tr>}
            </tbody>
          </table>
        )}
        {isOpen && <button type="button" className={styles.addRow} data-table onClick={() => add(archived)}><Plus size={13} /> Add campaign</button>}
      </section>
    );
  };

  return (
    <div className={styles.page}>
      <nav className={styles.crumbsBar} aria-label="Path"><span>Stride Campaign</span><ChevronRight size={13} /><span>Stride · PL</span><ChevronRight size={13} /><span>Sprints</span><ChevronRight size={13} /><b>Stride Sale · PL</b></nav>
      <div className={styles.tabs}><span><FigmaIcon src="tabs/buying/overview" />Overview</span><span><FigmaIcon src="tabs/buying/accounts" />Accounts</span><b><FigmaIcon src="tabs/buying/delivery" />Campaign delivery</b><span><FigmaIcon src="tabs/buying/landing" />Landing pages</span><span><FigmaIcon src="tabs/buying/domains" />Domains</span><span><FigmaIcon src="tabs/buying/campaigns" />Campaigns</span><button type="button" onClick={() => go("docs", "BRIEF-01")}><FigmaIcon src="tabs/buying/documents" />Documents</button></div>
      <div className={styles.toolbar}>
        <span className={styles.chip}>Appearance : User</span>
        {q === null ? <button type="button" className={styles.icon} aria-label="Search this table" onClick={() => setQ("")}><Search size={15} /></button> : (
          <span className={styles.inlineInput}><Search size={13} /><input autoFocus value={q} placeholder="Campaign..." aria-label="Search this table" onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setQ(null)} /></span>
        )}
        <span className={styles.spacer} />
        <button type="button" className={styles.me} aria-pressed={mine} onClick={() => setMine(!mine)}><Face name="Emma Carter" size={20} /> Me</button>
        <span className={styles.round}><UserRound size={14} /> Assignee</span>
        <button type="button" className={styles.round} onClick={(e) => setMenu({ el: e.currentTarget, kind: "display" })}><Settings2 size={14} /> Display</button>
        <button type="button" className={styles.round} data-active={delivery !== "all" || undefined} onClick={(e) => setMenu({ el: e.currentTarget, kind: "filter" })}><Filter size={14} /> Filter</button>
        <button type="button" className={styles.primary} style={{ background: "#2563eb" }} onClick={() => add(false)}>Add campaign</button>
      </div>
      <div ref={scroll} className={styles.scroll}>
        {group("a", "Emma Carter · Account 4821", "Total · 21–23 Sep", false)}
        {group("b", "Archived · previous test", "Total · previous test", true)}
      </div>
      {menu?.kind === "filter" && (
        <Pop anchor={menu.el} onClose={() => setMenu(null)} align="end" width={170}>
          {(["all", "active", "paused"] as Delivery[]).map((d) => <Row key={d} selected={delivery === d} onClick={() => (setDelivery(d), setMenu(null))}>{d === "all" ? "All delivery" : d === "active" ? "Active" : "Paused"}</Row>)}
        </Pop>
      )}
      {menu?.kind === "display" && (
        <Pop anchor={menu.el} onClose={() => setMenu(null)} align="end" width={180}>
          {COLS.map((c) => <Row key={c.key} selected={visible.includes(c.key)} onClick={() => setVisible(visible.includes(c.key) ? (visible.length > 1 ? visible.filter((x) => x !== c.key) : visible) : [...visible, c.key])}>{c.label}</Row>)}
        </Pop>
      )}
    </div>
  );
}
