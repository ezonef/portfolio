"use client";

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { ConditionGroup, cond, groupResult, metricCond, newId, type Cond, type FieldDef, type MetricKey } from "./Conditions";
import { FIELDS } from "./data";
import { MenuRow, Popover, dragPanel, dragReorder } from "./ui";
import { SavedMenu } from "./SavedMenu";
import styles from "./product.module.css";

export type PaintCol = "budget" | "spend" | "purchases" | "cpa" | "roas";
/** A colour as #rrggbb: cells get it as text and a light fill of it as background */
export type Tone = string;
/** Paints a column's cells when the row meets the conditions, written the same way as the filter */
export type PaintRule = { id: number; col: PaintCol; conds: Cond[]; tone: Tone };
/** Simple mode: one metric, a colour above one value and a colour below another */
export type SimpleRow = { id: number; col: PaintCol; above: string; aboveColor: Tone; below: string; belowColor: Tone };
export type PaintState = { mode: "simple" | "advanced"; simple: SimpleRow[]; rules: PaintRule[] };
/** Where the rules came from: a template applied to the whole table, or rules someone changed by hand */
/** Where the rules came from: a template as it is, or rules changed by hand (from a template, if one was applied) */
export type PaintSource = { kind: "template"; name: string } | { kind: "custom"; from?: string };
export type PaintTemplate = { name: string; build: () => PaintState };

export const PAINT_COLS: { key: PaintCol; label: string }[] = [
  { key: "budget", label: "Budget" },
  { key: "spend", label: "Spend" },
  { key: "purchases", label: "Purchases" },
  { key: "cpa", label: "CPA" },
  { key: "roas", label: "ROAS" },
];
const PALETTE: { hex: string; name: string }[] = [
  { hex: "#d93d3d", name: "Red" },
  { hex: "#e8590c", name: "Orange" },
  { hex: "#c98200", name: "Yellow" },
  { hex: "#2f9e44", name: "Green" },
  { hex: "#0c8599", name: "Teal" },
  { hex: "#3c6fd8", name: "Blue" },
  { hex: "#7048e8", name: "Indigo" },
  { hex: "#9a3fe3", name: "Purple" },
  { hex: "#c2255c", name: "Raspberry" },
  { hex: "#5d5d66", name: "Grey" },
];
export const colorName = (hex: string) => PALETTE.find((p) => p.hex === hex.toLowerCase())?.name ?? hex.toUpperCase();
/** Cell colours for a rule's colour: the colour itself for text, a light fill of it behind */
export const paintStyle = (hex?: string) => (hex ? { background: `${hex}1f`, color: hex } : undefined);

const rule = (col: PaintCol, op: "gt" | "lt" | "eq", value: string, tone: Tone): PaintRule => ({ id: newId(), col, conds: [metricCond(col as MetricKey, op, value)], tone });
const row = (col: PaintCol, above: string, aboveColor: Tone, below: string, belowColor: Tone): SimpleRow => ({ id: newId(), col, above, aboveColor, below, belowColor });
/** The rules a simple row stands for: above first, then below */
export const simpleRules = (rows: SimpleRow[]): PaintRule[] =>
  rows.flatMap((r) => [
    ...(r.above.trim() ? [rule(r.col, "gt", r.above, r.aboveColor)] : []),
    ...(r.below.trim() ? [rule(r.col, "lt", r.below, r.belowColor)] : []),
  ]);
export const paintRules = (s: PaintState) => (s.mode === "simple" ? simpleRules(s.simple) : s.rules);
const fromRows = (rows: SimpleRow[], mode: PaintState["mode"] = "simple"): PaintState => ({ mode, simple: rows, rules: simpleRules(rows) });
export const PAINT_TEMPLATES: PaintTemplate[] = [
  {
    name: "Efficiency",
    build: () => fromRows([row("cpa", "100", "#d93d3d", "80", "#2f9e44"), row("roas", "5", "#2f9e44", "2", "#d93d3d")]),
  },
  { name: "Risks only", build: () => fromRows([row("cpa", "100", "#d93d3d", "", "#2f9e44"), row("roas", "", "#2f9e44", "2", "#d93d3d"), row("spend", "1500", "#c98200", "", "#2f9e44")]) },
  { name: "No highlights", build: () => fromRows([]) },
];
export const DEFAULT_TEMPLATE = PAINT_TEMPLATES[0];

/** The first rule of a column whose conditions the row meets decides the cell's colour */
export function toneFor(rules: PaintRule[], col: string, values: (k: string) => string[], metric: (k: MetricKey) => number): Tone | undefined {
  return rules.find((r) => r.col === col && groupResult(r.conds, values, metric) === true)?.tone;
}
export const sourceLabel = (s: PaintSource) => (s.kind === "template" ? `Template “${s.name}” · applied to all` : s.from ? `Template “${s.from}” · edited` : "Custom");

type Open =
  | { el: HTMLElement; kind: "template" }
  | { el: HTMLElement; kind: "col" | "tone"; id: number }
  | { el: HTMLElement; kind: "scol"; id: number }
  | { el: HTMLElement; kind: "stone"; id: number; side: "above" | "below" };

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <div className={styles.colorPicker}>
      <div className={styles.palette} role="group" aria-label="Palette">
        {PALETTE.map((c) => (
          <button key={c.hex} type="button" aria-label={c.name} title={c.name} aria-pressed={value.toLowerCase() === c.hex} style={{ background: c.hex }} onClick={() => (setDraft(c.hex), onChange(c.hex))} />
        ))}
      </div>
      <label className={styles.hexField}>
        <i style={{ background: /^#[0-9a-f]{6}$/i.test(draft) ? draft : value }} />
        <input
          value={draft}
          maxLength={7}
          aria-label="Custom colour, HEX"
          onChange={(e) => {
            const v = `#${e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 6)}`;
            setDraft(v);
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
          }}
        />
      </label>
    </div>
  );
}

export function ColorRules({
  anchor,
  value,
  source,
  onValue,
  onTemplate,
  templates,
  onSaveTemplate,
  onSaveAsTemplate,
  presets = [],
  col,
  onClose,
}: {
  /** The panel opens next to what it changes: the column's header or the table's button */
  anchor: HTMLElement;
  value: PaintState;
  source: PaintSource;
  onValue: (value: PaintState) => void;
  onTemplate: (name: string) => void;
  templates: PaintTemplate[];
  /** Writes the current rules back into the template they came from */
  onSaveTemplate: () => void;
  /** Keeps the current rules as a new template under this name */
  onSaveAsTemplate: (name: string) => void;
  /** Names of the product's own templates, listed apart from the person's */
  presets?: string[];
  /** Opened from a column's menu: only that column's rules are shown */
  col?: PaintCol;
  onClose: () => void;
}) {
  const rules = value.rules;
  const onChange = (next: PaintRule[]) => onValue({ ...value, rules: next });
  const setRows = (simple: SimpleRow[]) => onValue({ ...value, simple });
  const patchRow = (id: number, p: Partial<SimpleRow>) => setRows(value.simple.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const rowsShown = col ? value.simple.filter((r) => r.col === col) : value.simple;
  const [open, setOpen] = useState<Open | null>(null);
  // Conditions report their open dropdowns; the panel no longer needs it, popovers know their own nesting
  const onBusy = useCallback(() => {}, []);
  const fields: FieldDef[] = FIELDS;
  const close = () => setOpen(null);
  const show = (next: Open) => setOpen(open?.el === next.el ? null : next);
  const shown = col ? rules.filter((r) => r.col === col) : rules;
  const current = open && "id" in open ? rules.find((r) => r.id === open.id) : undefined;
  const patch = (id: number, p: Partial<PaintRule>) => onChange(rules.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const chevron = (kind: string, id?: number) => (open?.kind === kind && (id === undefined || ("id" in open && open.id === id)) ? <ChevronUp size={15} /> : <ChevronDown size={15} />);
  const colLabel = (c: PaintCol) => PAINT_COLS.find((x) => x.key === c)!.label;

  return (
    <>
    <Popover anchor={anchor} onClose={onClose} width={760} align="end" draggable className={`${styles.filters} ${styles.paintPop}`}>
    <section className={styles.paintSection} aria-label="Colour coding">
      <header className={styles.filterHead} onPointerDown={dragPanel}>
        <div className={styles.paintTitle}>
          <h3>Colour coding{col ? ` · ${colLabel(col)}` : ""}</h3>
          <small data-custom={source.kind === "custom" || undefined}>{sourceLabel(source)}</small>
        </div>
        <div className={styles.seg} role="group" aria-label="Colour coding mode">
          {(["simple", "advanced"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={value.mode === m} onClick={() => (close(), onValue({ ...value, mode: m, rules: m === "advanced" && value.mode === "simple" && !value.rules.length ? simpleRules(value.simple) : value.rules }))}>
              {m === "simple" ? "Simple" : "Advanced"}
            </button>
          ))}
        </div>
        <button type="button" className={styles.select} onClick={(e) => show({ el: e.currentTarget, kind: "template" })}>
          {/* The picked template names the button; changed after picking, it says so */}
          <span>{source.kind === "template" ? source.name : source.from ? `${source.from} · edited` : "Templates"}</span> {chevron("template")}
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Close colour coding" onClick={onClose}>
          <X size={16} />
        </button>
      </header>

      {value.mode === "simple" ? (
        <div className={styles.rules}>
          {rowsShown.map((r) => (
            <div key={r.id} className={styles.simplePaint} data-reorder-row>
              <button type="button" className={styles.grip} aria-label="Drag metric" onPointerDown={(e) => dragReorder(e, value.simple, rowsShown, r.id, setRows)}>
                <GripVertical size={15} />
              </button>
              <button type="button" className={styles.select} disabled={!!col} onClick={(e) => show({ el: e.currentTarget, kind: "scol", id: r.id })}>
                <span>{colLabel(r.col)}</span> {!col && <ChevronDown size={15} />}
              </button>
              {(["above", "below"] as const).map((side) => (
                <span key={side} className={styles.simpleSide}>
                  <span>{side === "above" ? "above" : "below"}</span>
                  <input
                    className={styles.numInput}
                    inputMode="decimal"
                    placeholder="Value"
                    value={side === "above" ? r.above : r.below}
                    aria-label={`${colLabel(r.col)}: ${side === "above" ? "above" : "below"}`}
                    onChange={(e) => patchRow(r.id, { [side]: e.target.value.replace(/[^\d.,]/g, "") })}
                  />
                  <button type="button" className={styles.select} aria-label="Colour" onClick={(e) => show({ el: e.currentTarget, kind: "stone", id: r.id, side })}>
                    <span><i className={styles.swatch} style={{ background: side === "above" ? r.aboveColor : r.belowColor }} /></span> <ChevronDown size={15} />
                  </button>
                </span>
              ))}
              <button type="button" className={styles.iconBtn} aria-label="Remove metric" onClick={() => (close(), setRows(value.simple.filter((x) => x.id !== r.id)))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!rowsShown.length && <p className={styles.popEmpty}>Add a metric or pick a template.</p>}
        </div>
      ) : (
      <div className={styles.advList}>
        {shown.map((r) => (
          <div key={r.id} className={styles.paintRule} data-reorder-row>
            <div className={styles.paintRuleHead}>
              <button type="button" className={styles.grip} aria-label="Drag rule" onPointerDown={(e) => dragReorder(e, rules, shown, r.id, onChange)}>
                <GripVertical size={15} />
              </button>
              <span>Colour</span>
              <button type="button" className={styles.select} disabled={!!col} onClick={(e) => show({ el: e.currentTarget, kind: "col", id: r.id })}>
                <span>{colLabel(r.col)}</span> {!col && chevron("col", r.id)}
              </button>
              <span>in</span>
              <button type="button" className={styles.select} aria-label="Colour" onClick={(e) => show({ el: e.currentTarget, kind: "tone", id: r.id })}>
                <span><i className={styles.swatch} style={{ background: r.tone }} /> {colorName(r.tone)}</span> {chevron("tone", r.id)}
              </button>
              <i />
              <button type="button" className={styles.iconBtn} aria-label="Delete rule" onClick={() => (close(), onChange(rules.filter((x) => x.id !== r.id)))}>
                <Trash2 size={16} />
              </button>
            </div>
            <ConditionGroup
              conds={r.conds}
              fields={fields}
              onBusy={onBusy}
              onChange={(conds) => onChange(conds.length ? rules.map((x) => (x.id === r.id ? { ...x, conds } : x)) : rules.filter((x) => x.id !== r.id))}
            />
          </div>
        ))}
        {!shown.length && <p className={styles.popEmpty}>No rules yet. Add the first one or pick a template.</p>}
      </div>
      )}

      <footer className={styles.filterFoot}>
        {value.mode === "simple" ? (
          <button type="button" className={styles.ghostBtn} onClick={() => setRows([...value.simple, row(col ?? "cpa", "", "#d93d3d", "", "#2f9e44")])}>
            <Plus size={15} /> Add metric
          </button>
        ) : (
          <button type="button" className={styles.ghostBtn} onClick={() => onChange([...rules, { id: newId(), col: col ?? "cpa", conds: [col ? metricCond(col, "gt", "") : cond()], tone: "#d93d3d" }])}>
            <Plus size={15} /> Add rule
          </button>
        )}
        <span className={styles.footHint}>{value.mode === "advanced" ? "When several rules match, the top one wins" : ""}</span>
        <button
          type="button"
          className={styles.ghostBtn}
          disabled={value.mode === "simple" ? !rowsShown.length : !shown.length}
          onClick={() => (close(), value.mode === "simple" ? setRows(col ? value.simple.filter((r) => r.col !== col) : []) : onChange(col ? rules.filter((r) => r.col !== col) : []))}
        >
          Clear
        </button>
      </footer>
    </section>
    </Popover>

      {open?.kind === "template" && (
        // The same saved menu as filters: pick, save new, or update, reset and copy an edited template
        <SavedMenu
          anchor={open.el}
          onClose={close}
          items={templates.map((t) => ({ name: t.name, preset: presets.includes(t.name) }))}
          current={source.kind === "template" ? source.name : undefined}
          edited={source.kind === "custom" ? source.from ?? null : null}
          canSave={value.mode === "simple" ? value.simple.length > 0 : value.rules.length > 0}
          nextName={() => {
            let n = 1;
            while (templates.some((t) => t.name === `My template ${n}`)) n++;
            return `My template ${n}`;
          }}
          saveLabel="Save new template"
          onPick={onTemplate}
          onSaveNew={onSaveAsTemplate}
          onUpdate={onSaveTemplate}
          onReset={() => source.kind === "custom" && source.from && onTemplate(source.from)}
        />
      )}
      {open?.kind === "col" && current && (
        <Popover anchor={open.el} onClose={close} width={180}>
          {PAINT_COLS.map((c) => (
            <MenuRow key={c.key} selected={current.col === c.key} onClick={() => (patch(current.id, { col: c.key }), close())}>{c.label}</MenuRow>
          ))}
        </Popover>
      )}
      {open?.kind === "scol" && (
        <Popover anchor={open.el} onClose={close} width={180}>
          {PAINT_COLS.map((c) => (
            <MenuRow key={c.key} selected={value.simple.find((r) => r.id === open.id)?.col === c.key} onClick={() => (patchRow(open.id, { col: c.key }), close())}>{c.label}</MenuRow>
          ))}
        </Popover>
      )}
      {open?.kind === "stone" && (
        <Popover anchor={open.el} onClose={close} align="end" width={248}>
          <ColorPicker
            value={(open.side === "above" ? value.simple.find((r) => r.id === open.id)?.aboveColor : value.simple.find((r) => r.id === open.id)?.belowColor) ?? "#d93d3d"}
            onChange={(hex) => patchRow(open.id, open.side === "above" ? { aboveColor: hex } : { belowColor: hex })}
          />
        </Popover>
      )}
      {open?.kind === "tone" && current && (
        <Popover anchor={open.el} onClose={close} align="end" width={248}>
          <ColorPicker value={current.tone} onChange={(hex) => patch(current.id, { tone: hex })} />
        </Popover>
      )}
    </>
  );
}
