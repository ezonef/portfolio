"use client";

import { Check, Minus, X as LucideX } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpFromDot, ChevronRight, CircleCheckBig, CopyPlus, DollarSign, Ellipsis, Focus, GitPullRequest, Group, Locate, Map, MessageCircle, Network, PanelLeftClose, Plus, Search, Star, Tags, Text, UserRound, Zap } from "./figma-icons";
import { TASKS, type Go, type TaskNode } from "./data";
import { Face } from "./ui";
import styles from "./product.module.css";

const ICON: Record<TaskNode["kind"], ReactNode> = {
  root: <Network size={14} />,
  group: <Focus size={13} />,
  bolt: <Zap size={13} />,
  item: <Locate size={12} />,
};
type Panel = "brief" | "comments" | "links";
const LINKS: [string, string, Parameters<Go>[0], string][] = [
  ["Buying", "ST-01 · Trail Max", "buying", "ST-01"],
  ["Buying", "ST-02 · Court Rise", "buying", "ST-02"],
  ["Automation", "AUTO-01 · Cart recovery", "automation", "AUTO-01"],
  ["Hiring", "HR-07 · Meta Ads Buyer", "hiring", "HR-07"],
  ["Documents", "BRIEF-01 · Campaign brief", "docs", "BRIEF-01"],
];

export function Tasks({ go, focus, onSearch }: { go: Go; focus?: string; onSearch: () => void }) {
  const [at, setAt] = useState("STRIDE-123");
  const [done, setDone] = useState<Set<string>>(() => new Set(["t-pay", "t-pixel", "t-domain"]));
  const [starred, setStarred] = useState(true);
  const [panel, setPanel] = useState<Panel | null>("brief");
  const [open, setOpen] = useState({ buying: true, automation: true, documents: false });
  const [extra, setExtra] = useState(0);
  const [side, setSide] = useState(true);
  const [win, setWin] = useState<"normal" | "zoomed" | "minimized">("normal");

  useEffect(() => {
    if (focus && TASKS.some((t) => t.id === focus)) setAt(focus);
  }, [focus]);

  const task = TASKS.find((t) => t.id === at)!;
  const toggle = (k: keyof typeof open) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const isDone = done.has(at);

  return (
    <div className={styles.taskBackdrop} data-zoomed={win === "zoomed" || undefined}>
      <div className={styles.taskWindow} data-minimized={win === "minimized" || undefined} inert={win === "minimized"}>
        <header className={styles.taskTop}>
          <span className={styles.lights} role="group" aria-label="Window controls">
            <button type="button" aria-label="Close window" onClick={() => go("buying")}><LucideX size={9} strokeWidth={3} /></button>
            <button type="button" aria-label="Minimize window" onClick={() => setWin("minimized")}><Minus size={9} strokeWidth={3} /></button>
            <button type="button" aria-label={win === "zoomed" ? "Exit full size" : "Enter full size"} aria-pressed={win === "zoomed"} onClick={() => setWin(win === "zoomed" ? "normal" : "zoomed")}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden><path d="M1 1h4L1 5zM7 7H3l4-4z" /></svg>
            </button>
          </span>
          <nav className={styles.crumbs} aria-label="Path"><span>Traffic Team</span><ChevronRight size={13} /><span>Stride Campaign</span><ChevronRight size={13} /><span>Sprint 38 · 21–27 Sep</span><ChevronRight size={13} /><b>{task.label}</b></nav>
          <CopyPlus size={14} className={styles.mutedIcon} />
          <span className={styles.spacer} />
          <span className={styles.updated}>Updated 23 Sep · 10:00</span>
          <button type="button" className={styles.icon} aria-label="Star task" aria-pressed={starred} onClick={() => setStarred(!starred)}><Star size={15} fill={starred ? "#f59e0b" : "none"} color={starred ? "#f59e0b" : "currentColor"} /></button>
          <span className={styles.icon} aria-hidden><Ellipsis size={16} /></span>
        </header>
        <div className={styles.taskBody}>
          {side && (
            <aside className={styles.taskTree}>
              <div className={styles.sideHead}>
                <strong>Tasks</strong>
                <button type="button" className={styles.icon} aria-label="Collapse tasks" onClick={() => setSide(false)}><PanelLeftClose size={15} /></button>
                <button type="button" className={styles.icon} aria-label="Search everywhere" onClick={onSearch}><Search size={15} /></button>
              </div>
              <ul>
                {TASKS.map((t) => (
                  <li key={t.id} style={{ paddingLeft: t.depth * 13 }}>
                    <button type="button" data-on={t.id === at || undefined} data-root={t.depth === 0 || undefined} onClick={() => setAt(t.id)}>
                      {done.has(t.id) ? <Check size={13} className={styles.okIcon} /> : ICON[t.kind]}
                      <span>{t.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <main className={styles.taskMain}>
            {!side && <button type="button" className={styles.icon} aria-label="Show tasks" onClick={() => setSide(true)}><PanelLeftClose size={15} /></button>}
            <p className={styles.kicker}><Network size={13} /> Campaign launch</p>
            <h2 className={styles.taskTitle} key={at}>{task.label}</h2>
            <dl className={styles.props}>
              <div><dt><CircleCheckBig size={14} /> Status</dt><dd>
                {task.depth === 0 ? <span className={styles.live}><i /> Live</span> : (
                  <button type="button" className={styles.statusBtn} data-done={isDone || undefined} onClick={() => setDone((d) => { const n = new Set(d); if (n.has(at)) n.delete(at); else n.add(at); return n; })}>
                    {isDone ? <><Check size={12} /> Done</> : "Mark done"}
                  </button>
                )}
              </dd></div>
              <div><dt><ArrowUpFromDot size={14} /> Channels</dt><dd className={styles.channels}><i data-c="fb">f</i><i data-c="g">G</i></dd></div>
              <div><dt><UserRound size={14} /> Owner</dt><dd className={styles.owner}><Face name="Emma Carter" /> Emma Carter</dd></div>
              <div><dt><Map size={14} /> Market</dt><dd><span className={styles.pill}>PL</span> <span className={styles.pill}>Poland</span></dd></div>
              <div data-hover><dt><Tags size={14} /> Tags</dt><dd><span className={styles.tagBlue}>Stride · PL</span> <span className={styles.pill}>+3</span></dd></div>
              <div><dt><DollarSign size={14} /> Daily budget</dt><dd>2,000 zł / day</dd></div>
            </dl>

            <section className={styles.linked}>
              <button type="button" className={styles.linkHead} aria-expanded={open.buying} onClick={() => toggle("buying")}><i data-c="green"><Group size={13} /></i> Buying <span data-open={open.buying || undefined}>▸</span></button>
              {open.buying && (
                <table>
                  <thead><tr><th>Campaign</th><th>Daily budget</th><th>Delivery</th></tr></thead>
                  <tbody>
                    <tr onClick={() => go("buying", "ST-01")}><td><button type="button" onClick={(e) => (e.stopPropagation(), go("buying", "ST-01"))}>ST-01 · Trail Max</button></td><td>1,200 zł</td><td>Active</td></tr>
                    <tr onClick={() => go("buying", "ST-02")}><td><button type="button" onClick={(e) => (e.stopPropagation(), go("buying", "ST-02"))}>ST-02 · Court Rise</button></td><td>800 zł</td><td>Active</td></tr>
                    {Array.from({ length: extra }, (_, i) => <tr key={i}><td>New campaign {i + 1}</td><td>0 zł</td><td>Draft</td></tr>)}
                  </tbody>
                </table>
              )}
              {open.buying && <button type="button" className={styles.addRow} onClick={() => setExtra(extra + 1)}><Plus size={13} /> Add campaign</button>}
            </section>
            <section className={styles.linked}>
              <button type="button" className={styles.linkHead} aria-expanded={open.automation} onClick={() => toggle("automation")}><i data-c="orange"><Group size={13} /></i> Automation <span data-open={open.automation || undefined}>▸</span></button>
              {open.automation && (
                <table>
                  <thead><tr><th>Workflow</th><th>Campaign</th><th>Market</th></tr></thead>
                  <tbody><tr onClick={() => go("automation", "AUTO-01")}><td><button type="button" onClick={(e) => (e.stopPropagation(), go("automation", "AUTO-01"))}>AUTO-01 · Cart recovery</button></td><td>STRIDE-123</td><td>PL</td></tr></tbody>
                </table>
              )}
            </section>
            <section className={styles.linked}>
              <button type="button" className={styles.linkHead} aria-expanded={open.documents} onClick={() => toggle("documents")}><i><Group size={13} /></i> Documents <span data-open={open.documents || undefined}>▸</span></button>
              {open.documents && (
                <table><tbody>
                  <tr onClick={() => go("docs", "BRIEF-01")}><td><button type="button" onClick={(e) => (e.stopPropagation(), go("docs", "BRIEF-01"))}>BRIEF-01 · Campaign brief</button></td></tr>
                  <tr onClick={() => go("docs", "STRATEGY-02")}><td><button type="button" onClick={(e) => (e.stopPropagation(), go("docs", "STRATEGY-02"))}>STRATEGY-02 · Creative strategy</button></td></tr>
                </tbody></table>
              )}
            </section>
          </main>
          <div className={styles.taskTools} role="group" aria-label="Task panel">
            {([["brief", <Text key="a" size={15} />, "Brief"], ["comments", <MessageCircle key="b" size={15} />, "Comments"], ["links", <GitPullRequest key="c" size={15} />, "Linked work"]] as [Panel, ReactNode, string][]).map(([p, ic, l]) => (
              <button key={p} type="button" className={styles.icon} aria-label={l} title={l} aria-pressed={panel === p} onClick={() => setPanel(panel === p ? null : p)}>{ic}</button>
            ))}
          </div>
          {panel && (
            <aside className={styles.brief}>
              {panel === "brief" && (
                <>
                  <h3>Campaign brief · STRIDE-123</h3>
                  <p className={styles.small}>Trail Max and Court Rise · Meta Ads · Poland<br />Live since 21 Sep. Owner: Emma Carter.</p>
                  <h4>Campaign summary</h4>
                  <p>Promo: 21–27 Sep · Poland · ages 25–35<br />Offer: 30% off with STRIDE30</p>
                  <h4>Results · 21–23 Sep</h4>
                  <p>Spend 7,000 zł · 70 purchases<br />Revenue 31,500 zł · CPA 100 zł<br />ROAS 4.50× · Average order 450 zł</p>
                  <h4>Targets & next step</h4>
                  <p>CPA ≤100 zł · ROAS ≥4.50×<br />Review ST-03 and ST-06 before scaling.</p>
                  <h4>Approved materials</h4>
                  <p>5 banners · 3 UGC videos<br />Creative strategy v2 · approved 20 Sep</p>
                </>
              )}
              {panel === "comments" && (
                <>
                  <h3>Comments</h3>
                  {[["Emma Carter", "ST-06 is paused. Let’s review it before scaling.", "23 Sep · 09:42"], ["Daria Romanova", "New Court Rise creatives are approved.", "22 Sep · 18:10"]].map(([n, t, d]) => (
                    <div key={t} className={styles.comment}><Face name={n} size={24} /><div><b>{n}</b><p>{t}</p><small>{d}</small></div></div>
                  ))}
                </>
              )}
              {panel === "links" && (
                <>
                  <h3>Linked work</h3>
                  <p className={styles.small}>One task connects every product used in the launch.</p>
                  <div className={styles.linkList}>
                    {LINKS.map(([k, t, v, f]) => (
                      <button key={f} type="button" onClick={() => go(v, f)}><small>{k}</small><span>{t}</span><ChevronRight size={14} /></button>
                    ))}
                  </div>
                </>
              )}
            </aside>
          )}
        </div>
      </div>
      {win === "minimized" && (
        <button type="button" className={styles.taskDock} aria-label={`Restore ${task.label}`} onClick={() => setWin("normal")}><Network size={14} /><span>{task.label}</span></button>
      )}
    </div>
  );
}
