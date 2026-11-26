"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { MenuRow, Popover } from "./ui";
import styles from "./product.module.css";

/**
 * The menu of saved setups, the same for filters and colour coding: search, ready-made ones and
 * the person's own, then at the bottom either "Save new" or, once a saved one was changed,
 * Update it, Reset to it, or Save as new. Saving asks for a name first (Enter saves, Esc goes back).
 */
export function SavedMenu({
  anchor,
  onClose,
  items,
  current,
  edited,
  canSave,
  nextName,
  saveLabel = "Save new",
  onPick,
  onSaveNew,
  onUpdate,
  onReset,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  /** Saved setups; `preset` ones are the product's own templates */
  items: { name: string; preset?: boolean }[];
  /** The saved one the current setup is exactly */
  current?: string;
  /** The saved one the setup started from, when it was changed since */
  edited?: string | null;
  /** Whether there is anything to save */
  canSave: boolean;
  nextName: () => string;
  saveLabel?: string;
  onPick: (name: string) => void;
  onSaveNew: (name: string) => void;
  onUpdate: () => void;
  onReset: () => void;
}) {
  const [query, setQuery] = useState("");
  const [naming, setNaming] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const groups = [
    { label: "Templates", list: items.filter((i) => i.preset) },
    { label: "Yours", list: items.filter((i) => !i.preset) },
  ].map((g) => ({ ...g, list: g.list.filter((i) => i.name.toLowerCase().includes(q)) }));
  const save = () => {
    onSaveNew(naming?.trim() || nextName());
    setNaming(null);
  };

  return (
    <Popover anchor={anchor} onClose={onClose} align="end" width={270}>
      <div className={styles.popSearch}>
        <Search size={14} />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." aria-label="Search saved" />
      </div>
      {groups.map((g) =>
        g.list.length ? (
          <div key={g.label}>
            <p className={styles.popLabel}>{g.label}</p>
            {g.list.map((i) => (
              <MenuRow key={i.name} selected={current === i.name} onClick={() => (onPick(i.name), onClose())}>
                {i.name}
              </MenuRow>
            ))}
          </div>
        ) : null,
      )}
      {groups.every((g) => !g.list.length) && <p className={styles.popEmpty}>Nothing found</p>}
      <hr className={styles.menuLine} />
      <div className={styles.savedFoot}>
        {naming !== null ? (
          <form className={styles.savedName} onSubmit={(e) => (e.preventDefault(), save())}>
            <input
              autoFocus
              className={styles.numInput}
              value={naming}
              onChange={(e) => setNaming(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setNaming(null))}
              aria-label="Name"
            />
            <button type="submit" className={styles.primaryBtn}>Save</button>
          </form>
        ) : edited ? (
          <>
            <button type="button" className={styles.primaryBtn} onClick={onUpdate}>
              <span className={styles.ellipsis}>Update “{edited}”</span>
            </button>
            <div className={styles.savedRow}>
              <button type="button" className={styles.secondaryBtn} onClick={onReset}>Reset</button>
              <button type="button" className={styles.secondaryBtn} onClick={() => setNaming(nextName())}>Save as new</button>
            </div>
          </>
        ) : (
          <button type="button" className={styles.primaryBtn} disabled={!canSave || !!current} onClick={() => setNaming(nextName())}>
            {saveLabel}
          </button>
        )}
      </div>
    </Popover>
  );
}
