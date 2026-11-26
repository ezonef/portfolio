"use client";

import { ChevronDown, ChevronUp, Plus, Send, X } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { useEffect, useRef, useState } from "react";
import { ConditionGroup, FIELD_ICONS, METRICS, JOIN_LABEL, OP_LABEL, cond, flip, groupResult, isComplete, isMetric, newId, type Cond, type FieldDef, type Join, type MetricKey } from "./Conditions";
import { FIELDS, fieldValues, toneOf, type Leaf } from "./data";
import { ChipPicker, lookOf } from "./ChipPicker";
import { MenuRow, Popover, dragPanel, inLaterLayer } from "./ui";
import { SavedMenu } from "./SavedMenu";
import styles from "./product.module.css";

export { FIELD_ICONS };
export type { FieldDef };
export type CondGroup = { id: number; join: Join; conds: Cond[] };
type SimpleRule = { op: "is" | "not"; values: string[] };
export type FilterState = { mode: "simple" | "advanced"; simple: Record<string, SimpleRule>; groups: CondGroup[] };

const NO_RULE: SimpleRule = { op: "is", values: [] };

/**
 * Switching modes keeps the filter. Simple to advanced: every picked field becomes a condition of one "and" group.
 * Advanced to simple: when it can be said simply (only "and", each field once, no number conditions), it comes back;
 * otherwise simple keeps what it had.
 */
function switchMode(f: FilterState, to: FilterState["mode"]): FilterState {
  if (to === f.mode) return f;
  if (to === "advanced") {
    const conds = Object.entries(f.simple)
      .filter(([, r]) => r.values.length)
      .map(([k, r]) => ({ ...cond(), field: k, op: r.op, values: [...r.values] }));
    return conds.length ? { ...f, mode: to, groups: [{ id: newId(), join: "and", conds }] } : { ...f, mode: to };
  }
  const conds = f.groups.flatMap((g, gi) => g.conds.filter(isComplete).map((c, ci) => ({ c, and: (gi === 0 || g.join === "and") && (ci === 0 || c.join === "and") })));
  const fields = conds.map(({ c }) => c.field);
  const plain = conds.every(({ c, and }) => and && (c.op === "is" || c.op === "not") && !isMetric(c.field)) && new Set(fields).size === fields.length;
  if (!conds.length || !plain) return { ...f, mode: to };
  const simple = Object.fromEntries(Object.keys(f.simple).map((k) => [k, { ...NO_RULE }]));
  for (const { c } of conds) simple[c.field!] = { op: c.op as SimpleRule["op"], values: [...c.values] };
  return { ...f, mode: to, simple };
}
const group = (join: Join = "and"): CondGroup => ({ id: newId(), join, conds: [cond()] });
const simpleWith = (values: Record<string, string[]>, fields: FieldDef[] = FIELDS): FilterState => {
  const simple: Record<string, SimpleRule> = Object.fromEntries(fields.map((f) => [f.key, { op: "is", values: [] }]));
  for (const [k, v] of Object.entries(values)) simple[k] = { op: "is", values: v };
  return { mode: "simple", simple, groups: [group()] };
};

export const emptyFilter = (fields: FieldDef[] = FIELDS): FilterState => simpleWith({}, fields);
/** A simple filter with these values already picked */
export const filterWith = (values: Record<string, string[]>, fields: FieldDef[] = FIELDS) => simpleWith(values, fields);
export const presetFilter = (): FilterState => simpleWith({ status: ["Active"], geo: ["Poland"] });

const PRESETS: { name: string; build: () => FilterState }[] = [
  { name: "Active in Poland", build: presetFilter },
  { name: "Needs attention", build: () => simpleWith({ status: ["Rejected", "Paused"] }) },
  { name: "Scale · Facebook", build: () => simpleWith({ tag: ["Scale"], source: ["Facebook"] }) },
];
/** Saved filters: the presets and what people saved, kept for the session across tables and dashboards */
let saved = [...PRESETS];
/** A filter in a form two filters can be compared by: what is picked, ignoring ids and empty rows */
const picked = (f: FilterState) =>
  f.mode === "simple"
    ? JSON.stringify(
        Object.entries(f.simple)
          .filter(([, r]) => r.values.length)
          .map(([k, r]) => [k, r.op, [...r.values].sort()])
          .sort(([a], [b]) => String(a).localeCompare(String(b))),
      )
    : JSON.stringify(f.groups.map((g) => [g.join, g.conds.filter(isComplete).map((c) => [c.join, c.field, c.op, [...c.values].sort(), c.num])]));
/** Which saved filter each filter panel last started from (table and dashboard keep their own), so "edited" survives closing the panel */
const baseOf = new Map<string, string | null>();
/** The saved filter the current one is, if it was picked and not changed since */
const savedOf = (f: FilterState) => (activeCount(f) ? saved.find((s) => s.build().mode === f.mode && picked(s.build()) === picked(f)) : undefined);

function metric(leaf: Leaf, k: MetricKey) {
  if (k === "cpa") return leaf.purchases ? leaf.spend / leaf.purchases : NaN;
  if (k === "roas") return leaf.spend ? leaf.revenue / leaf.spend : 0;
  return leaf[k];
}
/** `extra` holds values that are not on the ad itself, like the account it belongs to */
export function matches(leaf: Leaf, f: FilterState, extra: Record<string, string> = {}) {
  const values = (k: string) => (k in extra ? [extra[k]] : fieldValues(leaf, k));
  // "is" wants any of the picked values on the ad, "is not" wants none of them
  if (f.mode === "simple") return Object.entries(f.simple).every(([k, r]) => !r.values.length || values(k).some((v) => r.values.includes(v)) === (r.op === "is"));
  const results = f.groups.map((g) => ({ join: g.join, ok: groupResult(g.conds, values, (k) => metric(leaf, k)) }));
  let result: boolean | null = null;
  for (const p of results) {
    if (p.ok === null) continue;
    result = result === null ? p.ok : p.join === "and" ? result && p.ok : result || p.ok;
  }
  return result ?? true;
}
export const activeCount = (f: FilterState) =>
  f.mode === "simple"
    ? Object.values(f.simple).filter((r) => r.values.length).length
    : f.groups.flatMap((g) => g.conds).filter(isComplete).length;

/** A small local stand-in for the AI: finds known values in the sentence and turns them into a simple filter. */
function parse(text: string): FilterState | null {
  const q = text.toLowerCase();
  const found: Record<string, string[]> = {};
  for (const f of FIELDS) {
    const values = f.options.filter((o) =>
      o
        .toLowerCase()
        .split(" ")
        .some((w) => w.length > 2 && q.includes(w.slice(0, Math.max(3, w.length - 2)))),
    );
    if (values.length) found[f.key] = values;
  }
  return Object.keys(found).length ? simpleWith(found) : null;
}

type Open =
  | { el: HTMLElement; kind: "saved" }
  | { el: HTMLElement; kind: "sop" | "svalue"; field: string };

export function Filters({
  filter,
  setFilter,
  onClose,
  fields = FIELDS,
  metrics = true,
}: {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  onClose: () => void;
  fields?: FieldDef[];
  /** Number conditions (CPA, ROAS…) in the advanced mode; off where the rows have no such numbers */
  metrics?: boolean;
}) {
  const ruleOf = (k: string) => filter.simple[k] ?? NO_RULE;
  const [open, setOpen] = useState<Open | null>(null);
  const [ask, setAsk] = useState("");
  const [note, setNote] = useState("");
  const show = (next: Open) => {
    setOpen(open?.el === next.el ? null : next);
  };
  const close = () => setOpen(null);
  // A click outside the panel and its menus closes it; the button that opens it toggles it on its own
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const root = panel.current?.closest("[data-theme]");
      if (!root?.contains(t) || panel.current?.contains(t) || inLaterLayer(t) || t.closest?.("[data-filter-toggle], [data-overlay]")) return;
      onClose();
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [onClose]);
  const [, refresh] = useState(0);
  // The saved filter this one started from; when the filter changes after it, Saved offers to update, reset or save as new
  const scope = fields.map((f) => f.key).join(",");
  const [base, setBaseState] = useState<string | null>(() => baseOf.get(scope) ?? savedOf(filter)?.name ?? null);
  const setBase = (name: string | null) => (baseOf.set(scope, name), setBaseState(name));
  const current = savedOf(filter);
  // Saved filters show only where every field they use exists (an account has no status or geo)
  const keys = new Set([...fields.map((f) => f.key), ...(metrics ? METRICS.map((m) => m.key) : [])]);
  const fits = (f: FilterState) =>
    f.mode === "simple"
      ? Object.entries(f.simple).every(([k, r]) => !r.values.length || keys.has(k))
      : f.groups.every((g) => g.conds.every((c) => !c.field || keys.has(c.field)));
  const edited = !!base && current?.name !== base && saved.some((s) => s.name === base);
  const nextName = () => {
    let n = 1;
    while (saved.some((s) => s.name === `My filter ${n}`)) n++;
    return `My filter ${n}`;
  };
  const snapshot = () => {
    const copy = structuredClone(filter);
    return () => structuredClone(copy);
  };
  const saveNew = (name: string) => {
    saved = [...saved.filter((s) => s.name !== name), { name, build: snapshot() }];
    setBase(name);
    refresh((x) => x + 1);
  };
  const update = () => {
    saved = saved.map((s) => (s.name === base ? { ...s, build: snapshot() } : s));
    refresh((x) => x + 1);
  };
  const reset = () => {
    const s = saved.find((x) => x.name === base);
    if (s) setFilter(s.build());
  };

  const setSimple = (k: string, p: Partial<SimpleRule>) => setFilter({ ...filter, simple: { ...filter.simple, [k]: { ...ruleOf(k), ...p } } });
  const setGroups = (groups: CondGroup[]) => setFilter({ ...filter, groups });
  const patchGroup = (gid: number, p: Partial<CondGroup>) => setGroups(filter.groups.map((g) => (g.id === gid ? { ...g, ...p } : g)));
  const setConds = (gid: number, conds: Cond[]) => {
    const groups = conds.length ? filter.groups.map((g) => (g.id === gid ? { ...g, conds } : g)) : filter.groups.filter((g) => g.id !== gid);
    setGroups(groups.length ? groups : [group()]);
  };

  const submit = () => {
    if (!ask.trim()) return;
    const built = parse(ask);
    if (built) {
      setFilter(built);
      setNote("");
      setAsk("");
    } else setNote("Found nothing to filter by. Try: “active in Poland”.");
  };

  const chevron = (on: boolean) => (on ? <ChevronUp size={15} /> : <ChevronDown size={15} />);

  return (
    <section ref={panel} className={styles.filters} data-mode={filter.mode} data-drag-panel aria-label="Filters">
      <header className={styles.filterHead} onPointerDown={dragPanel}>
        <h3>Filters</h3>
        <div className={styles.seg} role="group" aria-label="Filter mode">
          {(["simple", "advanced"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={filter.mode === m} onClick={() => (close(), setFilter(switchMode(filter, m)))}>
              {m === "simple" ? "Simple" : "Advanced"}
            </button>
          ))}
        </div>
        <button type="button" className={styles.select} onClick={(e) => show({ el: e.currentTarget, kind: "saved" })}>
          {/* The picked saved filter names the button; changed after picking, it says so */}
          <span>{current?.name ?? (edited ? `${base} · edited` : "Saved")}</span> <ChevronDown size={15} />
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Close filters" onClick={onClose}>
          <X size={16} />
        </button>
      </header>

      <form
        className={styles.askRow}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ThinkingOrb state="working" size={20} theme="auto" aria-hidden="true" />
        <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask the AI to build a filter..." aria-label="Build a filter from text" />
        <button type="submit" className={styles.sendBtn} aria-label="Build filter" disabled={!ask.trim()}>
          <Send size={14} />
        </button>
      </form>
      {note && <p className={styles.filterNote}>{note}</p>}

      {filter.mode === "simple" ? (
        <div className={styles.rules}>
          {fields.map((f) => {
            const r = ruleOf(f.key);
            return (
              <div key={f.key} className={styles.simpleRule}>
                <span className={styles.select} data-static><span>{f.label}</span></span>
                <button type="button" className={styles.select} aria-label={`Condition: ${f.label}`} onClick={(e) => show({ el: e.currentTarget, kind: "sop", field: f.key })}>
                  <span>{OP_LABEL[r.op]}</span> {chevron(open?.kind === "sop" && "field" in open && open.field === f.key)}
                </button>
                <button type="button" className={styles.select} data-spot={`filter-value-${f.key}`} data-empty={!r.values.length || undefined} onClick={(e) => show({ el: e.currentTarget, kind: "svalue", field: f.key })}>
                  <span>{r.values.length ? r.values.join(", ") : "Choose a value"}</span> {chevron(open?.kind === "svalue" && "field" in open && open.field === f.key)}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.advList}>
          {filter.groups.map((g, gi) => (
            <div key={g.id} className={styles.advRow}>
              {gi === 0 ? (
                <span className={styles.where}>Where</span>
              ) : (
                <button type="button" className={`${styles.select} ${styles.joinToggle}`} aria-label={`Groups joined by: ${JOIN_LABEL[g.join]}. Click to switch`} onClick={() => (close(), patchGroup(g.id, { join: flip(g.join) }))}>
                  {JOIN_LABEL[g.join]}
                </button>
              )}
              <ConditionGroup conds={g.conds} fields={fields} metrics={metrics} addLabel="Add nested filter" onChange={(conds) => setConds(g.id, conds)} />
            </div>
          ))}
        </div>
      )}

      <footer className={styles.filterFoot}>
        {filter.mode === "advanced" ? (
          <button type="button" className={styles.ghostBtn} onClick={() => setGroups([...filter.groups, group()])}>
            <Plus size={15} /> Add filter
          </button>
        ) : (
          <span />
        )}
        <span className={styles.filterFootEnd}>
          <button type="button" className={styles.ghostBtn} onClick={() => (close(), setBase(null), setFilter({ ...emptyFilter(fields), mode: filter.mode }))}>
            Clear
          </button>
        </span>
      </footer>

      {open?.kind === "saved" && (
        <SavedMenu
          anchor={open.el}
          onClose={close}
          items={saved.filter((x) => fits(x.build())).map((x) => ({ name: x.name, preset: PRESETS.some((p) => p.name === x.name) }))}
          current={current?.name}
          edited={edited ? base : null}
          canSave={!!activeCount(filter)}
          nextName={nextName}
          saveLabel="Save new filter"
          onPick={(name) => (setFilter(saved.find((x) => x.name === name)!.build()), setBase(name))}
          onSaveNew={saveNew}
          onUpdate={update}
          onReset={reset}
        />
      )}
      {open?.kind === "sop" && (
        <Popover anchor={open.el} onClose={close} width={150}>
          {(["is", "not"] as const).map((o) => (
            <MenuRow key={o} selected={ruleOf(open.field).op === o} onClick={() => (setSimple(open.field, { op: o }), close())}>
              {OP_LABEL[o]}
            </MenuRow>
          ))}
        </Popover>
      )}
      {open?.kind === "svalue" && (
        <Popover anchor={open.el} onClose={close} width={250} spot={`filter-values-${open.field}`}>
          <ChipPicker
            options={fields.find((f) => f.key === open.field)!.options}
            chosen={ruleOf(open.field).values}
            onAdd={(v) => setSimple(open.field, { values: [...ruleOf(open.field).values, v] })}
            onRemove={(v) => setSimple(open.field, { values: ruleOf(open.field).values.filter((x) => x !== v) })}
            look={lookOf(open.field)}
            tone={(v) => toneOf(open.field, v)}
          />
        </Popover>
      )}
    </section>
  );
}
