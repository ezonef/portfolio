"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Folder, Landmark, List, ListEnd, Search, Star } from "./figma-icons";
import { Automation } from "./Automation";
import { Buying } from "./Buying";
import type { View } from "./data";
import { Docs } from "./Docs";
import { GlobalSearch } from "./GlobalSearch";
import { Hiring } from "./Hiring";
import { Tasks } from "./Tasks";
import { Face, FigmaIcon, Logo, RootEl } from "./ui";
import styles from "./product.module.css";

const PRODUCTS: { view: View; label: string }[] = [
  { view: "tasks", label: "Task Manager" },
  { view: "buying", label: "Buying" },
  { view: "automation", label: "Automation" },
  { view: "hiring", label: "Hiring" },
  { view: "docs", label: "Documents" },
];
/** Each product has its own rail in Figma: different items, active item and color. */
const RAILS: Partial<Record<View, { color: string; radius: number; active: string; items: string[] }>> = {
  buying: { color: "#2563eb", radius: 9, active: "layers", items: ["home", "layers", "users", "link", "file", "calendar", "ellipsis"] },
  automation: { color: "#16a34a", radius: 6, active: "home", items: ["home", "layers", "users", "facebook", "file", "calendar"] },
  hiring: { color: "#f97316", radius: 6, active: "briefcase", items: ["briefcase", "users", "file", "flag", "calendar_off", "bell", "calendar"] },
  docs: { color: "#4f4f4f", radius: 6, active: "home", items: ["home", "layers", "users"] },
};
type TreeRow = [label: string, depth: number, kind: "space" | "folder" | "list", on?: boolean];
const TREES: Partial<Record<View, TreeRow[]>> = {
  buying: [["Stride Campaign", 0, "space"], ["Stride", 1, "folder"], ["Sprints", 2, "folder"], ["Stride Sale · PL", 3, "list", true], ["Trail Max / Court Rise", 3, "list"], ["Creatives", 3, "list"], ["Launch checklist", 3, "list"], ["Results · 21–23 Sep", 3, "list"], ["Trail Max", 1, "folder"], ["Court Rise", 1, "folder"], ["Retargeting", 1, "folder"]],
  automation: [["Stride Team Space", 0, "space"], ["Stride", 1, "folder"], ["Workflows", 2, "folder"], ["AUTO-01 · Cart recovery", 3, "list", true], ["Order confirmation", 3, "list"], ["STRIDE30 offer", 3, "list"], ["Black Friday", 3, "list"], ["Strategic Plan", 2, "list"], ["Backlog", 2, "list"]],
  hiring: [["Stride · Design", 0, "space"], ["Creative designer", 1, "folder"], ["Motion designer", 1, "folder"], ["UGC creator", 1, "folder"], ["Stride · Buying", 0, "space"], ["Junior Media Buyer", 1, "folder"], ["Meta Ads Buyer", 1, "folder", true], ["Tracking specialist", 1, "folder"], ["Stride · Commerce", 0, "space"], ["Campaign Lead", 1, "folder"]],
};

export function SpikeApp({ initial = "buying", searchOpen = false, searchQuery = "" }: { initial?: View; searchOpen?: boolean; searchQuery?: string }) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>(initial);
  const [focus, setFocus] = useState<{ id?: string; n: number }>({ n: 0 });
  const [search, setSearch] = useState(searchOpen);
  const firstQuery = useRef(searchQuery);

  const go = useCallback((v: View, f?: string) => {
    setView(v);
    setFocus((x) => ({ id: f, n: x.n + 1 }));
  }, []);

  // Only the screen on show answers the shortcut: the case player keeps the others mounted and inert
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k" || !root || root.closest("[inert]")) return;
      e.preventDefault();
      setSearch((s) => !s);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [root]);

  const product = PRODUCTS.find((p) => p.view === view)!;
  const tree = TREES[view];
  const rail = RAILS[view];
  const openSearch = () => setSearch(true);

  return (
    <div ref={setRoot} className={styles.app}>
      <RootEl.Provider value={root}>
        {view === "tasks" ? (
          <Tasks go={go} focus={focus.id} onSearch={openSearch} />
        ) : (
          <>
            <header className={styles.top}>
              <span className={styles.brand}><Logo /><ChevronDown size={13} /></span>
              <button type="button" className={styles.searchBtn} onClick={openSearch} aria-label="Search everywhere, Control K" aria-haspopup="dialog">
                <Search size={15} /> Search <span><kbd>Ctrl</kbd> + <kbd>k</kbd></span>
              </button>
              <span className={styles.topRight}><Star size={16} /><Bell size={16} /><Face name="Emma Carter" size={28} /><ChevronDown size={13} /></span>
            </header>
            <div className={styles.shell}>
              <nav className={styles.rail} aria-label="Products">
                {rail?.items.map((i) => (
                  <span key={i} className={styles.railIcon} aria-current={i === rail.active ? "page" : undefined} style={i === rail.active ? { background: rail.color, borderRadius: rail.radius } : undefined}><FigmaIcon src={`rail/${view}/${i}`} size={20} /></span>
                ))}
                <span className={styles.spacer} />
                <span className={styles.railEnd}><FigmaIcon src={`rail/${view}/settings`} /></span>
              </nav>
              {tree && (
                <aside className={styles.spaces}>
                  <div className={styles.sideHead}><strong>Spaces</strong><button type="button" className={styles.icon} aria-label="Search everywhere" onClick={openSearch}><Search size={15} /></button></div>
                  <ul>
                    {tree.map(([label, d, kind, on]) => (
                      <li key={`${label}${d}`} data-on={on || undefined} style={{ paddingLeft: 8 + d * 13 }}>
                        {kind === "space" ? <i className={styles.spaceMark} /> : kind === "folder" ? <Folder size={14} /> : label === "Backlog" ? <ListEnd size={14} /> : label.startsWith("Strateg") ? <Landmark size={14} /> : <List size={14} />}<span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
              <main className={styles.main} aria-label={product.label}>
                {view === "buying" && <Buying go={go} focus={focus.id} />}
                {view === "automation" && <Automation go={go} focus={focus.id} />}
                {view === "hiring" && <Hiring go={go} focus={focus.id} />}
                {view === "docs" && <Docs go={go} focus={focus.id} />}
              </main>
            </div>
          </>
        )}
        {search && (
          <GlobalSearch
            go={go}
            initial={firstQuery.current}
            onClose={() => {
              firstQuery.current = "";
              setSearch(false);
            }}
          />
        )}
      </RootEl.Provider>
    </div>
  );
}

export const TaskScreen = () => <SpikeApp initial="tasks" />;
export const BuyingScreen = () => <SpikeApp initial="buying" />;
export const AutomationScreen = () => <SpikeApp initial="automation" />;
export const HiringScreen = () => <SpikeApp initial="hiring" />;
export const DocsScreen = () => <SpikeApp initial="docs" />;
export const SearchScreen = () => <SpikeApp initial="buying" searchOpen searchQuery="cart" />;
