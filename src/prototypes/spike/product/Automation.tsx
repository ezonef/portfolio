"use client";

import { Minus } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Clock, FileText, Filter, Kanban, LayoutDashboard, Megaphone, PanelRightClose, Plus, ScanEye, Zap } from "./figma-icons";
import type { Go } from "./data";
import { Face, Pop, Row } from "./ui";
import styles from "./product.module.css";

type NodeId = "focus" | "t1" | "cond" | "d1" | "a1" | "t2" | "d2" | "a2";
type Pos = Record<NodeId, { x: number; y: number }>;
const START: Pos = {
  focus: { x: 20, y: 310 },
  t1: { x: 300, y: 130 },
  cond: { x: 585, y: 10 },
  d1: { x: 900, y: 150 },
  a1: { x: 1180, y: 90 },
  t2: { x: 330, y: 470 },
  d2: { x: 720, y: 510 },
  a2: { x: 1060, y: 480 },
};
const WIDTH: Record<NodeId, number> = { focus: 200, t1: 200, cond: 250, d1: 216, a1: 216, t2: 250, d2: 216, a2: 216 };
/** Connection height from the top of each card */
const PORT: Record<NodeId, number> = { focus: 92, t1: 92, cond: 150, d1: 62, a1: 150, t2: 148, d2: 76, a2: 130 };
const EDGES: [NodeId, NodeId][] = [["focus", "t1"], ["t1", "cond"], ["cond", "d1"], ["d1", "a1"], ["focus", "t2"], ["t2", "d2"], ["d2", "a2"]];
const OPTIONS: Record<string, string[]> = {
  collection: ["Trail Max / Court Rise", "Trail Max", "Court Rise"],
  event: ["Purchase", "Added to cart", "Added to wishlist", "User inactive"],
  action: ["Funnel", "Segment", "Audience"],
  send: ["Template", "Email", "Push"],
  template: ["10% off", "20% off", "STRIDE30"],
};
const FUNNEL = ["Creative", "Pre-landing", "Landing", "Registered", "Client"];

export function Automation({ focus }: { go: Go; focus?: string }) {
  const [pos, setPos] = useState<Pos>(START);
  const [zoom, setZoom] = useState(0.62);
  const [pan, setPan] = useState({ x: 8, y: 6 });
  const [dragging, setDragging] = useState<NodeId | "canvas" | null>(null);
  const [v, setV] = useState({ collection: "Trail Max / Court Rise", e1: "Purchase", cAction: "Funnel", stage: "Client", instant: true, e2: "Added to wishlist", e3: "User inactive", join: "OR" as "AND" | "OR", wait: 2, s1: "Template", tpl1: "10% off", s2: "Template", tpl2: "20% off" });
  const [menu, setMenu] = useState<{ el: HTMLElement; key: keyof typeof v; list: string[] } | null>(null);
  const [flash, setFlash] = useState(false);
  const last = useRef({ x: 0, y: 0 });
  const canvas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focus !== "AUTO-01") return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1800);
    return () => clearTimeout(t);
  }, [focus]);

  const frame = () => { const el = canvas.current!; return el.getBoundingClientRect().width / el.offsetWidth || 1; };
  const down = (e: PointerEvent, id: NodeId | "canvas") => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button, input")) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY };
    setDragging(id);
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const f = frame();
    const dx = (e.clientX - last.current.x) / f;
    const dy = (e.clientY - last.current.y) / f;
    last.current = { x: e.clientX, y: e.clientY };
    if (dragging === "canvas") setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    else setPos((p) => ({ ...p, [dragging]: { x: p[dragging].x + dx / zoom, y: p[dragging].y + dy / zoom } }));
  };
  const up = () => setDragging(null);

  const sel = (key: keyof typeof v, list: string[], label: string) => (
    <label className={styles.nField}>
      <span>{label}</span>
      <button type="button" className={styles.nSelect} onClick={(e) => setMenu({ el: e.currentTarget, key, list })}>{String(v[key])}<ChevronDown size={14} /></button>
    </label>
  );
  const card = (id: NodeId, icon: ReactNode, title: string, body: ReactNode) => (
    <article
      key={id}
      className={styles.node}
      data-drag={dragging === id || undefined}
      data-flash={flash || undefined}
      style={{ left: pos[id].x, top: pos[id].y, width: WIDTH[id] }}
      onPointerDown={(e) => down(e, id)}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <h4>{icon}{title}</h4>
      <div>{body}</div>
      {id !== "focus" && <i className={styles.port} style={{ left: -4, top: PORT[id] - 4 }} />}
      {id !== "a1" && id !== "a2" && <i className={styles.port} style={{ right: -4, top: PORT[id] - 4 }} />}
    </article>
  );
  const path = ([a, b]: [NodeId, NodeId]) => {
    const x1 = pos[a].x + WIDTH[a];
    const y1 = pos[a].y + PORT[a];
    const x2 = pos[b].x;
    const y2 = pos[b].y + PORT[b];
    const c = Math.max(36, Math.abs(x2 - x1) / 2);
    return `M${x1} ${y1} C${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`;
  };
  const setZ = (d: number) => setZoom((z) => Math.max(0.4, Math.min(1.2, Math.round((z + d) * 100) / 100)));

  return (
    <div className={styles.page}>
      <nav className={styles.crumbsBar} aria-label="Path"><span>Stride Campaign</span><ChevronRight size={13} /><span>Automation</span><ChevronRight size={13} /><b>AUTO-01 · Cart recovery</b></nav>
      <div className={styles.tabs}><span><LayoutDashboard size={16} />Accounts</span><b data-green><Zap size={16} />Automation</b><span><Kanban size={16} />Logs</span><span><FileText size={16} />Documentation</span></div>
      <div
        ref={canvas}
        className={styles.canvas}
        data-pan={dragging === "canvas" || undefined}
        onPointerDown={(e) => down(e, "canvas")}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className={styles.world} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <svg className={styles.edges} aria-hidden>{EDGES.map((e) => <path key={e.join("-")} d={path(e)} />)}</svg>
          {card("focus", <ScanEye size={16} />, "Focus", sel("collection", OPTIONS.collection, "Collection"))}
          {card("t1", <Zap size={16} />, "Trigger", sel("e1", OPTIONS.event, "Event"))}
          {card("cond", <Filter size={16} />, "Condition", <>
            {sel("cAction", OPTIONS.action, "Action")}
            <div className={styles.nField}><span>Funnel stage</span>
              <div role="radiogroup" aria-label="Funnel stage" className={styles.radios}>
                {FUNNEL.map((s) => <button key={s} type="button" role="radio" aria-checked={v.stage === s} onClick={() => setV({ ...v, stage: s })}><i />{s}</button>)}
              </div>
            </div>
          </>)}
          {card("d1", <Clock size={16} />, "Delay", <div className={styles.nField}>
            <span className={styles.nSplit}>Timeout <b>{v.instant ? "Instant" : "1 hour"}</b></span>
            <button type="button" role="switch" aria-checked={v.instant} aria-label="Send instantly" className={styles.bigSwitch} onClick={() => setV({ ...v, instant: !v.instant })}><i /></button>
          </div>)}
          {card("a1", <Megaphone size={16} />, "Action", <>{sel("s1", OPTIONS.send, "Action")}{sel("tpl1", OPTIONS.template, "Template")}</>)}
          {card("t2", <Zap size={16} />, "Trigger", <>
            {sel("e2", OPTIONS.event, "Event")}
            <div className={styles.andOr} role="group" aria-label="Join events">
              {(["AND", "OR"] as const).map((j) => <button key={j} type="button" aria-pressed={v.join === j} onClick={() => setV({ ...v, join: j })}>{j}</button>)}
            </div>
            {sel("e3", OPTIONS.event, "Event")}
          </>)}
          {card("d2", <Clock size={16} />, "Delay", <div className={styles.nField}>
            <span className={styles.nSplit}>Delay <b>{v.wait} {v.wait === 1 ? "day" : "days"}</b></span>
            <div className={styles.steps} role="group" aria-label="Delay in days">
              {[1, 2, 3, 4].map((d) => <button key={d} type="button" aria-label={`${d} days`} aria-pressed={v.wait === d} onClick={() => setV({ ...v, wait: d })}><i /></button>)}
            </div>
          </div>)}
          {card("a2", <Megaphone size={16} />, "Action", <>{sel("s2", OPTIONS.send, "Action")}{sel("tpl2", OPTIONS.template, "Template")}</>)}
        </div>

        <button type="button" className={styles.funnelBtn} onClick={(e) => setMenu({ el: e.currentTarget, key: "collection", list: OPTIONS.collection })}>Stride · {v.collection} <ChevronDown size={14} /></button>
        <div className={styles.palette} aria-hidden><PanelRightClose size={15} /><hr /><ScanEye size={15} /><Zap size={15} /><Filter size={15} /><Clock size={15} /><Megaphone size={15} /></div>
        <div className={styles.share}><span><Face name="Emma Carter" size={24} /><Face name="Ilya K" size={24} /><Face name="Daria R" size={24} /></span><b>Share</b></div>
        <div className={styles.zoom}>
          <button type="button" aria-label="Zoom out" onClick={() => setZ(-0.08)}><Minus size={14} /></button>
          <button type="button" aria-label="Reset view" onClick={() => { setZoom(0.62); setPan({ x: 8, y: 6 }); setPos(START); }}>{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label="Zoom in" onClick={() => setZ(0.08)}><Plus size={14} /></button>
        </div>
      </div>
      {menu && (
        <Pop anchor={menu.el} onClose={() => setMenu(null)} width={200}>
          {menu.list.map((o) => <Row key={o} selected={v[menu.key] === o} onClick={() => { setV({ ...v, [menu.key]: o }); setMenu(null); }}>{o}</Row>)}
        </Pop>
      )}
    </div>
  );
}
