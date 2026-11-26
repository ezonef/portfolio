"use client";

import { BarChart3, LayoutDashboard, LayoutGrid, Plus, Search, Sparkles, Star, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DataTable } from "./DataTable";
import { Avatar, FilterButton, Layer, MenuRow } from "./ui";
import { Filters, activeCount, emptyFilter, matches, type FieldDef, type FilterState } from "./Filters";
import type { Leaf } from "./data";
import { SelectionBar, TagList, applyChanges } from "./SelectionBar";
import styles from "./product.module.css";

export type Template = "stats" | "team" | "simple" | "budget" | "daily" | "launches" | "blank";
export type OpenDash = { id: string; title: string; template: Template; account: string | null };

type Category = "popular" | "stats" | "team" | "creatives" | "blank";
const CATEGORIES: { id: Category; label: string; icon: ReactNode }[] = [
  { id: "popular", label: "Popular", icon: <Star size={16} /> },
  { id: "stats", label: "Statistics", icon: <BarChart3 size={16} /> },
  { id: "team", label: "Team", icon: <Users size={16} /> },
  { id: "creatives", label: "Creatives", icon: <Sparkles size={16} /> },
  { id: "blank", label: "From scratch", icon: <LayoutGrid size={16} /> },
];
type Preview = "kpi" | "bars" | "people" | "blank";
export const TEMPLATES: { id: Template; title: string; hint: string; tone: string; preview: Preview; tags: Category[] }[] = [
  { id: "stats", title: "Account statistics", hint: "Spend, ROI, CPA and creatives of one account", tone: "accent", preview: "kpi", tags: ["popular", "stats"] },
  { id: "team", title: "Buyer team", hint: "Who launched what, and what worked", tone: "info", preview: "people", tags: ["popular", "team"] },
  { id: "simple", title: "Simple dashboard", hint: "Two metrics and a chart, nothing extra", tone: "good", preview: "bars", tags: ["popular", "stats", "creatives"] },
  { id: "budget", title: "Budget overview", hint: "What is left, how money moved and where it went", tone: "warm", preview: "kpi", tags: ["popular", "stats"] },
  { id: "daily", title: "Daily performance", hint: "Today's numbers with their week, top creatives and buyers", tone: "info", preview: "bars", tags: ["popular", "stats", "creatives"] },
  { id: "launches", title: "Launch plan", hint: "What goes live and when, with a calendar", tone: "good", preview: "people", tags: ["team", "creatives"] },
  { id: "blank", title: "Empty dashboard", hint: "Build your own set of widgets", tone: "muted", preview: "blank", tags: ["blank"] },
];

const ALL_ACCOUNTS = "All accounts";
/** Tags of the dashboard list, each with its colour */
const DASH_TAGS = ["Report", "Team", "Creatives", "Budget"];
const DASH_TONE: Record<string, string> = { Report: "info", Team: "good", Creatives: "muted", Budget: "bad" };

export const SAVED: (OpenDash & { updated: string; owner: string; tag?: string[] })[] = [
  { id: "d1", title: "Weekly report", template: "stats", account: "Account 4821", updated: "20.11", owner: "AF", tag: ["Report"] },
  { id: "d2", title: "Buyers · Poland", template: "team", account: null, updated: "18.11", owner: "IV", tag: ["Team"] },
  { id: "d3", title: "TikTok creatives", template: "simple", account: "Account 1954", updated: "17.11", owner: "MI", tag: ["Creatives"] },
  { id: "d4", title: "Budget overview", template: "budget", account: null, updated: "24.11", owner: "AF", tag: ["Budget", "Report"] },
  { id: "d5", title: "Daily performance", template: "daily", account: null, updated: "24.11", owner: "IV" },
  { id: "d6", title: "Launch plan · November", template: "launches", account: null, updated: "23.11", owner: "MI" },
];

/** The dashboards the team already made. New ones start from the template picker */
export function DashboardList({ onOpen, onCreate, ai }: { onOpen: (d: OpenDash) => void; onCreate: () => void; ai?: { open: boolean; onToggle: () => void } }) {
  const [list, setList] = useState(SAVED);
  // The same filter panel as every table, with what a dashboard has: tags and the account it shows
  const fields: FieldDef[] = [
    { key: "tag", label: "Tags", options: DASH_TAGS },
    { key: "account", label: "Account", options: [...new Set(SAVED.map((d) => d.account ?? ALL_ACCOUNTS))] },
  ];
  const [filter, setFilter] = useState<FilterState>(() => emptyFilter(fields));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const shown = list.filter((d) => matches({ tag: d.tag ?? [] } as unknown as Leaf, filter, { account: d.account ?? ALL_ACCOUNTS }));
  return (
    <div className={styles.page}>
      <header className={`${styles.pageHead} ${styles.floatingBar}`}>
        <h3 className={styles.listTitle}>All dashboards</h3>
        <div className={styles.headTools}>
          <FilterButton count={activeCount(filter)} open={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)} onClear={() => setFilter(emptyFilter(fields))} />
          <button type="button" className={`${styles.primaryBtn} ${styles.glass}`} data-spot="dash-new" onClick={onCreate}>
            Create dashboard <Plus size={15} />
          </button>
        </div>
      </header>
      {filtersOpen && <Filters filter={filter} setFilter={setFilter} fields={fields} metrics={false} onClose={() => setFiltersOpen(false)} />}
      <div className={styles.tableScroll}>
        <DataTable
          label="dashboards"
          rows={shown}
          rowId={(d) => d.id}
          onRowClick={onOpen}
          columns={[
            { key: "name", label: "Name", sort: (d) => d.title, render: (d) => <span className={styles.dashName}>{d.title}</span> },
            { key: "tag", label: "Tags", width: 200, render: (d) => <TagList tags={d.tag ?? []} tone={(v) => DASH_TONE[v]} /> },
            { key: "account", label: "Account", width: 220, render: (d) => d.account ?? ALL_ACCOUNTS },
            { key: "updated", label: "Updated", width: 160, sort: (d) => d.updated.split(".").reverse().join(""), render: (d) => d.updated },
          ]}
          menu={(d, close) => <MenuRow onClick={() => (onOpen(d), close())}>Open</MenuRow>}
          bulk={(picked, clear) => (
            <SelectionBar
              count={picked.length}
              lists={[{ key: "tag", label: "Tag", options: DASH_TAGS, look: "tag", tone: (v) => DASH_TONE[v], sets: picked.map((d) => d.tag ?? []) }]}
              onApply={(ch) => setList((l) => l.map((d) => (picked.some((p) => p.id === d.id) ? { ...d, tag: applyChanges(d.tag ?? [], ch.tag) } : d)))}
              onDelete={() => (setList((l) => l.filter((d) => !picked.some((p) => p.id === d.id))), clear())}
              ai={ai}
              onClear={clear}
            />
          )}
        />
      </div>
    </div>
  );
}

function TemplatePreview({ kind }: { kind: Preview }) {
  if (kind === "kpi")
    return (
      <div className={styles.previewCard}>
        <small>Spend</small>
        <b>$2,759</b>
        <div className={styles.previewBars}>{[40, 64, 52, 80, 70].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
      </div>
    );
  if (kind === "bars")
    return (
      <div className={styles.previewCard}>
        <div className={styles.previewBars} data-tall>{[56, 72, 44, 88, 66, 92].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
      </div>
    );
  if (kind === "people")
    return (
      <div className={styles.previewCard}>
        {["Anna Fedorova", "Igor Vasiliev", "Maria Ivanova"].map((p) => (
          <span key={p} className={styles.previewPerson}><Avatar text={p.split(" ").map((x) => x[0]).join("")} size={18} /> {p}</span>
        ))}
      </div>
    );
  return (
    <div className={styles.previewCard} data-blank>
      <Plus size={22} />
    </div>
  );
}

/** Choosing what a new dashboard starts from */
export function TemplatePicker({ onPick, onClose }: { onPick: (t: Template) => void; onClose: () => void }) {
  const [category, setCategory] = useState<Category>("popular");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const q = query.trim().toLowerCase();
  const list = TEMPLATES.filter((t) => (q ? `${t.title} ${t.hint}`.toLowerCase().includes(q) : t.tags.includes(category)));
  const heading = q ? "Search results" : CATEGORIES.find((c) => c.id === category)!.label;

  return (
    <Layer onClose={onClose}>
      <div className={styles.picker} role="dialog" aria-label="Pick a dashboard template">
        <aside className={styles.pickerSide}>
          <p className={styles.pickerBrand}><LayoutDashboard size={18} /> New dashboard</p>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" aria-pressed={!q && category === c.id} onClick={() => (setQuery(""), setCategory(c.id))}>
              {c.icon} {c.label}
            </button>
          ))}
        </aside>
        <section className={styles.pickerMain}>
          <header>
            <h3>{heading}</h3>
            <label className={styles.pickerSearch}>
              <Search size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates..." aria-label="Search templates" />
            </label>
            <button type="button" className={styles.iconBtn} aria-label="Close" onClick={onClose}><X size={17} /></button>
          </header>
          <div className={styles.pickerGrid}>
            {list.map((t) => (
              <button key={t.id} type="button" className={styles.pickerCard} data-spot={t.id === "stats" ? "dash-template" : undefined} onClick={() => onPick(t.id)}>
                <span className={styles.pickerPreview} data-tone={t.tone}><TemplatePreview kind={t.preview} /></span>
                <strong>{t.title}</strong>
                <small>{t.hint}</small>
              </button>
            ))}
            {!list.length && <p className={styles.popEmpty}>Nothing found</p>}
          </div>
        </section>
      </div>
    </Layer>
  );
}
