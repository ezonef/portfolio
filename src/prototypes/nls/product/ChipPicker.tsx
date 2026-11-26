"use client";

import { Minus, Search, X } from "lucide-react";
import { useState } from "react";
import { Avatar, CountryFlag, MenuRow } from "./ui";
import styles from "./product.module.css";

const initials = (v: string) => v.split(" ").map((w) => w[0]).join("");

/** How a field's values are drawn in the picker */
export const lookOf = (field: string | null | undefined) => (field === "buyer" ? "person" : field === "geo" ? "flag" : "plain") as "person" | "flag" | "plain";

/**
 * Picking several values, the same everywhere (selection bar, row menu, filters): what is picked sits
 * on top as chips with ×, the search types right after them, and the list below holds only what can
 * still be added. Backspace in an empty search takes off the last chip, Enter adds the first match.
 */
export function ChipPicker({
  options,
  chosen,
  onAdd,
  onRemove,
  look = "plain",
  tone,
  partial,
}: {
  options: string[];
  chosen: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  /** People get an avatar, countries their flag; tags and other coloured values a pill in their tone */
  look?: "person" | "flag" | "plain";
  tone?: (v: string) => string | undefined;
  /** Values only some of the items have: they stay in the list with a dash */
  partial?: (v: string) => boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rest = options.filter((v) => !chosen.includes(v) && v.toLowerCase().includes(q));
  const add = (v: string) => (onAdd(v), setQuery(""));
  const label = (v: string) => {
    const t = tone?.(v);
    return t ? <span className={styles.status} data-tone={t}>{v}</span> : v;
  };
  return (
    <>
      <div className={styles.chipField} onClick={(e) => e.currentTarget.querySelector("input")?.focus()}>
        {!chosen.length && <Search size={14} className={styles.chipFieldIcon} />}
        {chosen.map((v) => (
          <span key={v} className={styles.chip} data-tone={tone?.(v)}>
            {look === "person" && <Avatar text={initials(v)} size={16} />}
            {look === "flag" && <CountryFlag country={v} />}
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onRemove(v)}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={chosen.length ? "" : "Search..."}
          aria-label="Search"
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !query && chosen.length) onRemove(chosen[chosen.length - 1]);
            if (e.key === "Enter" && rest[0]) add(rest[0]);
          }}
        />
      </div>
      {rest.map((v) => (
        <MenuRow
          key={v}
          icon={look === "person" ? <Avatar text={initials(v)} size={20} /> : look === "flag" ? <CountryFlag country={v} /> : undefined}
          trailing={partial?.(v) ? <Minus size={14} aria-label="On some of the selected" /> : undefined}
          onClick={() => add(v)}
        >
          {label(v)}
        </MenuRow>
      ))}
      {!rest.length && <p className={styles.popEmpty}>{q ? "Nothing found" : "All added"}</p>}
    </>
  );
}
