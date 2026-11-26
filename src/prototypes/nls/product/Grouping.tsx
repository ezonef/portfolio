"use client";

import { ChevronDown, ChevronUp, LayoutDashboard, Layers, Plus, Trash2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { FIELDS, type FieldKey } from "./data";
import { FIELD_ICONS } from "./Filters";
import { MenuRow, Popover } from "./ui";
import styles from "./product.module.css";

export type GroupDir = 1 | -1;
export type GroupKey = FieldKey | "account";
/** One grouping level: the table groups by the first, then inside each group by the second */
export type GroupLevel = { key: GroupKey; dir: GroupDir };
export const MAX_GROUP_LEVELS = 2;

export const GROUPS: { key: GroupKey; label: string; icon: ReactNode }[] = [
  { key: "account", label: "Account", icon: <LayoutDashboard size={16} /> },
  ...FIELDS.map((f) => ({ key: f.key, label: f.label, icon: FIELD_ICONS[f.key] })),
];
const DIRS: { value: GroupDir; label: string }[] = [
  { value: 1, label: "Ascending" },
  { value: -1, label: "Descending" },
];
const labelOf = (key: GroupKey) => GROUPS.find((g) => g.key === key)!.label;

type Sub = { el: HTMLElement; kind: "field" | "dir"; index: number };

export function GroupControl({ levels, onChange }: { levels: GroupLevel[]; onChange: (levels: GroupLevel[]) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [sub, setSub] = useState<Sub | null>(null);
  // A level that was added but has no field yet
  const [draft, setDraft] = useState(false);
  // Closing a dropdown keeps the panel open when the press landed on the panel or was Esc
  const keepPanel = useRef(false);
  const holdPanel = () => {
    keepPanel.current = true;
    setTimeout(() => (keepPanel.current = false), 0);
  };
  const closeAll = () => {
    setSub(null);
    setAnchor(null);
    setDraft(false);
  };
  const toggleSub = (el: HTMLElement, kind: Sub["kind"], index: number) =>
    setSub(sub?.kind === kind && sub.index === index ? null : { el, kind, index });

  // Rows on screen: the levels, plus one empty row while adding or when nothing is grouped
  const rows: (GroupLevel | null)[] = [...levels, ...(draft || !levels.length ? [null] : [])];
  const setField = (index: number, key: GroupKey) => {
    if (index >= levels.length) {
      onChange([...levels, { key, dir: 1 }]);
      setDraft(false);
    } else onChange(levels.map((l, i) => (i === index ? { ...l, key } : l)));
  };
  const remove = (index: number) => {
    if (index >= levels.length) setDraft(false);
    else onChange(levels.filter((_, i) => i !== index));
  };
  const canAdd = levels.length > 0 && rows.length < MAX_GROUP_LEVELS;

  return (
    <>
      <button
        type="button"
        className={`${styles.groupBtn} ${styles.glass}`}
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        onClick={(e) => (anchor ? closeAll() : setAnchor(e.currentTarget))}
      >
        <Layers size={16} />
        {levels.length ? `Group: ${levels.map((l) => labelOf(l.key)).join(" → ")}` : "Group"}
      </button>

      {anchor && (
        <Popover anchor={anchor} onClose={() => !sub && closeAll()} width={460}>
          <div className={styles.groupPanel} role="dialog" aria-label="Grouping" onPointerDownCapture={holdPanel}>
            <p>Group by</p>
            {rows.map((level, i) => {
              const current = level ? GROUPS.find((g) => g.key === level.key) : undefined;
              const open = (kind: Sub["kind"]) => sub?.kind === kind && sub.index === i;
              return (
                <div key={i} className={styles.groupLevel}>
                  <span className={styles.groupStep}>{i === 0 ? "1" : "2"}</span>
                  <button type="button" className={styles.select} data-open={open("field") || undefined} data-empty={!current || undefined} aria-haspopup="listbox" aria-expanded={open("field")} aria-label={`Level ${i + 1}: field`} onClick={(e) => toggleSub(e.currentTarget, "field", i)}>
                    <span>{current?.icon}{current?.label ?? "Choose a field"}</span>
                    {open("field") ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button type="button" className={styles.select} data-open={open("dir") || undefined} disabled={!level} aria-haspopup="listbox" aria-expanded={open("dir")} aria-label={`Level ${i + 1}: order`} onClick={(e) => toggleSub(e.currentTarget, "dir", i)}>
                    <span>{DIRS.find((d) => d.value === (level?.dir ?? 1))!.label}</span>
                    {open("dir") ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button type="button" className={styles.iconBtn} disabled={!level && i === 0} aria-label={`Remove level ${i + 1}`} onClick={() => remove(i)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
            {canAdd && (
              <button type="button" className={styles.ghostBtn} onClick={() => setDraft(true)}>
                <Plus size={15} /> Add level
              </button>
            )}
          </div>
        </Popover>
      )}

      {sub && (
        <div style={{ display: "contents" }} onKeyDownCapture={(e) => e.key === "Escape" && holdPanel()}>
          <Popover
            anchor={sub.el}
            width={sub.el.offsetWidth}
            onClose={() => {
              setSub(null);
              if (!keepPanel.current) closeAll();
            }}
          >
            {sub.kind === "field"
              ? GROUPS.filter((g) => !levels.some((l, i) => i !== sub.index && l.key === g.key)).map((g) => (
                  <MenuRow key={g.key} icon={g.icon} selected={levels[sub.index]?.key === g.key} onClick={() => (setField(sub.index, g.key), setSub(null))}>
                    {g.label}
                  </MenuRow>
                ))
              : DIRS.map((d) => (
                  <MenuRow key={d.value} selected={levels[sub.index]?.dir === d.value} onClick={() => (onChange(levels.map((l, i) => (i === sub.index ? { ...l, dir: d.value } : l))), setSub(null))}>
                    {d.label}
                  </MenuRow>
                ))}
          </Popover>
        </div>
      )}
    </>
  );
}
