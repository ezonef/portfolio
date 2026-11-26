"use client";

import { ChevronDown, ChevronUp, CircleDot, Globe, Hash, LayoutDashboard, Megaphone, Plus, Search, Tag, Trash2, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toneOf, type FieldKey } from "./data";
import { ChipPicker, lookOf } from "./ChipPicker";
import { MenuRow, Popover } from "./ui";
import styles from "./product.module.css";

/**
 * A group of conditions — "Where Status Is Active And CPA Greater than 100" — shared by the
 * advanced filter and the colour coding, so both are written the same way.
 */

export const FIELD_ICONS: Record<FieldKey, ReactNode> = {
  status: <CircleDot size={16} />,
  tag: <Tag size={16} />,
  buyer: <User size={16} />,
  geo: <Globe size={16} />,
  source: <Megaphone size={16} />,
};
export type MetricKey = "budget" | "spend" | "purchases" | "cpa" | "roas";
export const METRICS: { key: MetricKey; label: string }[] = [
  { key: "budget", label: "Budget" },
  { key: "spend", label: "Spend" },
  { key: "purchases", label: "Purchases" },
  { key: "cpa", label: "CPA" },
  { key: "roas", label: "ROAS" },
];
/** A field with set values, like Status or Buyer */
export type FieldDef = { key: string; label: string; options: string[] };
export type Join = "and" | "or";
type Op = "is" | "not" | "gt" | "lt" | "eq";
export type Cond = { id: number; join: Join; field: string | null; op: Op; values: string[]; num: string };

export const isMetric = (f: string | null): f is MetricKey => METRICS.some((m) => m.key === f);
export const iconOf = (k: string) => FIELD_ICONS[k as FieldKey] ?? <LayoutDashboard size={16} />;
export const OP_LABEL: Record<Op, string> = { is: "Is", not: "Is not", gt: "Greater than", lt: "Less than", eq: "Is" };
export const JOIN_LABEL: Record<Join, string> = { and: "And", or: "Or" };
export const flip = (j: Join): Join => (j === "and" ? "or" : "and");

let nextId = 1;
export const newId = () => nextId++;
export const cond = (join: Join = "and"): Cond => ({ id: newId(), join, field: null, op: "is", values: [], num: "" });
export const metricCond = (field: MetricKey, op: "gt" | "lt" | "eq", num: string, join: Join = "and"): Cond => ({ id: newId(), join, field, op, values: [], num });

/**
 * Whether a row meets one condition. `values` gives a field's values on the row
 * (a group row can hold several), `metric` its number. A condition still being written returns null.
 */
export function check(c: Cond, values: (k: string) => string[], metric: (k: MetricKey) => number): boolean | null {
  if (!c.field) return null;
  if (isMetric(c.field)) {
    const n = parseFloat(c.num.replace(",", "."));
    if (Number.isNaN(n)) return null;
    const v = metric(c.field);
    if (Number.isNaN(v)) return false;
    return c.op === "gt" ? v > n : c.op === "lt" ? v < n : Math.abs(v - n) < 0.005;
  }
  if (!c.values.length) return null;
  const hit = values(c.field).some((v) => c.values.includes(v));
  return c.op === "is" ? hit : !hit;
}
/** Joins results left to right; skipped conditions do not count */
export function combine(parts: { join: Join; ok: boolean | null }[]) {
  let result: boolean | null = null;
  for (const p of parts) {
    if (p.ok === null) continue;
    result = result === null ? p.ok : p.join === "and" ? result && p.ok : result || p.ok;
  }
  return result;
}
export const groupResult = (conds: Cond[], values: (k: string) => string[], metric: (k: MetricKey) => number) =>
  combine(conds.map((c) => ({ join: c.join, ok: check(c, values, metric) })));
export const isComplete = (c: Cond) => !!c.field && (isMetric(c.field) ? c.num.trim() !== "" && !Number.isNaN(parseFloat(c.num)) : c.values.length > 0);

type Open = { el: HTMLElement; kind: "field" | "op" | "value"; id: number };

export function ConditionGroup({
  conds,
  onChange,
  fields,
  addLabel = "Add condition",
  onBusy,
  metrics = true,
}: {
  conds: Cond[];
  /** An empty list means the last condition was removed */
  onChange: (conds: Cond[]) => void;
  fields: FieldDef[];
  addLabel?: string;
  /** Tells a panel around it that one of its dropdowns is open */
  onBusy?: (busy: boolean) => void;
  /** Offers number conditions (CPA, ROAS…) next to the fields */
  metrics?: boolean;
}) {
  const [open, setOpen] = useState<Open | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => onBusy?.(!!open), [open, onBusy]);
  const close = () => setOpen(null);
  const show = (next: Open) => {
    setQuery("");
    setOpen(open?.el === next.el ? null : next);
  };
  const q = query.toLowerCase();
  const labelOf = (f: string) => fields.find((x) => x.key === f)?.label ?? METRICS.find((x) => x.key === f)?.label ?? f;
  const patch = (id: number, p: Partial<Cond>) => onChange(conds.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const current = open ? conds.find((c) => c.id === open.id) : undefined;
  const chevron = (kind: Open["kind"], id: number) => (open?.kind === kind && open.id === id ? <ChevronUp size={15} /> : <ChevronDown size={15} />);

  return (
    <div className={styles.condGroup}>
      {conds.map((c, i) => (
        <div key={c.id} className={styles.cond}>
          {i === 0 ? (
            <span className={styles.where}>Where</span>
          ) : (
            <button type="button" className={`${styles.select} ${styles.joinToggle}`} aria-label={`Conditions joined by: ${JOIN_LABEL[c.join]}. Click to switch`} onClick={() => (close(), patch(c.id, { join: flip(c.join) }))}>
              {JOIN_LABEL[c.join]}
            </button>
          )}
          <button type="button" className={styles.select} data-empty={!c.field || undefined} onClick={(e) => show({ el: e.currentTarget, kind: "field", id: c.id })}>
            <span>{c.field ? labelOf(c.field) : "Choose a field"}</span> {chevron("field", c.id)}
          </button>
          <button type="button" className={styles.select} disabled={!c.field} aria-label="Condition" onClick={(e) => show({ el: e.currentTarget, kind: "op", id: c.id })}>
            <span>{OP_LABEL[c.op]}</span> {chevron("op", c.id)}
          </button>
          {isMetric(c.field) ? (
            <input
              className={styles.numInput}
              inputMode="decimal"
              value={c.num}
              placeholder="Value"
              aria-label={`Value: ${labelOf(c.field)}`}
              onChange={(e) => patch(c.id, { num: e.target.value.replace(/[^\d.,]/g, "") })}
            />
          ) : (
            <button type="button" className={styles.select} data-empty={!c.values.length || undefined} disabled={!c.field} onClick={(e) => show({ el: e.currentTarget, kind: "value", id: c.id })}>
              <span>{c.values.length ? c.values.join(", ") : "Choose a value"}</span> {chevron("value", c.id)}
            </button>
          )}
          <button type="button" className={styles.iconBtn} aria-label="Delete condition" onClick={() => (close(), onChange(conds.filter((x) => x.id !== c.id)))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button type="button" className={`${styles.ghostBtn} ${styles.nestedAdd}`} onClick={() => onChange([...conds, cond()])}>
        <Plus size={15} /> {addLabel}
      </button>

      {open?.kind === "field" && current && (
        <Popover anchor={open.el} onClose={close} width={250}>
          <div className={styles.popSearch}>
            <Search size={14} />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." aria-label="Search fields and metrics" />
          </div>
          {fields.some((f) => f.label.toLowerCase().includes(q)) && <p className={styles.popLabel}>Fields</p>}
          {fields.filter((f) => f.label.toLowerCase().includes(q)).map((f) => (
            <MenuRow
              key={f.key}
              icon={iconOf(f.key)}
              selected={current.field === f.key}
              onClick={() => (patch(current.id, { field: f.key, op: "is", values: current.field === f.key ? current.values : [], num: "" }), close())}
            >
              {f.label}
            </MenuRow>
          ))}
          {metrics && METRICS.some((m) => m.label.toLowerCase().includes(q)) && <p className={styles.popLabel}>Metrics</p>}
          {(metrics ? METRICS : []).filter((m) => m.label.toLowerCase().includes(q)).map((m) => (
            <MenuRow
              key={m.key}
              icon={<Hash size={16} />}
              selected={current.field === m.key}
              onClick={() => (patch(current.id, { field: m.key, op: isMetric(current.field) ? current.op : "gt", values: [], num: current.field === m.key ? current.num : "" }), close())}
            >
              {m.label}
            </MenuRow>
          ))}
          {!fields.some((f) => f.label.toLowerCase().includes(q)) && !(metrics && METRICS.some((m) => m.label.toLowerCase().includes(q))) && <p className={styles.popEmpty}>Nothing found</p>}
        </Popover>
      )}
      {open?.kind === "op" && current && (
        <Popover anchor={open.el} onClose={close} width={150}>
          {(isMetric(current.field) ? (["gt", "lt", "eq"] as const) : (["is", "not"] as const)).map((o) => (
            <MenuRow key={o} selected={current.op === o} onClick={() => (patch(current.id, { op: o }), close())}>
              {OP_LABEL[o]}
            </MenuRow>
          ))}
        </Popover>
      )}
      {open?.kind === "value" && current && current.field && !isMetric(current.field) && (
        <Popover anchor={open.el} onClose={close} width={250}>
          <ChipPicker
            options={fields.find((f) => f.key === current.field)?.options ?? []}
            chosen={current.values}
            onAdd={(v) => patch(current.id, { values: [...current.values, v] })}
            onRemove={(v) => patch(current.id, { values: current.values.filter((x) => x !== v) })}
            look={lookOf(current.field)}
            tone={(v) => toneOf(current.field, v)}
          />
        </Popover>
      )}
    </div>
  );
}

/** A field's value as it reads everywhere: a coloured pill for tags and statuses, plain text otherwise */
export function ValueLabel({ field, value }: { field?: string | null; value: string }) {
  const tone = toneOf(field, value);
  return tone ? <span className={styles.status} data-tone={tone}>{value}</span> : <>{value}</>;
}

