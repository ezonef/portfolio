"use client";

import {
  ArrowDownNarrowWide,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpNarrowWide,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronsUpDown,
  CopyPlus,
  Ellipsis,
  EyeOff,
  Filter,
  GitBranch,
  GripVertical,
  Hash,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Palette,
  Pause,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  SquareCheck,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ACCOUNTS, BUYERS, FIELDS, STATUS_TONE, TAGS, TAG_TONE, fieldValues, initials, leafNodes, leaves, money, totals, type Account, type Leaf, type Level, type Node } from "./data";
import { ThinkingOrb } from "thinking-orbs";
import { SelectionBar, applyChanges, type LaunchNode } from "./SelectionBar";
import { ChipPicker } from "./ChipPicker";
import { SavedMenu } from "./SavedMenu";
import { ColorRules, DEFAULT_TEMPLATE, PAINT_COLS, PAINT_TEMPLATES, paintRules, paintStyle, sourceLabel, toneFor, type PaintCol, type PaintSource, type PaintState, type PaintTemplate, type Tone } from "./ColorRules";
import { Filters, activeCount, emptyFilter, matches, presetFilter as presetFilterState, type FilterState } from "./Filters";
import { GroupControl, type GroupLevel } from "./Grouping";
import { Avatar, Checkbox, MenuRow, PeopleCell, Popover, Toggle, useDragDrop, FilterButton, useSubmenu } from "./ui";
import { useColumnDrag } from "../../useColumnDrag";
import styles from "./product.module.css";

type ColKey = "status" | "budget" | "spend" | "purchases" | "cpa" | "roas" | "buyer";
const COLS: Record<ColKey, { label: string; width: number }> = {
  status: { label: "Status", width: 128 },
  budget: { label: "Budget", width: 104 },
  spend: { label: "Spend", width: 104 },
  purchases: { label: "Purchases", width: 104 },
  cpa: { label: "CPA", width: 84 },
  roas: { label: "ROAS", width: 92 },
  buyer: { label: "Buyer", width: 184 },
};
const ORDER: ColKey[] = ["status", "budget", "spend", "purchases", "cpa", "roas", "buyer"];
/** The name column can be dragged, but has no column menu and can't be hidden */
type DragKey = ColKey | "name";
const START_COLUMNS: DragKey[] = ["name", ...ORDER];
/** A saved set of columns: their order and which are hidden */
type ColumnSetup = { name: string; order: DragKey[]; hidden: DragKey[] };
const COLUMN_PRESETS: ColumnSetup[] = [
  { name: "All columns", order: START_COLUMNS, hidden: [] },
  { name: "Money", order: ["name", "spend", "budget", "cpa", "roas", "purchases", "status", "buyer"], hidden: ["status", "buyer"] },
  { name: "Delivery", order: ["name", "status", "budget", "spend", "buyer", "purchases", "cpa", "roas"], hidden: ["purchases", "cpa", "roas"] },
];
const setupKey = (order: DragKey[], hidden: Iterable<DragKey>) => JSON.stringify([order, [...hidden].sort()]);
const CHECK_WIDTH = 44;
const TOGGLE_WIDTH = 64;
const MIN_COL_WIDTH = 64;
const MIN_NAME_WIDTH = 160;
const DEFAULT_NAME_MIN = 240;
const LEVEL_ICON: Record<Level, ReactNode> = {
  account: <LayoutDashboard size={14} />,
  bundle: <GitBranch size={14} />,
  campaign: <Filter size={14} />,
  adset: <Layers size={14} />,
  ad: <ImageIcon size={14} />,
};

const updateLeaves = (nodes: Node[], ids: Set<string>, fn: (l: Leaf) => Leaf): Node[] =>
  nodes.map((n) =>
    n.leaf
      ? ids.has(n.id)
        ? { ...n, leaf: fn(n.leaf) }
        : n
      : { ...n, children: updateLeaves(n.children ?? [], ids, fn) },
  );

/** Removes these ads, and any group left empty without them */
function removeLeaves(nodes: Node[], ids: Set<string>): Node[] {
  return nodes.flatMap((n) => {
    if (n.leaf) return ids.has(n.id) ? [] : [n];
    const children = removeLeaves(n.children ?? [], ids);
    return children.length ? [{ ...n, children }] : [];
  });
}

/** Puts a copy of a row (with its children, under new ids) right after it */
function insertCopy(nodes: Node[], id: string): Node[] {
  const copy = (n: Node, k: string): Node => ({ ...n, id: `${n.id}-${k}`, children: n.children?.map((c) => copy(c, k)) });
  return nodes.flatMap((n) => {
    if (n.id === id) {
      const k = `copy${Date.now().toString(36)}`;
      return [n, { ...copy(n, k), name: `${n.name} · copy` }];
    }
    return [n.children ? { ...n, children: insertCopy(n.children, id) } : n];
  });
}

function prune(nodes: Node[], keep: (n: Node) => boolean): Node[] {
  return nodes.flatMap((n) => {
    if (n.leaf) return keep(n) ? [n] : [];
    const children = prune(n.children ?? [], keep);
    return children.length ? [{ ...n, children }] : [];
  });
}

function sortValue(n: Node, key: ColKey): string | number {
  const t = totals([n]);
  const first = leaves([n])[0];
  if (key === "status") return first?.status ?? "";
  if (key === "buyer") return first?.buyer[0] ?? "";
  return t[key];
}
function sortTree(nodes: Node[], key: ColKey, dir: 1 | -1): Node[] {
  return [...nodes]
    .map((n) => (n.children ? { ...n, children: sortTree(n.children, key, dir) } : n))
    .sort((a, b) => {
      const x = sortValue(a, key);
      const y = sortValue(b, key);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en")) * dir;
    });
}

type Menu =
  | { el: HTMLElement; kind: "column"; col: ColKey }
  | { el: HTMLElement; kind: "columns" }
  | { el: HTMLElement; kind: "row"; node: Node };
const MORE_WIDTH = 44;

export function Operations({
  filtersOpen,
  setFiltersOpen,
  openColumn,
  presetFilter,
  onAskAi,
  ai,
  onOpenDashboard,
  onFilterActive,
}: {
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  openColumn?: boolean;
  presetFilter?: boolean;
  /** Opens the AI assistant about the selected rows */
  onAskAi?: () => void;
  /** The AI panel the selection bar's orb opens and closes */
  ai?: { open: boolean; onToggle: () => void };
  /** Opens account statistics in a dashboard; null when the row has no single account */
  onOpenDashboard?: (account: string | null) => void;
  /** How many filter conditions are set, for the onboarding */
  onFilterActive?: (count: number) => void;
}) {
  const [data, setData] = useState<Account[]>(ACCOUNTS);
  const [closed, setClosed] = useState<Set<string>>(() => new Set(["a3", "c2", "c3", "s2", "c5"]));
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [order, setOrder] = useState<DragKey[]>(START_COLUMNS);
  const [hidden, setHidden] = useState<Set<DragKey>>(() => new Set());
  // Saved column sets, like saved filters: the one picked, and whether it was changed since
  const [columnSets, setColumnSets] = useState<ColumnSetup[]>(COLUMN_PRESETS);
  const [columnBase, setColumnBase] = useState<string | null>(COLUMN_PRESETS[0].name);
  const columns = order.filter((c) => !hidden.has(c));
  const colDrag = useColumnDrag<DragKey>(setOrder);
  const [widths, setWidths] = useState<Partial<Record<DragKey, number>>>({});
  const [resizing, setResizing] = useState<DragKey | null>(null);
  const widthOf = (c: ColKey) => widths[c] ?? COLS[c].width;
  const setWidth = (c: DragKey, w: number) => setWidths((v) => ({ ...v, [c]: Math.max(c === "name" ? MIN_NAME_WIDTH : MIN_COL_WIDTH, Math.round(w)) }));
  const tableMin = CHECK_WIDTH + TOGGLE_WIDTH + MORE_WIDTH + (widths.name ?? DEFAULT_NAME_MIN) + columns.reduce((sum, c) => sum + (c === "name" ? 0 : widthOf(c)), 0);
  const startResize = (e: PointerEvent<HTMLElement>, c: DragKey) => {
    e.stopPropagation();
    if (e.button !== 0 || e.pointerType === "touch") return;
    e.preventDefault();
    const th = e.currentTarget.closest("th")!;
    const scale = th.getBoundingClientRect().width / th.offsetWidth || 1;
    const from = th.offsetWidth;
    const x = e.clientX;
    const move = (ev: globalThis.PointerEvent) => setWidth(c, from + (ev.clientX - x) / scale);
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setResizing(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    setResizing(c);
  };
  const resizeHandle = (c: DragKey, label: string) => (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Width of column “${label}”`}
      tabIndex={0}
      className={styles.colResize}
      data-on={resizing === c || undefined}
      onPointerDown={(e) => startResize(e, c)}
      onDoubleClick={() => setWidths((v) => { const next = { ...v }; delete next[c]; return next; })}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const th = e.currentTarget.closest("th")!;
        setWidth(c, th.offsetWidth + (e.key === "ArrowRight" ? 8 : -8));
      }}
    />
  );
  const [sort, setSort] = useState<{ key: ColKey; dir: 1 | -1 } | null>(null);
  const [groups, setGroups] = useState<GroupLevel[]>([{ key: "account", dir: 1 }]);
  const [auto, setAuto] = useState<Set<ColKey>>(() => new Set());
  const [menu, setMenu] = useState<Menu | null>(null);
  const [filter, setFilter] = useState<FilterState>(() => (presetFilter ? presetFilterState() : emptyFilter()));
  const [paintState, setPaintState] = useState<PaintState>(() => DEFAULT_TEMPLATE.build());
  const paint = paintRules(paintState);
  const [paintSource, setPaintSource] = useState<PaintSource>({ kind: "template", name: DEFAULT_TEMPLATE.name });
  const [templates, setTemplates] = useState<PaintTemplate[]>(PAINT_TEMPLATES);
  // A template keeps a copy of the rules, so later edits in the table don't change it
  const snapshot = (s: PaintState) => () => structuredClone(s);
  const saveTemplate = () => {
    if (paintSource.kind !== "custom" || !paintSource.from) return;
    const name = paintSource.from;
    setTemplates((ts) => ts.map((t) => (t.name === name ? { ...t, build: snapshot(paintState) } : t)));
    setPaintSource({ kind: "template", name });
  };
  const saveAsTemplate = (name: string) => {
    setTemplates((ts) => [...ts, { name, build: snapshot(paintState) }]);
    setPaintSource({ kind: "template", name });
  };
  const [paintOpen, setPaintOpen] = useState<{ scope: PaintCol | "all"; el: HTMLElement } | null>(null);
  const editPaint = (next: PaintState) => {
    // Switching between simple and advanced alone is not an edit
    if (next.mode === paintState.mode || JSON.stringify(paintRules(next)) !== JSON.stringify(paint))
      setPaintSource((s) => ({ kind: "custom", from: s.kind === "template" ? s.name : s.from }));
    setPaintState(next);
  };
  const applyTemplate = (name: string) => {
    setPaintState({ ...templates.find((x) => x.name === name)!.build(), mode: paintState.mode });
    setPaintSource({ kind: "template", name });
  };
  const openPaint = (scope: PaintCol | "all", el: HTMLElement) => {
    setFiltersOpen(false);
    setPaintOpen({ scope, el });
  };
  useEffect(() => {
    if (filtersOpen) setPaintOpen(null);
  }, [filtersOpen]);
  const [toast, setToast] = useState("");
  // The row menu's submenus: change buyer, set tag
  const rowSub = useSubmenu<"buyer" | "tag">();
  // A menu keeps the row it was opened for; after an edit it reads the row's current state from the data
  const liveNode = (n: Node): Node => {
    const find = (list: Node[]): Node | undefined => list.reduce<Node | undefined>((hit, x) => hit ?? (x.id === n.id ? x : x.children && find(x.children)), undefined);
    return data.reduce<Node | undefined>((hit, a) => hit ?? find(a.children), undefined) ?? n;
  };
  const openSub = (kind: "buyer" | "tag", el: HTMLElement) => {
    rowSub.open(kind, el, true);
    // Opened by click or →: focus goes into the submenu
    requestAnimationFrame(() => el.ownerDocument.querySelector<HTMLElement>("[data-submenu] button")?.focus());
  };
  const scroller = useRef<HTMLDivElement>(null);
  // The bar above the table is its horizontal scrollbar: it shows only when the table is wider than the screen
  const [hbar, setHbar] = useState({ size: 1, pos: 0 });
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      const size = el.scrollWidth > el.clientWidth + 1 ? el.clientWidth / el.scrollWidth : 1;
      const max = el.scrollWidth - el.clientWidth;
      setHbar({ size, pos: max > 0 ? el.scrollLeft / max : 0 });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => (el.removeEventListener("scroll", measure), ro.disconnect());
  }, []);
  /** Dragging or pressing the bar scrolls the table sideways */
  const dragBar = (e: PointerEvent<HTMLDivElement>) => {
    const el = scroller.current;
    if (!el) return;
    const track = e.currentTarget.getBoundingClientRect();
    const max = el.scrollWidth - el.clientWidth;
    const thumb = track.width * hbar.size;
    const at = (x: number) => (el.scrollLeft = ((x - track.left - thumb / 2) / (track.width - thumb)) * max);
    at(e.clientX);
    const move = (ev: globalThis.PointerEvent) => at(ev.clientX);
    const end = () => (window.removeEventListener("pointermove", move), window.removeEventListener("pointerup", end));
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  useEffect(() => {
    if (!openColumn) return;
    const el = scroller.current?.querySelector<HTMLElement>('[data-col="status"]');
    if (el) setMenu({ el, kind: "column", col: "status" });
  }, [openColumn]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const activeRules = activeCount(filter);
  useEffect(() => onFilterActive?.(activeRules), [activeRules, onFilterActive]);
  const keep = (n: Node) => !n.leaf || matches(n.leaf, filter);

  const sections = useMemo(() => {
    const shaped = data
      .map((a) => ({ ...a, children: prune(a.children, keep) }))
      .filter((a) => a.children.length)
      .map((a) => ({ ...a, children: sort ? sortTree(a.children, sort.key, sort.dir) : a.children }));
    // Every group keeps the whole path: account, bundle, campaign and ad set above each ad
    const accountRow = (a: Account, children: Node[]): Node => ({ id: a.id, level: "account", name: a.name, children });
    if (!groups.length) {
      const rows = shaped.map((a) => accountRow(a, a.children));
      return rows.length ? [{ id: "all", title: "All campaigns", avatar: "", tone: undefined as string | undefined, rows, subs: undefined }] : [];
    }
    type Shaped = (typeof shaped)[number];
    type Bucket = { id: string; title: string; avatar: string; tone: string | undefined; accounts: Shaped[] };
    // Splits accounts into the groups of one level; a field group keeps only the ads with that value
    const split = (accounts: Shaped[], g: GroupLevel, prefix: string): Bucket[] => {
      if (g.key === "account") {
        const list = accounts.map((a) => ({ id: `${prefix}${a.id}`, title: a.name, avatar: a.initials, tone: undefined, accounts: [a] }));
        return g.dir === -1 ? list.reverse() : list;
      }
      const key = g.key;
      const all = accounts.flatMap((a) => leafNodes(a.children));
      const options = FIELDS.find((f) => f.key === key)!.options;
      // Statuses keep their working order, everything else goes by the alphabet
      const ordered = key === "status" ? options : [...options].sort((a, b) => a.localeCompare(b, "en"));
      const values = ordered.filter((v) => all.some((n) => fieldValues(n.leaf!, key).includes(v)));
      if (g.dir === -1) values.reverse();
      return values.map((v) => ({
        id: `${prefix}group-${v}`,
        title: v,
        avatar: key === "buyer" ? initials(v) : "",
        tone: key === "status" ? STATUS_TONE[v as Leaf["status"]] : key === "tag" ? TAG_TONE[v] : undefined,
        accounts: accounts.map((a) => ({ ...a, children: prune(a.children, (n) => !n.leaf || fieldValues(n.leaf, key).includes(v)) })).filter((a) => a.children.length),
      }));
    };
    // Grouped by account somewhere, a bottom group holds one account, so its rows start below the account
    const byAccount = groups.some((g) => g.key === "account");
    const rowsOf = (b: Bucket) => (byAccount ? b.accounts.flatMap((a) => a.children) : b.accounts.map((a) => accountRow(a, a.children)));
    const head = ({ id, title, avatar, tone }: Bucket) => ({ id, title, avatar, tone });
    return split(shaped, groups[0], "").map((b) => {
      if (!groups[1]) return { ...head(b), rows: rowsOf(b), subs: undefined };
      const subs = split(b.accounts, groups[1], `${b.id}/`).map((x) => ({ ...head(x), rows: rowsOf(x) }));
      return { ...head(b), rows: subs.flatMap((x) => x.rows), subs };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filter, sort, groups]);

  const allLeaves = data.flatMap((a) => leafNodes(a.children));
  const pickedLeaves = allLeaves.filter((n) => picked.has(n.id));


  const toggleOpen = (id: string) =>
    setClosed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const checkOf = (nodes: Node[]) => {
    const ids = leafNodes(nodes).map((n) => n.id);
    const count = ids.filter((id) => picked.has(id)).length;
    return count === 0 ? false : count === ids.length ? true : ("mixed" as const);
  };
  const pickMany = (nodes: Node[]) => {
    const ids = leafNodes(nodes).map((n) => n.id);
    setPicked((s) => {
      const n = new Set(s);
      const all = ids.every((id) => n.has(id));
      ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
      return n;
    });
  };
  const pick = (node: Node) => {
    const ids = leafNodes([node]).map((n) => n.id);
    setPicked((s) => {
      const n = new Set(s);
      const all = ids.every((id) => n.has(id));
      ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
      return n;
    });
  };
  const edit = (ids: Set<string>, fn: (l: Leaf) => Leaf) => setData((d) => d.map((a) => ({ ...a, children: updateLeaves(a.children, ids, fn) })));
  // Buyers and tags are lists: does every one of these ads have the value
  const hasAll = (ls: Leaf[], field: "buyer" | "tag", v: string) => ls.length > 0 && ls.every((l) => l[field].includes(v));
  const flip = (node: Node) => {
    const ls = leafNodes([node]).filter((n) => n.leaf!.status !== "Rejected");
    const anyOn = ls.some((n) => n.leaf!.status === "Active");
    edit(new Set(ls.map((n) => n.id)), (l) => ({ ...l, status: anyOn ? "Paused" : "Active" }));
  };
  const moveColumn = (col: ColKey, to: "start" | "end") => {
    setOrder((c) => {
      const rest = c.filter((x) => x !== col);
      return to === "start" ? [col, ...rest] : [...rest, col];
    });
    setMenu(null);
  };

  const cell = (node: Node, key: ColKey) => {
    const t = totals([node]);
    const ls = leaves([node]);
    if (key === "status") {
      if (node.leaf) return <span className={styles.status} data-tone={STATUS_TONE[node.leaf.status]}>{node.leaf.status}</span>;
      return <Counts list={ls} />;
    }
    if (key === "buyer") {
      return <PeopleCell names={[...new Set(ls.flatMap((l) => l.buyer))]} />;
    }
    if (key === "purchases") return t.purchases;
    if (key === "roas") return t.spend ? `${t.roas.toFixed(2)}×` : "—";
    if (key === "cpa") return t.purchases ? money(t.cpa) : "—";
    return money(t[key]);
  };

  const numOf = (node: Node, key: ColKey) => {
    const t = totals([node]);
    if (key === "cpa") return t.purchases ? t.cpa : NaN;
    if (key === "roas") return t.spend ? t.roas : NaN;
    return key === "status" || key === "buyer" ? NaN : t[key];
  };
  const paintOf = (node: Node, key: ColKey): Tone | undefined =>
    toneFor(
      paint,
      key,
      (k) => [...new Set(leaves([node]).flatMap((l) => fieldValues(l, k)))],
      (k) => numOf(node, k),
    );

  const renderRows = (nodes: Node[], depth: number): ReactNode =>
    nodes.map((n) => {
      const hasKids = !!n.children?.length;
      const open = hasKids && !closed.has(n.id);
      const ids = leafNodes([n]).map((x) => x.id);
      const count = ids.filter((id) => picked.has(id)).length;
      const check = count === 0 ? false : count === ids.length ? true : ("mixed" as const);
      const ls = leaves([n]);
      const on = ls.some((l) => l.status === "Active");
      const locked = ls.every((l) => l.status === "Rejected");
      return (
        <Fragment key={n.id}>
          <tr data-picked={check === true || undefined}>
            <td className={styles.tdCheck}>
              <Checkbox state={check} label={`Select ${n.name}`} onChange={() => pick(n)} />
            </td>
            <td className={styles.tdToggle}>
              <Toggle on={on} disabled={locked} label={`Turn on ${n.name}`} onChange={() => flip(n)} />
            </td>
            {columns.map((c) =>
              c === "name" ? (
                <td key={c} {...colDrag.cell(c)} className={styles.tdName}>
                  <div style={{ paddingLeft: depth * 20 }}>
                    {hasKids ? (
                      <button type="button" className={styles.expand} aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${n.name}`} onClick={() => toggleOpen(n.id)}>
                        <ChevronDown size={14} data-closed={!open || undefined} />
                      </button>
                    ) : (
                      <span className={styles.expandGap} />
                    )}
                    <span className={styles.levelIcon}>{LEVEL_ICON[n.level]}</span>
                    <span className={styles.rowName} title={n.name}>{n.name}</span>
                  </div>
                </td>
              ) : (
                <td key={c} {...colDrag.cell(c)} style={paintStyle(paintOf(n, c))}>
                  {cell(n, c)}
                </td>
              ),
            )}
            {widths.name !== undefined && <td />}
            <td className={styles.tdMore}>
              <button type="button" className={styles.rowMore} data-open={(menu?.kind === "row" && menu.node.id === n.id) || undefined} aria-label={`Actions: ${n.name}`} onClick={(e) => setMenu({ el: e.currentTarget, kind: "row", node: n })}>
                <Ellipsis size={16} />
              </button>
            </td>
          </tr>
          {open && renderRows(n.children!, depth + 1)}
        </Fragment>
      );
    });

  type GroupHead = { id: string; title: string; avatar: string; tone: string | undefined; rows: Node[] };
  /** A group's header: name, status counts and totals; a nested group sits indented under its parent */
  const groupHead = (g: GroupHead, open: boolean, sub: boolean) => {
    const t = totals(g.rows);
    return (
      <button type="button" className={styles.accountHead} data-sub={sub || undefined} aria-expanded={open} onClick={() => toggleOpen(g.id)}>
        <svg width={14} height={14} viewBox="0 0 14 14" className={styles.tri} data-open={open || undefined} aria-hidden><path d="M5.5 4.2v5.6L9.5 7z" /></svg>
        {g.avatar && <Avatar text={g.avatar} size={sub ? 22 : 26} />}
        {g.tone ? <span className={styles.status} data-tone={g.tone}>{g.title}</span> : <strong>{g.title}</strong>}
        <Counts list={leaves(g.rows)} />
        <span className={styles.accountTotal}>
          Spend <em data-tone="bad">{money(t.spend)}</em> Purchases <em data-tone="good">{t.purchases}</em> ROAS <b>{t.spend ? `${t.roas.toFixed(2)}×` : "—"}</b>
        </span>
      </button>
    );
  };
  /** One group's table: its own header row, check-all and rows */
  const tableFor = (rows: Node[], title: string, first: boolean) => (
      <table className={styles.table} style={{ minWidth: tableMin }} data-picking={checkOf(rows) !== false || undefined}>
        <colgroup>
          <col style={{ width: CHECK_WIDTH }} />
          <col style={{ width: TOGGLE_WIDTH }} />
          {columns.map((c) => <col key={c} style={c === "name" ? (widths.name ? { width: widths.name } : undefined) : { width: widthOf(c) }} />)}
          {widths.name !== undefined && <col />}
          <col style={{ width: MORE_WIDTH }} />
        </colgroup>
        <thead>
          <tr>
            <th className={styles.tdCheck}>
              <Checkbox state={checkOf(rows)} label={`Select all: ${title}`} onChange={() => pickMany(rows)} />
            </th>
            <th className={styles.thPlain}>On/Off</th>
            {columns.map((c) => c === "name" ? (
              <th key={c} {...colDrag.head(c)} className={styles.thPlain}>Name{resizeHandle(c, "Name")}</th>
            ) : (
              <th key={c} {...colDrag.head(c)}>
                <button
                  type="button"
                  className={styles.colBtn}
                  data-col={first ? c : undefined}
                  data-active={(menu?.kind === "column" && menu.col === c) || undefined}
                  aria-haspopup="menu"
                  onClick={(e) => setMenu({ el: e.currentTarget, kind: "column", col: c })}
                >
                  {auto.has(c) && <Bot size={12} className={styles.accentIcon} />}
                  <span>{COLS[c].label}</span>
                  {sort?.key === c ? sort.dir === 1 ? <ArrowUpNarrowWide size={13} /> : <ArrowDownNarrowWide size={13} /> : <ChevronsUpDown size={13} className={styles.colHint} />}
                </button>
                {resizeHandle(c, COLS[c].label)}
              </th>
            ))}
            {widths.name !== undefined && <th />}
            <th />
          </tr>
        </thead>
        <tbody>{renderRows(rows, 0)}</tbody>
      </table>
  );

  return (
    <div className={styles.page}>
      <header className={`${styles.pageHead} ${styles.floatingBar}`}>
        <GroupControl levels={groups} onChange={setGroups} />
        <div className={styles.headTools}>
          <button type="button" className={`${styles.iconBtn} ${styles.glass}`} aria-label="Set up columns" title="Columns" onClick={(e) => setMenu({ el: e.currentTarget, kind: "columns" })}>
            <SlidersHorizontal size={17} />
          </button>
          <button type="button" className={`${styles.iconBtn} ${styles.glass}`} aria-label="Colour coding" title="Colour coding" aria-pressed={paintOpen !== null} onClick={(e) => (paintOpen?.scope === "all" ? setPaintOpen(null) : openPaint("all", e.currentTarget))}>
            <Palette size={17} />
          </button>
          <FilterButton count={activeRules} open={filtersOpen} spot="btn-filter" onClick={() => setFiltersOpen(!filtersOpen)} onClear={() => setFilter(emptyFilter())} />
          <button type="button" className={`${styles.primaryBtn} ${styles.glass}`}>
            Create campaign <Plus size={15} />
          </button>
        </div>
      </header>
      {hbar.size < 1 && (
        <div className={styles.progress} role="scrollbar" aria-orientation="horizontal" aria-controls="ops-table" aria-valuenow={Math.round(hbar.pos * 100)} aria-label="Table scroll" onPointerDown={dragBar}>
          <i style={{ width: `${hbar.size * 100}%`, transform: `translateX(${(hbar.pos * (1 - hbar.size) * 100) / hbar.size}%)` }} />
        </div>
      )}

      {paintOpen && (
        <ColorRules
          key={paintOpen.scope}
          anchor={paintOpen.el}
          value={paintState}
          source={paintSource}
          onValue={editPaint}
          onTemplate={applyTemplate}
          templates={templates}
          onSaveTemplate={saveTemplate}
          onSaveAsTemplate={saveAsTemplate}
          presets={PAINT_TEMPLATES.map((t) => t.name)}
          col={paintOpen.scope === "all" ? undefined : paintOpen.scope}
          onClose={() => setPaintOpen(null)}
        />
      )}
      {filtersOpen && <Filters filter={filter} setFilter={setFilter} onClose={() => setFiltersOpen(false)} />}

      <div ref={scroller} id="ops-table" className={styles.tableScroll}>
        {sections.map((s, si) => {
          const open = !closed.has(s.id);
          return (
            <section key={s.id} className={styles.account}>
              {groupHead(s, open, false)}
              {open && !s.subs && tableFor(s.rows, s.title, si === 0)}
              {open &&
                s.subs?.map((x, xi) => {
                  const subOpen = !closed.has(x.id);
                  return (
                    <div key={x.id} className={styles.subGroup}>
                      {groupHead(x, subOpen, true)}
                      {subOpen && tableFor(x.rows, x.title, si === 0 && xi === 0)}
                    </div>
                  );
                })}
            </section>
          );
        })}
        {!sections.length && (
          <div className={styles.empty}>
            <LayoutGrid size={22} />
            <strong>Nothing found</strong>
            <span>Change the filter or clear it.</span>
            <button type="button" className={styles.softBtn} onClick={() => setFilter(emptyFilter())}>
              Clear filter
            </button>
          </div>
        )}
      </div>

      {pickedLeaves.length > 0 && (
        <SelectionBar
          count={pickedLeaves.length}
          lists={[
            { key: "buyer", label: "Buyer", options: BUYERS, look: "person", sets: leaves(pickedLeaves).map((l) => l.buyer) },
            { key: "tag", label: "Tag", options: TAGS, look: "tag", tone: (v) => TAG_TONE[v], sets: leaves(pickedLeaves).map((l) => l.tag) },
          ]}
          onApply={(ch, launch) => {
            const n = Object.values(ch).reduce((k, m) => k + Object.keys(m).length, 0) + Object.keys(launch).length;
            edit(new Set(pickedLeaves.map((x) => x.id)), (l) => ({ ...l, buyer: applyChanges(l.buyer, ch.buyer), tag: applyChanges(l.tag, ch.tag) }));
            // Rejected ads cannot run, so they never reach here
            const ids = (on: boolean) => new Set(Object.keys(launch).filter((id) => launch[id] === on));
            edit(ids(true), (l) => ({ ...l, status: "Active" }));
            edit(ids(false), (l) => ({ ...l, status: "Paused" }));
            setToast(`${n} ${n === 1 ? "change" : "changes"} applied to ${pickedLeaves.length}`);
          }}
          launch={(() => {
            // What is picked, as it sits in the accounts: account › … › ad, with every ad's own state
            const toTree = (nodes: Node[]): LaunchNode[] =>
              nodes.flatMap((n): LaunchNode[] => {
                if (n.leaf) return picked.has(n.id) ? [{ id: n.id, label: n.name, on: n.leaf.status === "Active", locked: n.leaf.status === "Rejected", reason: n.leaf.status === "Rejected" ? "Rejected by moderation. Fix the ad and send it for review again to launch it." : undefined }] : [];
                const children = toTree(n.children ?? []);
                return children.length ? [{ id: n.id, label: n.name, children }] : [];
              });
            return data.flatMap((a): LaunchNode[] => {
              const children = toTree(a.children);
              return children.length ? [{ id: a.id, label: a.name, children }] : [];
            });
          })()}
          onDelete={() => {
            const ids = new Set(pickedLeaves.map((n) => n.id));
            setData((d) => d.map((a) => ({ ...a, children: removeLeaves(a.children, ids) })));
            setPicked(new Set());
            setToast(`Deleted: ${ids.size}`);
          }}
          ai={ai}
          onClear={() => setPicked(new Set())}
        />
      )}

      {toast && <div className={styles.toast} role="status">{toast}</div>}

      {menu?.kind === "column" && (
        <Popover anchor={menu.el} onClose={() => setMenu(null)} align={columns.indexOf(menu.col) > columns.length - 3 ? "end" : "start"} width={420}>
          <MenuRow icon={<ArrowUpNarrowWide size={16} />} selected={sort?.key === menu.col && sort.dir === 1} onClick={() => (setSort(sort?.key === menu.col && sort.dir === 1 ? null : { key: menu.col, dir: 1 }), setMenu(null))}>Ascending</MenuRow>
          <MenuRow icon={<ArrowDownNarrowWide size={16} />} selected={sort?.key === menu.col && sort.dir === -1} onClick={() => (setSort(sort?.key === menu.col && sort.dir === -1 ? null : { key: menu.col, dir: -1 }), setMenu(null))}>Descending</MenuRow>
          <MenuRow
            icon={<Layers size={16} />}
            disabled={menu.col !== "status" && menu.col !== "buyer"}
            selected={groups[0]?.key === menu.col}
            onClick={() => {
              const col = menu.col as "status" | "buyer";
              setGroups(groups[0]?.key === col ? [{ key: "account", dir: 1 }] : [{ key: col, dir: 1 }]);
              setMenu(null);
            }}
          >
            Group
          </MenuRow>
          <hr className={styles.menuLine} />
          <MenuRow icon={<ArrowLeftToLine size={16} />} disabled={columns[0] === menu.col} onClick={() => moveColumn(menu.col, "start")}>Move to start</MenuRow>
          <MenuRow icon={<ArrowRightToLine size={16} />} disabled={columns[columns.length - 1] === menu.col} onClick={() => moveColumn(menu.col, "end")}>Move to end</MenuRow>
          <MenuRow
            icon={<Palette size={16} />}
            disabled={!PAINT_COLS.some((x) => x.key === menu.col)}
            hint={PAINT_COLS.some((x) => x.key === menu.col) ? (paint.some((r) => r.col === menu.col) ? sourceLabel(paintSource) : "Not set") : "Number columns only"}
            onClick={() => (openPaint(menu.col as PaintCol, menu.el), setMenu(null))}
          >
            Colour coding
          </MenuRow>
          <MenuRow
            icon={<Bot size={16} />}
            selected={auto.has(menu.col)}
            onClick={() => {
              const c = menu.col;
              const n = new Set(auto);
              if (n.has(c)) n.delete(c);
              else n.add(c);
              setAuto(n);
              setToast(n.has(c) ? `Automation for column “${COLS[c].label}” is on` : `Automation for column “${COLS[c].label}” is off`);
              setMenu(null);
            }}
          >
            Automate
          </MenuRow>
          <MenuRow
            icon={<EyeOff size={16} />}
            disabled={columns.length === 2}
            onClick={() => {
              setHidden(new Set(hidden).add(menu.col));
              setMenu(null);
              setToast(`Column “${COLS[menu.col].label}” is hidden. You can bring it back in settings`);
            }}
          >
            Hide column
          </MenuRow>
        </Popover>
      )}
      {menu?.kind === "row" && (() => {
        const n = menu.node;
        const ls = leaves([n]);
        const ids = new Set(leafNodes([n]).map((x) => x.id));
        const account = data.find((a) => a.id === n.id || leafNodes(a.children).some((x) => ids.has(x.id)));
        const done = (msg: string) => (setToast(msg), setMenu(null));
        return (
          <Popover anchor={menu.el} onClose={() => (rowSub.close(), setMenu(null))} align="end" width={268}>
            <div
              style={{ display: "contents" }}
              onPointerOver={(e) => {
                // Hovering a folder opens its submenu; any other row lets it go after a grace delay
                const row = (e.target as HTMLElement).closest<HTMLElement>("button");
                const kind = row?.dataset.folderKind as "buyer" | "tag" | undefined;
                if (kind && row) rowSub.open(kind, row);
                else if (row) rowSub.leave();
              }}
            >
            <div className={styles.menuTiles}>
              <button type="button" onClick={() => (void navigator.clipboard?.writeText(`https://app.nls.io/ops/${n.id}`).catch(() => {}), done("Link copied"))}>
                <Link2 size={17} /> Link
              </button>
              <button type="button" onClick={() => (onAskAi?.(), done(`The AI is looking at “${n.name}”`))}>
                <ThinkingOrb state="working" size={20} theme="auto" aria-hidden="true" /> AI review
              </button>
              <button type="button" disabled={!onOpenDashboard} onClick={() => (onOpenDashboard?.(account?.name ?? null), setMenu(null))}>
                <BarChart3 size={17} /> In dashboard
              </button>
            </div>
            <MenuRow icon={<SquareCheck size={16} />} onClick={() => (pick(n), setMenu(null))}>{[...ids].every((id) => picked.has(id)) ? "Clear selection" : "Select"}</MenuRow>
            <MenuRow icon={ls.some((l) => l.status === "Active") ? <Pause size={16} /> : <Play size={16} />} disabled={ls.every((l) => l.status === "Rejected")} onClick={() => (flip(n), setMenu(null))}>
              {ls.some((l) => l.status === "Active") ? "Pause" : "Turn on"}
            </MenuRow>
            <MenuRow icon={<CopyPlus size={16} />} disabled={n.level === "account"} onClick={() => (setData((d) => d.map((a) => ({ ...a, children: insertCopy(a.children, n.id) }))), done(`Copied “${n.name}”`))}>
              Duplicate
            </MenuRow>
            <hr className={styles.menuLine} />
            <MenuRow icon={<UserRound size={16} />} folder={{ open: rowSub.sub?.kind === "buyer", onOpen: (el) => openSub("buyer", el), kind: "buyer" }} onClick={() => {}}>
              Change buyer
            </MenuRow>
            <MenuRow icon={<Tag size={16} />} folder={{ open: rowSub.sub?.kind === "tag", onOpen: (el) => openSub("tag", el), kind: "tag" }} onClick={() => {}}>
              Set tag
            </MenuRow>
            <MenuRow icon={<Hash size={16} />} onClick={() => (void navigator.clipboard?.writeText(n.id).catch(() => {}), done("ID copied"))}>
              Copy ID
            </MenuRow>
            <hr className={styles.menuLine} />
            <MenuRow danger icon={<Trash2 size={16} />} onClick={() => (setData((d) => d.map((a) => ({ ...a, children: removeLeaves(a.children, ids) }))), done(`Deleted: ${ids.size}`))}>
              Delete
            </MenuRow>
            </div>
          </Popover>
        );
      })()}
      {menu?.kind === "row" && rowSub.sub && (
        <Popover anchor={rowSub.sub.el} side onClose={rowSub.close} onPointerEnter={rowSub.stay} width={240}>
          {(() => {
            const field = rowSub.sub!.kind;
            const nodes = leafNodes([liveNode(menu.node)]);
            const ls = leaves(nodes);
            const options = field === "buyer" ? BUYERS : TAGS;
            const set = (v: string, on: boolean) => {
              edit(new Set(nodes.map((x) => x.id)), (l) => ({ ...l, [field]: on ? (l[field].includes(v) ? l[field] : [...l[field], v]) : l[field].filter((x) => x !== v) }));
              setToast(`${field === "buyer" ? "Buyer" : "Tag"} “${v}” ${on ? "added to" : "removed from"} “${menu.node.name}”`);
            };
            // The same picker as the selection bar; here a change applies at once
            return (
              <ChipPicker
                key={field}
                options={options}
                chosen={options.filter((v) => hasAll(ls, field, v))}
                onAdd={(v) => set(v, true)}
                onRemove={(v) => set(v, false)}
                look={field === "buyer" ? "person" : "plain"}
                tone={field === "tag" ? (v) => TAG_TONE[v] : undefined}
                partial={(v) => ls.some((l) => l[field].includes(v)) && !hasAll(ls, field, v)}
              />
            );
          })()}
        </Popover>
      )}
      {menu?.kind === "columns" && (
        <Popover anchor={menu.el} onClose={() => setMenu(null)} align="end" width={240}>
          <ColumnsMenu
            order={order}
            setOrder={setOrder}
            hidden={hidden}
            setHidden={setHidden}
            sets={columnSets}
            base={columnBase}
            onPick={(set) => (setOrder(() => [...set.order]), setHidden(new Set(set.hidden)), setColumnBase(set.name))}
            onSaveNew={(name) => (setColumnSets((l) => [...l.filter((x) => x.name !== name), { name, order: [...order], hidden: [...hidden] }]), setColumnBase(name))}
            onUpdate={() => setColumnSets((l) => l.map((x) => (x.name === columnBase ? { ...x, order: [...order], hidden: [...hidden] } : x)))}
          />
        </Popover>
      )}
    </div>
  );
}

function ColumnsMenu({
  order,
  setOrder,
  hidden,
  setHidden,
  sets,
  base,
  onPick,
  onSaveNew,
  onUpdate,
}: {
  order: DragKey[];
  setOrder: (update: (order: DragKey[]) => DragKey[]) => void;
  hidden: Set<DragKey>;
  setHidden: (hidden: Set<DragKey>) => void;
  /** Saved column sets and the one the current columns started from */
  sets: ColumnSetup[];
  base: string | null;
  onPick: (set: ColumnSetup) => void;
  onSaveNew: (name: string) => void;
  onUpdate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [savedEl, setSavedEl] = useState<HTMLElement | null>(null);
  const current = sets.find((x) => setupKey(x.order, x.hidden) === setupKey(order, hidden))?.name;
  const edited = base && current !== base && sets.some((x) => x.name === base) ? base : null;
  const { drag, over, bind } = useDragDrop((id, target) =>
    setOrder((o) => {
      const at = o.indexOf(target as DragKey);
      const next = o.filter((k) => k !== id);
      next.splice(at, 0, id as DragKey);
      return next;
    }),
  );
  const all = order.filter((c): c is ColKey => c !== "name");
  const q = query.trim().toLowerCase();
  const list = all.filter((c) => COLS[c].label.toLowerCase().includes(q));
  const shownCount = all.filter((c) => !hidden.has(c)).length;
  const toggle = (c: ColKey) => {
    const next = new Set(hidden);
    if (next.has(c)) next.delete(c);
    else if (shownCount > 1) next.add(c);
    setHidden(next);
  };

  return (
    <>
      {/* Saved column sets, the same menu as saved filters and colour templates */}
      <div className={styles.columnsHead}>
        <span>Columns</span>
        <button type="button" className={styles.select} onClick={(e) => setSavedEl(savedEl ? null : e.currentTarget)}>
          <span>{current ?? (edited ? `${edited} · edited` : "Saved")}</span> <ChevronDown size={15} />
        </button>
      </div>
      <div className={styles.popSearch}>
        <Search size={14} />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." aria-label="Search columns" />
      </div>
      <div className={styles.columnsList}>
        {list.map((c) => (
          <div
            key={c}
            {...bind(c)}
            data-drop={c}
            className={styles.columnRow}
            data-dragging={drag?.id === c || undefined}
            data-over={over === c && drag ? (order.indexOf(drag.id as DragKey) < order.indexOf(c) ? "after" : "before") : undefined}
            style={drag?.id === c ? { transform: `translateY(${drag.y}px)` } : undefined}
          >
            <MenuRow icon={<GripVertical size={14} />} selected={!hidden.has(c)} onClick={() => toggle(c)}>
              {COLS[c].label}
            </MenuRow>
          </div>
        ))}
        {!list.length && <span className={styles.columnsEmpty}>Nothing found</span>}
      </div>
      {savedEl && (
        <SavedMenu
          anchor={savedEl}
          onClose={() => setSavedEl(null)}
          items={sets.map((x) => ({ name: x.name, preset: COLUMN_PRESETS.some((p) => p.name === x.name) }))}
          current={current}
          edited={edited}
          canSave
          nextName={() => {
            let n = 1;
            while (sets.some((x) => x.name === `My columns ${n}`)) n++;
            return `My columns ${n}`;
          }}
          saveLabel="Save new set"
          onPick={(name) => onPick(sets.find((x) => x.name === name)!)}
          onSaveNew={onSaveNew}
          onUpdate={onUpdate}
          onReset={() => edited && onPick(sets.find((x) => x.name === edited)!)}
        />
      )}
    </>
  );
}

function Counts({ list }: { list: Leaf[] }) {
  const good = list.filter((l) => l.status === "Active").length;
  const info = list.filter((l) => l.status === "Paused" || l.status === "Test").length;
  const bad = list.filter((l) => l.status === "Rejected").length;
  return (
    <span className={styles.counts} aria-label={`Active ${good}, paused or in test ${info}, rejected ${bad}`}>
      <i data-tone="good">{good}</i>
      <i data-tone="info">{info}</i>
      <i data-tone="bad">{bad}</i>
    </span>
  );
}

