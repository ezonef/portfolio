"use client";

import { ArrowDownNarrowWide, ArrowLeftToLine, ArrowRightToLine, ArrowUpNarrowWide, ChevronsUpDown, Ellipsis, Eye, EyeOff } from "lucide-react";
import { useState, type PointerEvent, type ReactNode } from "react";
import { useColumnDrag } from "../../useColumnDrag";
import { Checkbox, MenuRow, Popover } from "./ui";
import { SelectionBar } from "./SelectionBar";
import styles from "./product.module.css";

export type Column<T> = {
  key: string;
  label: string;
  width?: number;
  render: (row: T) => ReactNode;
  /** What the column sorts by; without it the header menu has no sorting */
  sort?: (row: T) => number | string;
};

const CHECK = 44;
const MORE = 44;
const MIN = 64;
const FIRST_MIN = 240;

/**
 * The NLS table as one component, so every screen follows the same rules:
 * checkboxes and the row menu appear on hover, columns are dragged by their header
 * and resized by its right edge, and the header keeps the normal cursor.
 * The first column takes the free width until someone resizes it.
 */
export function DataTable<T>({
  rows,
  rowId,
  columns,
  label,
  menu,
  onRowClick,
  bulk,
  selectable = true,
}: {
  rows: T[];
  rowId: (row: T) => string;
  columns: Column<T>[];
  /** What the rows are, for the select-all checkbox */
  label: string;
  /** Items of the row's ⋯ menu; `close` hides the menu */
  menu?: (row: T, close: () => void) => ReactNode;
  onRowClick?: (row: T) => void;
  /** The selection bar for the picked rows: a `SelectionBar` with this screen's actions; `clear` unpicks them */
  bulk?: (picked: T[], clear: () => void) => ReactNode;
  /** Rows can be picked with checkboxes and acted on from the bar; off for tables inside widgets */
  selectable?: boolean;
}) {
  const [order, setOrder] = useState(() => columns.map((c) => c.key));
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<{ el: HTMLElement; id: string } | null>(null);
  // Header menu: sort, move or hide a column
  const [head, setHead] = useState<{ el: HTMLElement; key: string } | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const drag = useColumnDrag<string>(setOrder);

  const first = columns[0].key;
  const cols = order.filter((k) => !hidden.has(k)).map((k) => columns.find((c) => c.key === k)!).filter(Boolean);
  const sortBy = sort ? columns.find((c) => c.key === sort.key)?.sort : undefined;
  const shownRows = sortBy && sort ? [...rows].sort((a, b) => { const x = sortBy(a), y = sortBy(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; }) : rows;
  const moveCol = (key: string, to: "start" | "end") => setOrder((o) => (to === "start" ? [key, ...o.filter((k) => k !== key)] : [...o.filter((k) => k !== key), key]));
  const widthOf = (c: Column<T>) => widths[c.key] ?? (c.key === first ? undefined : c.width);
  const minWidth = (selectable ? CHECK : 0) + (menu ? MORE : 0) + cols.reduce((n, c) => n + (widthOf(c) ?? FIRST_MIN), 0);
  const filler = widths[first] !== undefined;
  const ids = rows.map(rowId);
  const all = picked.size > 0 && ids.every((id) => picked.has(id));
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const startResize = (e: PointerEvent<HTMLElement>, key: string) => {
    e.stopPropagation();
    if (e.button !== 0 || e.pointerType === "touch") return;
    e.preventDefault();
    const th = e.currentTarget.closest("th")!;
    const scale = th.getBoundingClientRect().width / th.offsetWidth || 1;
    const from = th.offsetWidth;
    const x = e.clientX;
    const move = (ev: globalThis.PointerEvent) => setWidths((w) => ({ ...w, [key]: Math.max(key === first ? 160 : MIN, Math.round(from + (ev.clientX - x) / scale)) }));
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setResizing(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    setResizing(key);
  };
  const handle = (c: Column<T>) => (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Width of column “${c.label}”`}
      tabIndex={0}
      className={styles.colResize}
      data-on={resizing === c.key || undefined}
      onPointerDown={(e) => startResize(e, c.key)}
      onDoubleClick={() => setWidths(({ [c.key]: _, ...rest }) => (void _, rest))}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const th = e.currentTarget.closest("th")!;
        setWidths((w) => ({ ...w, [c.key]: Math.max(MIN, th.offsetWidth + (e.key === "ArrowRight" ? 8 : -8)) }));
      }}
    />
  );
  const current = open ? rows.find((r) => rowId(r) === open.id) : undefined;

  return (
    <>
      <table className={styles.table} style={{ minWidth }} data-picking={picked.size > 0 || undefined}>
        <colgroup>
          {selectable && <col style={{ width: CHECK }} />}
          {cols.map((c) => <col key={c.key} style={widthOf(c) ? { width: widthOf(c) } : undefined} />)}
          {filler && <col />}
          {menu && <col style={{ width: MORE }} />}
        </colgroup>
        <thead>
          <tr>
            {selectable && (
              <th className={styles.tdCheck}>
                <Checkbox state={all ? true : picked.size ? "mixed" : false} label={`Select all: ${label}`} onChange={() => setPicked(all ? new Set() : new Set(ids))} />
              </th>
            )}
            {cols.map((c) => (
              <th key={c.key} {...drag.head(c.key)}>
                <button type="button" className={styles.colBtn} data-active={head?.key === c.key || undefined} aria-haspopup="menu" onClick={(e) => setHead({ el: e.currentTarget, key: c.key })}>
                  <span>{c.label}</span>
                  {sort?.key === c.key ? sort.dir === 1 ? <ArrowUpNarrowWide size={13} /> : <ArrowDownNarrowWide size={13} /> : <ChevronsUpDown size={13} className={styles.colHint} />}
                </button>
                {handle(c)}
              </th>
            ))}
            {filler && <th />}
            {menu && <th />}
          </tr>
        </thead>
        <tbody>
          {shownRows.map((r) => {
            const id = rowId(r);
            return (
              <tr key={id} data-picked={picked.has(id) || undefined} className={onRowClick ? styles.linkRow : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {selectable && (
                  <td className={styles.tdCheck} onClick={(e) => e.stopPropagation()}>
                    <Checkbox state={picked.has(id)} label={`Select row ${ids.indexOf(id) + 1}`} onChange={() => toggle(id)} />
                  </td>
                )}
                {cols.map((c) => (
                  <td key={c.key} {...drag.cell(c.key)} data-name={c.key === first || undefined}>{c.render(r)}</td>
                ))}
                {filler && <td />}
                {menu && (
                  <td className={styles.tdMore} onClick={(e) => e.stopPropagation()}>
                    <button type="button" className={styles.rowMore} data-open={open?.id === id || undefined} aria-label="Row actions" onClick={(e) => setOpen({ el: e.currentTarget, id })}>
                      <Ellipsis size={16} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Every table uses the same selection bar; a screen passes its own actions to it */}
      {selectable && picked.size > 0 &&
        (bulk ? bulk(rows.filter((r) => picked.has(rowId(r))), () => setPicked(new Set())) : <SelectionBar count={picked.size} onClear={() => setPicked(new Set())} />)}
      {head && (() => {
        const c = columns.find((x) => x.key === head.key)!;
        const done = () => setHead(null);
        return (
          <Popover anchor={head.el} onClose={done} width={230}>
            {c.sort && (
              <>
                <MenuRow icon={<ArrowUpNarrowWide size={16} />} selected={sort?.key === c.key && sort.dir === 1} onClick={() => (setSort(sort?.key === c.key && sort.dir === 1 ? null : { key: c.key, dir: 1 }), done())}>Ascending</MenuRow>
                <MenuRow icon={<ArrowDownNarrowWide size={16} />} selected={sort?.key === c.key && sort.dir === -1} onClick={() => (setSort(sort?.key === c.key && sort.dir === -1 ? null : { key: c.key, dir: -1 }), done())}>Descending</MenuRow>
                <hr className={styles.menuLine} />
              </>
            )}
            <MenuRow icon={<ArrowLeftToLine size={16} />} disabled={cols[0]?.key === c.key} onClick={() => (moveCol(c.key, "start"), done())}>Move to start</MenuRow>
            <MenuRow icon={<ArrowRightToLine size={16} />} disabled={cols[cols.length - 1]?.key === c.key} onClick={() => (moveCol(c.key, "end"), done())}>Move to end</MenuRow>
            <hr className={styles.menuLine} />
            <MenuRow icon={<EyeOff size={16} />} disabled={c.key === first} onClick={() => (setHidden((h) => new Set(h).add(c.key)), done())}>Hide column</MenuRow>
            {hidden.size > 0 && <MenuRow icon={<Eye size={16} />} onClick={() => (setHidden(new Set()), done())}>Show hidden · {hidden.size}</MenuRow>}
          </Popover>
        );
      })()}
      {open && current && menu && (
        <Popover anchor={open.el} onClose={() => setOpen(null)} align="end" width={220}>
          {menu(current, () => setOpen(null))}
        </Popover>
      )}
    </>
  );
}
