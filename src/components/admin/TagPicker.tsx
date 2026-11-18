"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import styles from "./TagPicker.module.css";

type Props = {
  value: string[];
  /** Everything you can pick from */
  options: string[];
  onChange: (value: string[]) => void;
  /** false = pick exactly one (Category) */
  multiple?: boolean;
  /** Allow typing a new option (Tags) */
  creatable?: boolean;
  /** Display text per option id, e.g. "ds" → "Design system" */
  labels?: Record<string, string>;
  placeholder?: string;
  label: string;
};

/** Notion-style select: gray Tag pills with ×, type to filter, Enter to pick or create. */
export function TagPicker({ value, options, onChange, multiple = true, creatable = false, labels, placeholder, label }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  /** Tag being renamed in place, and its draft text */
  const [editing, setEditing] = useState<{ from: string; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const text = (id: string) => labels?.[id] ?? id;

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => options.filter((o) => !(multiple && value.includes(o)) && text(o).toLowerCase().includes(q)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, value, q, multiple, labels],
  );
  const canCreate = creatable && q !== "" && !options.some((o) => text(o).toLowerCase() === q) && !value.some((v) => v.toLowerCase() === q);
  const items = [...matches.map((o) => ({ id: o, create: false })), ...(canCreate ? [{ id: query.trim(), create: true }] : [])];

  const pick = (id: string) => {
    if (multiple) onChange(value.includes(id) ? value : [...value, id]);
    else onChange([id]);
    setQuery("");
    setActive(0);
    if (!multiple) setOpen(false);
  };
  /** Rename a tag where it is — keeps its position. Empty or duplicate text leaves it as it was. */
  const commitEdit = () => {
    if (!editing) return;
    const next = editing.text.trim();
    if (next && next !== editing.from && !value.some((v) => v.toLowerCase() === next.toLowerCase() && v !== editing.from)) {
      onChange(value.map((v) => (v === editing.from ? next : v)));
    }
    setEditing(null);
  };
  const remove = (id: string) => {
    if (!multiple) return; // a single select always keeps one value
    onChange(value.filter((v) => v !== id));
  };

  return (
    <div
      className={styles.picker}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div className={styles.box} data-open={open || undefined} onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          input.current?.focus();
          setOpen(true);
        }
      }}>
        {value.map((v) =>
          editing?.from === v ? (
            <input
              key={v}
              className={`${styles.pill} ${styles.pillInput}`}
              value={editing.text}
              size={Math.max(2, editing.text.length)}
              aria-label={`Rename ${text(v)}`}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setEditing({ from: v, text: e.target.value })}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEdit();
                  input.current?.focus();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(null);
                }
              }}
            />
          ) : (
          <span key={v} className={styles.pill}>
            {text(v)}
            {creatable && (
              <button
                type="button"
                className={`${styles.remove} ${styles.edit}`}
                aria-label={`Rename ${text(v)}`}
                title="Rename"
                onClick={() => setEditing({ from: v, text: v })}
              >
                <Icon name="pencil" size={12} />
              </button>
            )}
            {multiple && (
              <button type="button" className={styles.remove} aria-label={`Remove ${text(v)}`} onClick={() => remove(v)}>
                <Icon name="x" size={14} />
              </button>
            )}
          </span>
          ),
        )}
        <input
          ref={input}
          className={styles.input}
          value={query}
          aria-label={label}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          placeholder={value.length ? "" : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(items.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" || (e.key === "," && creatable)) {
              e.preventDefault();
              const item = items[active];
              if (item) pick(item.id);
            } else if (e.key === "Backspace" && query === "" && value.length) {
              remove(value[value.length - 1]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className={styles.menu}>
          <li className={`mono-xs ${styles.menuHint}`}>{multiple ? "Select an option or create one" : "Select an option"}</li>
          {items.map((item, i) => (
            <li key={(item.create ? "+" : "") + item.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={styles.option}
                data-active={i === active || undefined}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(item.id)}
              >
                {item.create && <span className={`mono-xs ${styles.create}`}>Create</span>}
                <span className={styles.pill}>
                  {text(item.id)}
                </span>
                {!multiple && value[0] === item.id && <Icon name="check" className={styles.check} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
