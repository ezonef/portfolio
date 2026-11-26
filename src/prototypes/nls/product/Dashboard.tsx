"use client";

import { AlertTriangle, ArrowLeft, Percent, BarChart3, ChevronDown, ChevronLeft, ChevronRight, Hash, Info, LayoutGrid, LineChart, Search, Star, Table2, Users, Copy, Ellipsis, GripVertical, Maximize2, Plus, Settings, Trash2, TrendingDown, TrendingUp, Wallet, X, AreaChart } from "lucide-react";
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ACCOUNTS, FIELDS, STATUS_TONE, leafNodes, money, type Leaf } from "./data";
import { Filters, activeCount, emptyFilter, filterWith, matches, type FieldDef, type FilterState } from "./Filters";
import type { OpenDash, Template } from "./Dashboards";
import { ColorPicker, colorName, paintStyle } from "./ColorRules";
import { DataTable } from "./DataTable";
import { Avatar, MenuRow, Popover, Toggle, dragPanel, FilterButton, CountryFlag, BetaModal, Layer } from "./ui";
import { WORLD, WORLD_DOTS } from "./worldDots";
import styles from "./product.module.css";

type Kind = "online" | "roi" | "spend" | "map" | "chart" | "table" | "activity" | "metric" | "trend" | "top" | "alerts" | "geo" | "spark" | "countries" | "buyers" | "launches" | "calendar" | "balance" | "payments" | "donut";
type ChartMode = "line" | "area" | "bars" | "percent";
type Threshold = { value: string; color: string };
type MetricId = "spend" | "revenue" | "roas" | "cpa" | "purchases" | "aov";
type Widget = {
  id: string;
  kind: Kind;
  /** Columns of the 12-column grid and rows of one KPI card */
  c: number;
  r: number;
  chart?: ChartMode;
  /** For a metric card: which number it shows */
  metric?: MetricId;
  title?: string;
  /** Data source: one account, or every account when empty */
  account?: string | null;
  /** KPI cards show the change against the previous period */
  delta?: boolean;
  /** The widget's own colour coding: its number turns one colour above a value and another below */
  paint?: { above?: Threshold; below?: Threshold };
  /** Its cell on the grid: column and row it starts at. Filled in when the dashboard opens */
  x?: number;
  y?: number;
};

const overlap = (a: Widget, b: Widget) =>
  (a.x ?? 0) < (b.x ?? 0) + b.c && (b.x ?? 0) < (a.x ?? 0) + a.c && (a.y ?? 0) < (b.y ?? 0) + b.r && (b.y ?? 0) < (a.y ?? 0) + a.r;
/** Gives every widget without a cell the first free one, row by row */
function pack(list: Widget[]): Widget[] {
  const placed: Widget[] = list.filter((w) => w.x !== undefined && w.y !== undefined);
  return list.map((w) => {
    if (w.x !== undefined && w.y !== undefined) return w;
    for (let y = 0; ; y++)
      for (let x = 0; x + w.c <= 12; x++) {
        const at = { ...w, x, y };
        if (!placed.some((p) => overlap(p, at))) {
          placed.push(at);
          return at;
        }
      }
  });
}
/** Keeps one widget where it was put and moves whatever it covers down, one under another */
function settle(list: Widget[], fixedId: string): Widget[] {
  const fixed = list.find((w) => w.id === fixedId);
  if (!fixed) return list;
  const placed: Widget[] = [fixed];
  const moved = new Map<string, Widget>([[fixed.id, fixed]]);
  for (const w of [...list].filter((x) => x.id !== fixedId).sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))) {
    const at = { ...w };
    let hit = placed.find((p) => overlap(p, at));
    while (hit) {
      at.y = (hit.y ?? 0) + hit.r;
      hit = placed.find((p) => overlap(p, at));
    }
    placed.push(at);
    moved.set(at.id, at);
  }
  return list.map((w) => moved.get(w.id)!);
}
/**
 * Where a dragged widget lands. Moved sideways over a widget of the same height in its own row,
 * the two trade places (the left one goes right, the right one left) instead of one moving down.
 * Anything else keeps the dragged widget where it is put and moves what it covers down.
 */
function swapOrSettle(list: Widget[], self: Widget, cell: { x: number; y: number }): Widget[] {
  const at = { ...self, ...cell };
  // The widget under the dragged one's middle, in the same row and of the same height
  const mid = cell.x + self.c / 2;
  const other = cell.y === self.y ? list.find((w) => w.id !== self.id && w.y === self.y && w.r === self.r && (w.x ?? 0) <= mid && mid < (w.x ?? 0) + w.c) : undefined;
  if (other) {
    const sx = self.x ?? 0;
    const ox = other.x ?? 0;
    // In the row the pair keeps its span: whoever was left now starts where the pair started
    const start = Math.min(sx, ox);
    const first = ox < sx ? { ...self, x: start } : { ...other, x: start };
    const second = ox < sx ? { ...other, x: start + self.c } : { ...self, x: start + other.c };
    const swapped = list.map((w) => (w.id === first.id ? first : w.id === second.id ? second : w));
    return settle(swapped, self.id);
  }
  return settle(list.map((w) => (w.id === self.id ? at : w)), self.id);
}
const bottomOf = (list: Widget[]) => list.reduce((n, w) => Math.max(n, (w.y ?? 0) + w.r), 0);

// A 12-column grid, like the dashboards in ClickUp. Rows are the height of one KPI card.
// What a media buyer opens every morning: today's numbers, the trend, what needs a decision and what works.
const INITIAL: Widget[] = [
  { id: "m1", kind: "metric", metric: "spend", c: 2, r: 1, x: 0, y: 0 },
  { id: "m2", kind: "metric", metric: "revenue", c: 2, r: 1, x: 2, y: 0 },
  { id: "m3", kind: "metric", metric: "roas", c: 2, r: 1, x: 4, y: 0 },
  { id: "m4", kind: "metric", metric: "cpa", c: 2, r: 1, x: 6, y: 0 },
  { id: "m5", kind: "metric", metric: "purchases", c: 2, r: 1, x: 8, y: 0 },
  { id: "m6", kind: "metric", metric: "aov", c: 2, r: 1, x: 10, y: 0 },
  { id: "b1", kind: "trend", c: 7, r: 4, x: 0, y: 1 },
  { id: "b2", kind: "alerts", c: 5, r: 4, x: 7, y: 1 },
  { id: "b3", kind: "top", c: 7, r: 5, x: 0, y: 5 },
  { id: "b4", kind: "geo", c: 5, r: 2, x: 7, y: 5 },
  { id: "b5", kind: "activity", c: 5, r: 3, x: 7, y: 7 },
];
const PRESETS: Record<Template, Widget[]> = {
  stats: INITIAL,
  // Who is working and where the money goes, the headline numbers on the side, then what changed and by channel
  team: [
    { id: "t1", kind: "online", c: 3, r: 3, x: 0, y: 0 },
    { id: "t2", kind: "map", c: 7, r: 3, x: 3, y: 0 },
    { id: "t4", kind: "roi", c: 2, r: 1, x: 10, y: 0 },
    { id: "t5", kind: "spend", c: 2, r: 1, x: 10, y: 1 },
    { id: "t7", kind: "roi", c: 2, r: 1, x: 10, y: 2 },
    { id: "t3", kind: "activity", c: 6, r: 5, x: 0, y: 3 },
    { id: "t6", kind: "table", c: 6, r: 5, x: 6, y: 3 },
  ],
  // Two numbers and two charts on top, then the creatives and where they run, down to the bottom of the screen
  simple: [
    { id: "p1", kind: "spend", c: 3, r: 1, x: 0, y: 0 },
    { id: "p2", kind: "roi", c: 3, r: 1, x: 3, y: 0 },
    { id: "p3", kind: "chart", c: 6, r: 3, chart: "line", x: 6, y: 0 },
    { id: "p4", kind: "chart", c: 6, r: 2, chart: "bars", x: 0, y: 1 },
    { id: "p5", kind: "top", title: "Creatives", c: 6, r: 5, x: 0, y: 3 },
    { id: "p6", kind: "map", c: 6, r: 5, x: 6, y: 3 },
  ],
  // Budget: what is left and where it goes, how the money moved, and on which platforms
  budget: [
    { id: "g1", kind: "balance", c: 4, r: 2, x: 0, y: 0 },
    { id: "g2", kind: "donut", c: 4, r: 3, x: 0, y: 2 },
    { id: "g3", kind: "trend", chart: "area", title: "Spend and revenue", c: 8, r: 5, x: 4, y: 0 },
    { id: "g4", kind: "map", c: 4, r: 4, x: 0, y: 5 },
    { id: "g5", kind: "payments", c: 8, r: 4, x: 4, y: 5 },
  ],
  // The day at a glance: five numbers, the trend, what sells, and a narrow column of where, who and what changed
  daily: [
    { id: "h1", kind: "metric", metric: "purchases", c: 2, r: 1, x: 0, y: 0 },
    { id: "h2", kind: "metric", metric: "revenue", c: 2, r: 1, x: 2, y: 0 },
    { id: "h3", kind: "metric", metric: "roas", c: 2, r: 1, x: 4, y: 0 },
    { id: "h9", kind: "metric", metric: "spend", c: 2, r: 1, x: 6, y: 0 },
    { id: "h10", kind: "metric", metric: "cpa", c: 2, r: 1, x: 8, y: 0 },
    { id: "h4", kind: "trend", c: 10, r: 4, x: 0, y: 1 },
    { id: "h5", kind: "top", c: 10, r: 5, x: 0, y: 5 },
    { id: "h6", kind: "countries", c: 2, r: 4, x: 10, y: 0 },
    { id: "h7", kind: "buyers", c: 2, r: 3, x: 10, y: 4 },
    { id: "h8", kind: "activity", title: "Recent changes", c: 2, r: 3, x: 10, y: 7 },
  ],
  // Planning launches: four counters and the trend on top, where it runs, what goes live and when below
  launches: [
    { id: "l1", kind: "metric", metric: "purchases", c: 3, r: 1, x: 0, y: 0 },
    { id: "l2", kind: "metric", metric: "spend", c: 3, r: 1, x: 3, y: 0 },
    { id: "l3", kind: "metric", metric: "cpa", c: 3, r: 1, x: 0, y: 1 },
    { id: "l4", kind: "metric", metric: "revenue", c: 3, r: 1, x: 3, y: 1 },
    { id: "l5", kind: "trend", chart: "line", c: 6, r: 4, x: 6, y: 0 },
    { id: "l6", kind: "geo", title: "Countries", c: 3, r: 6, x: 0, y: 2 },
    { id: "l7", kind: "launches", c: 3, r: 6, x: 3, y: 2 },
    { id: "l8", kind: "calendar", c: 6, r: 4, x: 6, y: 4 },
  ],
  blank: [],
};
const COLUMNS = 12;
/** The ads the dashboard's filter lets through, with the account each belongs to */
type Row = Leaf & { id: string; name: string; account: string; workspace: string };
export const WORKSPACE_OF: Record<string, string> = { a1: "Main", a2: "Main", a3: "Test" };
export const WORKSPACES = ["Main", "Test"];
const ALL_ROWS: Row[] = ACCOUNTS.flatMap((a) =>
  leafNodes(a.children).map((n) => ({ ...n.leaf!, id: n.id, name: n.name, account: a.name, workspace: WORKSPACE_OF[a.id] ?? "Main" })),
);
const Rows = createContext<Row[]>(ALL_ROWS);

function stats(rows: Row[]) {
  const spend = rows.reduce((n, r) => n + r.spend, 0);
  const revenue = rows.reduce((n, r) => n + r.revenue, 0);
  const purchases = rows.reduce((n, r) => n + r.purchases, 0);
  return { spend, revenue, purchases, roas: spend ? revenue / spend : 0, cpa: purchases ? spend / purchases : 0, aov: purchases ? revenue / purchases : 0, roi: spend ? ((revenue - spend) / spend) * 100 : 0 };
}
const METRIC: Record<MetricId, { label: string; format: (s: ReturnType<typeof stats>) => string; delta: string; good: boolean }> = {
  spend: { label: "Spend", format: (s) => money(s.spend), delta: "+12%", good: true },
  revenue: { label: "Revenue", format: (s) => money(s.revenue), delta: "+18%", good: true },
  roas: { label: "ROAS", format: (s) => `${s.roas.toFixed(2)}×`, delta: "+0.3", good: true },
  cpa: { label: "CPA", format: (s) => money(s.cpa), delta: "+6%", good: false },
  purchases: { label: "Purchases", format: (s) => String(s.purchases), delta: "+9", good: true },
  aov: { label: "Average order", format: (s) => money(s.aov), delta: "−2%", good: false },
};
/** Spend and revenue over the last seven days, split from the period totals */
const DAYS = ["18.11", "19.11", "20.11", "21.11", "22.11", "23.11", "24.11"];
const SPEND_SHARE = [0.12, 0.13, 0.14, 0.15, 0.14, 0.15, 0.17];
const REVENUE_SHARE = [0.1, 0.12, 0.15, 0.14, 0.15, 0.16, 0.18];
const CPA_TARGET = 100;



const CATALOG: { kind: Kind; title: string; c: number; r: number }[] = [
  { kind: "chart", title: "Spend, CPA", c: 1, r: 3 },
  { kind: "roi", title: "ROI", c: 1, r: 1 },
  { kind: "spend", title: "Spend", c: 1, r: 1 },
  { kind: "map", title: "Spend on the map", c: 5, r: 3 },
  { kind: "spark", title: "Metric with trend", c: 3, r: 2 },
  { kind: "countries", title: "Top countries", c: 3, r: 4 },
  { kind: "buyers", title: "Top buyers", c: 3, r: 4 },
  { kind: "launches", title: "Launches", c: 5, r: 4 },
  { kind: "calendar", title: "Launch calendar", c: 4, r: 4 },
  { kind: "balance", title: "Budget left", c: 4, r: 2 },
  { kind: "payments", title: "Budget movements", c: 8, r: 4 },
  { kind: "donut", title: "Spend by platform", c: 4, r: 3 },
  { kind: "table", title: "Channels", c: 3, r: 5 },
  { kind: "activity", title: "Recent Activity", c: 1, r: 5 },
  { kind: "online", title: "Online", c: 1, r: 3 },
  { kind: "metric", title: "Metric", c: 2, r: 1 },
  { kind: "trend", title: "Spend and revenue by day", c: 8, r: 4 },
  { kind: "top", title: "Top creatives by ROAS", c: 7, r: 5 },
  { kind: "alerts", title: "Needs attention", c: 4, r: 4 },
  { kind: "geo", title: "Spend by geo", c: 5, r: 2 },
];
const titleOf = (k: Kind) => CATALOG.find((x) => x.kind === k)!.title;

const PEOPLE = ["Alex Smirnov", "Maria Ivanova", "Dmitry Petrov", "Elena Kuznetsova", "Sergey Sidorov", "Anna Fedorova", "Igor Vasiliev"];
const ACTIONS: [string, string, string, string][] = [
  ["MI", "Paused FB_Keto_IT_v2 (ROI -12%)", "Main flow", "20.11 14:32"],
  ["AF", "Launched FB_Keto_IT_v3 (ROI 15%)", "Test flow", "20.11 11:45"],
  ["EK", "Reviewed FB_Keto_IT_v1 (ROI 8%)", "Shared flow", "19.11 09:00"],
  ["MI", "Updated FB_Keto_IT_v4 (ROI 20%)", "New flow", "19.11 16:15"],
  ["AF", "Paused FB_Tech_Ad (ROI -5%)", "Tech flow", "18.11 10:00"],
  ["EK", "Launched FB_Tech_Ad_v2 (ROI 30%)", "Tech flow", "18.11 12:30"],
  ["MI", "Reviewed FB_Tech_Ad_v1 (ROI 12%)", "Analytics flow", "17.11 14:00"],
  ["AF", "Updated FB_Tech_Ad_v3 (ROI 25%)", "Test flow", "17.11 15:45"],
];
const CHANNELS: [string, string, string, string][] = [
  ["Facebook · PL", "+4% 49", "$8.3K", "96%"],
  ["Facebook · DE", "+2% 36", "$6.1K", "82%"],
  ["TikTok · IT", "+7% 52", "$5.4K", "69%"],
  ["TikTok · PL", "-1% 21", "$3.2K", "63%"],
  ["Google · US", "+5% 63", "$9.7K", "91%"],
  ["Google · DE", "+3% 28", "$2.9K", "52%"],
  ["Facebook · US", "+6% 44", "$7.8K", "88%"],
  ["Facebook · IT", "-2% 12", "$1.4K", "41%"],
  ["TikTok · US", "+1% 19", "$2.2K", "57%"],
  ["Google · PL", "+4% 31", "$3.6K", "74%"],
  ["Google · IT", "+2% 16", "$1.9K", "49%"],
  ["TikTok · DE", "+3% 24", "$2.7K", "66%"],
];
const SERIES = [[6200, 8500], [8900, 6300], [6200, 5800], [9700, 8500], [9500, 6500], [8700, 6400]];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

type Series = { label: string; values: number[]; tone: "main" | "soft" | "third"; format: (v: number) => string };
const LINE_CLASS = { main: "lineStrong", soft: "lineSoft", third: "lineThird" } as const;
const BAR_CLASS = { main: "barA", soft: "barB", third: "barC" } as const;

/** Measures an element, so a chart is drawn at the widget's real size instead of being stretched */
function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

/** Lines, grouped bars or 100% bars over the same labels; hovering a point shows its numbers */
function SeriesChart({ labels, series, mode, extra }: { labels: string[]; series: Series[]; mode: ChartMode; extra?: (i: number) => string }) {
  const [ref, { w, h }] = useBox<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const fillId = useId();
  const left = 56;
  const right = 12;
  const top = 12;
  const bottom = 28;
  const slot = (w - left - right) / labels.length;
  const x = (i: number) => left + slot * (i + 0.5);
  const totals = labels.map((_, i) => series.reduce((n, s) => n + s.values[i], 0));
  const max = mode === "percent" ? 100 : Math.max(1, ...series.flatMap((s) => s.values)) * 1.1;
  const y = (v: number) => top + (h - top - bottom) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => max * k);
  const share = (si: number, i: number) => (totals[i] ? (series[si].values[i] / totals[i]) * 100 : 0);
  const barW = Math.max(4, Math.min(22, (slot * 0.7) / (mode === "percent" ? 1 : series.length)));

  return (
    <div ref={ref} className={styles.seriesChart} onPointerLeave={() => setHover(null)}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} className={styles.chart} role="img" aria-label={series.map((s) => s.label).join(" and ")}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={left - 4} x2={w - right} y1={y(v)} y2={y(v)} className={styles.grid} />
              <text x={left - 10} y={y(v) + 4} textAnchor="end">{mode === "percent" ? `${Math.round(v)}%` : series[0].format(v)}</text>
            </g>
          ))}
          {hover !== null && <rect x={x(hover) - slot / 2} y={top} width={slot} height={h - top - bottom} className={styles.hoverBand} />}
          {mode === "area" && (
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className={styles.areaTop} />
                <stop offset="100%" className={styles.areaBottom} />
              </linearGradient>
            </defs>
          )}
          {/* An area chart is the line chart with the main series filled down to zero */}
          {mode === "area" && <polygon points={`${x(0)},${y(0)} ${series[0].values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} ${x(labels.length - 1)},${y(0)}`} fill={`url(#${CSS.escape(fillId)})`} />}
          {(mode === "line" || mode === "area") &&
            series.map((s) => (
              <g key={s.label}>
                <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} className={styles[LINE_CLASS[s.tone]]} />
                {s.tone !== "soft" && s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3.5} className={styles.linePoint} data-tone={s.tone} />)}
              </g>
            ))}
          {mode === "bars" &&
            labels.map((_, i) =>
              series.map((s, si) => {
                const bx = x(i) - (barW * series.length) / 2 + si * barW;
                return <rect key={`${i}-${si}`} x={bx + 1} y={y(s.values[i])} width={barW - 2} height={Math.max(0, y(0) - y(s.values[i]))} rx={3} className={styles[BAR_CLASS[s.tone]]} />;
              }),
            )}
          {mode === "percent" &&
            labels.map((_, i) => {
              let acc = 0;
              return series.map((s, si) => {
                const part = share(si, i);
                const yTop = y(acc + part);
                const bar = <rect key={`${i}-${si}`} x={x(i) - barW / 2} y={yTop} width={barW} height={Math.max(0, y(acc) - yTop)} className={styles[BAR_CLASS[s.tone]]} />;
                acc += part;
                return bar;
              });
            })}
          {labels.map((l, i) => (
            <text key={l} x={x(i)} y={h - 8} textAnchor="middle">{l}</text>
          ))}
          {labels.map((l, i) => (
            <rect key={`hit-${l}`} x={x(i) - slot / 2} y={0} width={slot} height={h} fill="transparent" onPointerEnter={() => setHover(i)} />
          ))}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <div className={styles.chartTip} style={{ left: Math.min(Math.max(8, x(hover) + 12), w - 180), top: 8 }} role="status">
          <b>{labels[hover]}</b>
          {series.map((s, si) => (
            <span key={s.label}>
              <i data-tone={s.tone} /> {s.label} <em>{mode === "percent" ? `${Math.round(share(si, hover))}%` : s.format(s.values[hover])}</em>
            </span>
          ))}
          {extra && <small>{extra(hover)}</small>}
        </div>
      )}
    </div>
  );
}

/** Where each geo sits on the map, as longitude and latitude */
const GEO_AT: Record<string, [number, number]> = { Poland: [19.4, 52], Germany: [10.4, 51.2], Italy: [12.5, 42.8], USA: [-98, 39], Spain: [-3.7, 40.2], France: [2.4, 46.6], UK: [-2, 53.5] };
const GEO_TREND: Record<string, number> = { Poland: 8, Germany: 4, Italy: -3, USA: 12, Spain: -6, France: 2, UK: 5 };
const LAND = WORLD_DOTS.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === "#" ? [[x, y] as const] : [])));
const spendBy = (rows: Row[]) =>
  [...new Set(rows.map((r) => r.geo))].map((g) => ({ g, spend: rows.filter((r) => r.geo === g).reduce((n, r) => n + r.spend, 0) })).sort((a, b) => b.spend - a.spend);

/** A dotted world map: one dot per patch of land, a circle on each country sized by its spend */
function GeoMap({ rows }: { rows: Row[] }) {
  const [ref, { w, h }] = useBox<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const geos = spendBy(rows).filter((x) => GEO_AT[x.g]);
  const max = Math.max(1, ...geos.map((x) => x.spend));
  const cell = Math.min(w / WORLD.cols, h / WORLD.rows);
  const ox = (w - cell * WORLD.cols) / 2;
  const oy = (h - cell * WORLD.rows) / 2;
  const at = ([lon, lat]: [number, number]) => [
    ox + ((lon - WORLD.west) / (WORLD.east - WORLD.west)) * WORLD.cols * cell,
    oy + ((WORLD.north - lat) / (WORLD.north - WORLD.south)) * WORLD.rows * cell,
  ];
  const tip = geos.find((x) => x.g === hover);
  return (
    <div ref={ref} className={styles.geoMap} onPointerLeave={() => setHover(null)}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={`Spend by country: ${geos.map((x) => `${x.g} ${money(x.spend)}`).join(", ")}`}>
          {LAND.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={ox + (x + 0.5) * cell} cy={oy + (y + 0.5) * cell} r={cell * 0.32} className={styles.mapLand} />
          ))}
          {/* Bigger circles first, so a small country is never hidden under a big one */}
          {geos.map((x) => {
            const [cx, cy] = at(GEO_AT[x.g]);
            return (
              <circle
                key={x.g}
                cx={cx}
                cy={cy}
                r={Math.max(3, cell * (0.9 + 2.6 * Math.sqrt(x.spend / max)))}
                className={styles.mapSpot}
                data-hover={hover === x.g || undefined}
                onPointerEnter={() => setHover(x.g)}
              />
            );
          })}
        </svg>
      )}
      {tip && (
        <div className={styles.chartTip} style={{ left: Math.min(at(GEO_AT[tip.g])[0] + 14, w - 170), top: Math.max(6, at(GEO_AT[tip.g])[1] - 30) }} role="status">
          <b><CountryFlag country={tip.g} /> {tip.g}</b>
          <span>Spend <em>{money(tip.spend)}</em></span>
        </div>
      )}
    </div>
  );
}

const DONUT_TONE = ["main", "third", "soft"] as const;
/** Shares of a total as a ring, with the total in the middle and a legend beside it */
function Donut({ parts, total }: { parts: { label: string; value: number }[]; total: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const sum = parts.reduce((n, p) => n + p.value, 0) || 1;
  const r = 15.915; // circumference 100, so dash lengths are percentages
  let acc = 0;
  return (
    <div className={styles.donut} onPointerLeave={() => setHover(null)}>
      <svg viewBox="0 0 42 42" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / sum) * 100)}%`).join(", ")}>
        <circle cx="21" cy="21" r={r} className={styles.donutTrack} />
        {parts.map((p, i) => {
          const len = (p.value / sum) * 100;
          // A small gap between parts, so neighbours never merge
          const seg = (
            <circle
              key={p.label}
              cx="21"
              cy="21"
              r={r}
              className={styles.donutPart}
              data-tone={DONUT_TONE[i % 3]}
              data-dim={(hover && hover !== p.label) || undefined}
              strokeDasharray={`${Math.max(0, len - 1)} ${100 - Math.max(0, len - 1)}`}
              strokeDashoffset={25 - acc}
              onPointerEnter={() => setHover(p.label)}
            />
          );
          acc += len;
          return seg;
        })}
      </svg>
      <div className={styles.donutMid}>
        <strong>{hover ? `${Math.round(((parts.find((p) => p.label === hover)?.value ?? 0) / sum) * 100)}%` : total}</strong>
        <small>{hover ?? "Total"}</small>
      </div>
      <ul className={styles.donutLegend}>
        {parts.map((p, i) => (
          <li key={p.label} data-dim={(hover && hover !== p.label) || undefined} onPointerEnter={() => setHover(p.label)}>
            <i data-tone={DONUT_TONE[i % 3]} /> {p.label} <em>{money(p.value)}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The last seven days of one metric as a thin line */
function Sparkline({ values, bad }: { values: number[]; bad?: boolean }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - lo) / (hi - lo || 1)) * 24}`).join(" ");
  return (
    <svg className={styles.spark} viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden data-bad={bad || undefined}>
      <polyline points={pts} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
const dayValues = (s: ReturnType<typeof stats>, m: MetricId) =>
  DAYS.map((_, i) => {
    const spend = s.spend * SPEND_SHARE[i];
    const revenue = s.revenue * REVENUE_SHARE[i];
    const purchases = s.purchases * REVENUE_SHARE[i];
    return { spend, revenue, purchases, roas: spend ? revenue / spend : 0, cpa: purchases ? spend / purchases : 0, aov: purchases ? revenue / purchases : 0 }[m];
  });

/** Money in and out of the ad accounts: top-ups, spend and refunds */
const PAYMENTS: { id: string; date: string; text: string; kind: "Top-up" | "Spend" | "Refund"; amount: number }[] = [
  { id: "p1", date: "24.11", text: "Top-up · Account 4821", kind: "Top-up", amount: 3000 },
  { id: "p2", date: "24.11", text: "Daily spend · Facebook", kind: "Spend", amount: -1180 },
  { id: "p3", date: "23.11", text: "Daily spend · TikTok", kind: "Spend", amount: -640 },
  { id: "p4", date: "22.11", text: "Refund · rejected ad", kind: "Refund", amount: 120 },
  { id: "p5", date: "21.11", text: "Top-up · Account 7306", kind: "Top-up", amount: 2000 },
  { id: "p6", date: "20.11", text: "Daily spend · Google", kind: "Spend", amount: -910 },
  { id: "p7", date: "19.11", text: "Top-up · Account 1954", kind: "Top-up", amount: 1500 },
];
const PAYMENT_TONE = { "Top-up": "good", Spend: "muted", Refund: "info" } as const;
/** Launch days of the month, with what goes live on them */
const LAUNCH_DAYS: Record<number, number> = { 3: 2, 7: 1, 12: 3, 18: 1, 20: 2, 24: 1, 27: 2, 30: 1 };
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** A month with launch days marked; the arrows switch months, a click picks a day */
function LaunchCalendar() {
  const [month, setMonth] = useState(new Date(2026, 10, 1));
  const [day, setDay] = useState(26);
  const first = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const isNov = month.getMonth() === 10 && month.getFullYear() === 2026;
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <div className={styles.calendar}>
      <header>
        <strong>{month.toLocaleString("en-US", { month: "long", year: "numeric" })}</strong>
        <button type="button" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={15} /></button>
        <button type="button" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={15} /></button>
      </header>
      <div className={styles.calGrid} role="grid">
        {WEEKDAYS.map((d) => <small key={d}>{d}</small>)}
        {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: count }, (_, i) => i + 1).map((d) => {
          const launches = isNov ? LAUNCH_DAYS[d] : undefined;
          return (
            <button key={d} type="button" aria-pressed={isNov && d === day} aria-label={`${d}${launches ? `, ${launches} launches` : ""}`} onClick={() => setDay(d)}>
              {d}
              {launches && <i />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The colour a widget's own rule gives a number: above wins over below */
function thresholdColor(w: Widget, v: number) {
  const above = w.paint?.above;
  const below = w.paint?.below;
  const num = (x?: Threshold) => (x ? parseFloat(x.value.replace(",", ".")) : NaN);
  if (above && v > num(above)) return above.color;
  if (below && v < num(below)) return below.color;
  return undefined;
}

function Body({ w }: { w: Widget }) {
  const shared = useContext(Rows);
  const rows = w.account ? ALL_ROWS.filter((r) => r.account === w.account) : shared;
  const s = stats(rows);
  switch (w.kind) {
    case "metric": {
      const m = METRIC[w.metric ?? "spend"];
      return (
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>{w.title ?? m.label}</span>
          <strong>
            <span className={styles.kpiValue} style={paintStyle(thresholdColor(w, s[w.metric ?? "spend"]))}>{rows.length ? m.format(s) : "—"}</span>{" "}
            {w.delta !== false && <em data-bad={!m.good || undefined}>{m.delta}</em>}
          </strong>
        </div>
      );
    }
    case "trend":
      return (
        <div className={styles.trend}>
          <p className={styles.trendLegend}><i data-k="revenue" /> Revenue <i data-k="spend" /> Spend <i data-k="profit" /> Profit</p>
          <SeriesChart
            labels={DAYS}
            mode={w.chart ?? "line"}
            series={[
              { label: "Revenue", tone: "main", values: REVENUE_SHARE.map((k) => s.revenue * k), format: money },
              { label: "Spend", tone: "soft", values: SPEND_SHARE.map((k) => s.spend * k), format: money },
              { label: "Profit", tone: "third", values: DAYS.map((_, i) => s.revenue * REVENUE_SHARE[i] - s.spend * SPEND_SHARE[i]), format: money },
            ]}
            extra={(i) => `ROAS ${(s.spend ? (s.revenue * REVENUE_SHARE[i]) / (s.spend * SPEND_SHARE[i]) : 0).toFixed(2)}×`}
          />
        </div>
      );
    case "alerts": {
      const list = [
        ...rows.filter((r) => r.purchases && r.spend / r.purchases > CPA_TARGET).map((r) => ({ id: `cpa-${r.id}`, tone: "bad", text: `CPA ${money(r.spend / r.purchases)} above the ${money(CPA_TARGET)} target`, name: r.name })),
        ...rows.filter((r) => r.status === "Rejected").map((r) => ({ id: `rej-${r.id}`, tone: "bad", text: "Rejected by moderation", name: r.name })),
        ...rows.filter((r) => r.budget && r.spend / r.budget > 0.9 && r.status === "Active").map((r) => ({ id: `bud-${r.id}`, tone: "warn", text: `Budget spent: ${Math.round((r.spend / r.budget) * 100)}%`, name: r.name })),
      ];
      return list.length ? (
        <ul className={styles.alerts}>
          {list.map((a) => (
            <li key={a.id} data-tone={a.tone}>
              <AlertTriangle size={15} />
              <span><b>{a.name}</b><small>{a.text}</small></span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.widgetEmpty}>All good, nothing to decide</p>
      );
    }
    case "top": {
      const top = [...rows].filter((r) => r.spend).sort((a, b) => b.revenue / b.spend - a.revenue / a.spend).slice(0, 8);
      return (
        <div className={styles.widgetTable}>
          <DataTable
            label="creatives"
            selectable={false}
            rows={top}
            rowId={(r) => r.id}
            columns={[
              { key: "name", label: "Creative", sort: (r) => r.name, render: (r) => <span className={styles.miniName}>{r.name}</span> },
              { key: "account", label: "Account", width: 130, sort: (r) => r.account, render: (r) => r.account },
              { key: "spend", label: "Spend", width: 100, sort: (r) => r.spend, render: (r) => money(r.spend) },
              { key: "cpa", label: "CPA", width: 90, sort: (r) => (r.purchases ? r.spend / r.purchases : Infinity), render: (r) => (r.purchases ? money(r.spend / r.purchases) : "—") },
              { key: "roas", label: "ROAS", width: 90, sort: (r) => r.revenue / r.spend, render: (r) => <span className={styles.kpiValue} style={paintStyle(thresholdColor(w, r.revenue / r.spend))}>{(r.revenue / r.spend).toFixed(2)}×</span> },
            ]}
            menu={(r, close) => (
              <MenuRow icon={<Copy size={16} />} onClick={() => (void navigator.clipboard?.writeText(r.name).catch(() => {}), close())}>Copy name</MenuRow>
            )}
          />
        </div>
      );
    }
    case "geo": {
      const geos = [...new Set(rows.map((r) => r.geo))].map((g) => ({ g, spend: rows.filter((r) => r.geo === g).reduce((n, r) => n + r.spend, 0) })).sort((a, b) => b.spend - a.spend);
      const max = Math.max(1, ...geos.map((x) => x.spend));
      return (
        <ul className={styles.geo}>
          {geos.map((x) => (
            <li key={x.g}>
              <span><CountryFlag country={x.g} /> {x.g}</span>
              <i><b style={{ width: `${(x.spend / max) * 100}%` }} /></i>
              <em>{money(x.spend)}</em>
            </li>
          ))}
        </ul>
      );
    }
    case "online":
      return (
        <ul className={styles.people}>
          {PEOPLE.map((p) => (
            <li key={p}>
              <span className={styles.onlineDot}><Avatar text={p.split(" ").map((x) => x[0]).join("")} size={28} /></span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      );
    case "roi":
    case "spend":
      return (
        // Drawn like every metric card: label, then the number and its change
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>{w.title ?? (w.kind === "roi" ? "ROI" : "Spend")}</span>
          <strong>
            {w.kind === "roi" ? `${Math.round(s.roi)}%` : money(s.spend)} {w.delta !== false && <em>{w.kind === "roi" ? "+10%" : "+24%"}</em>}
          </strong>
        </div>
      );
    case "map":
      return <GeoMap rows={rows} />;
    case "donut": {
      const parts = [...new Set(rows.map((r) => r.source))]
        .map((src) => ({ label: src, value: rows.filter((r) => r.source === src).reduce((n, r) => n + r.spend, 0) }))
        .sort((a, b) => b.value - a.value);
      return <Donut parts={parts} total={money(s.spend)} />;
    }
    case "spark": {
      const id = w.metric ?? "revenue";
      const m = METRIC[id];
      return (
        <div className={styles.sparkCard}>
          <span className={styles.kpiLabel}>{w.title ?? m.label}</span>
          <strong className={styles.sparkValue} style={paintStyle(thresholdColor(w, s[id]))}>{rows.length ? m.format(s) : "—"}</strong>
          <span className={styles.sparkFoot}>
            {w.delta !== false && <em data-bad={!m.good || undefined}>{m.delta}</em>}
            <small>last 7 days</small>
            <Sparkline values={dayValues(s, id)} bad={!m.good} />
          </span>
        </div>
      );
    }
    case "countries": {
      const geos = spendBy(rows);
      return (
        <div className={styles.countries}>
          <p><strong>{money(geos.reduce((n, x) => n + x.spend, 0))}</strong><small>Spend, 7 days</small></p>
          <ul>
            {geos.map((x) => (
              <li key={x.g}>
                <CountryFlag country={x.g} />
                <span>{x.g}</span>
                {(GEO_TREND[x.g] ?? 0) >= 0 ? <TrendingUp size={14} data-tone="good" aria-label="Up" /> : <TrendingDown size={14} data-tone="bad" aria-label="Down" />}
                <em>{money(x.spend)}</em>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "buyers": {
      const list = [...new Set(rows.flatMap((r) => r.buyer))]
        .map((b) => {
          const own = rows.filter((r) => r.buyer.includes(b));
          return { b, ads: own.length, revenue: own.reduce((n, r) => n + r.revenue, 0) };
        })
        .sort((a, z) => z.revenue - a.revenue);
      return (
        <ul className={styles.rankList}>
          {list.map((x) => (
            <li key={x.b}>
              <Avatar text={x.b.split(" ").map((p) => p[0]).join("")} size={28} />
              <span><b>{x.b}</b><small>{x.ads} {x.ads === 1 ? "ad" : "ads"}</small></span>
              <em>{money(x.revenue)}</em>
            </li>
          ))}
        </ul>
      );
    }
    case "launches":
      return (
        <ul className={styles.rankList}>
          {rows.slice(0, 8).map((r, i) => (
            <li key={r.id}>
              <span className={styles.launchMark}><CountryFlag country={r.geo} /></span>
              <span><b>{r.name}</b><small>{money(r.budget)} budget · {r.geo}</small></span>
              <span className={styles.launchSide}>
                <small>{`${String(18 + ((i * 3) % 12)).padStart(2, "0")}.11`}</small>
                <span>
                  <span className={styles.status} data-tone={STATUS_TONE[r.status]}>{r.status}</span>
                  <span className={styles.status} data-tone="muted">{r.source}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      );
    case "calendar":
      return <LaunchCalendar />;
    case "balance": {
      const budget = rows.reduce((n, r) => n + r.budget, 0);
      const left = Math.max(0, budget - s.spend);
      const used = budget ? Math.min(100, (s.spend / budget) * 100) : 0;
      return (
        <div className={styles.balance}>
          <span className={styles.balanceIcon}><Wallet size={16} /></span>
          <strong>{money(left)}</strong>
          <small>{w.title ?? "Budget left"} · of {money(budget)}</small>
          <i aria-label={`${Math.round(used)}% spent`}><b style={{ width: `${used}%` }} /></i>
        </div>
      );
    }
    case "payments":
      return (
        <div className={styles.widgetTable}>
          <DataTable
            label="budget movements"
            selectable={false}
            rows={PAYMENTS}
            rowId={(r) => r.id}
            columns={[
              { key: "date", label: "Date", width: 90, sort: (r) => r.date.split(".").reverse().join(""), render: (r) => r.date },
              { key: "text", label: "Description", sort: (r) => r.text, render: (r) => <span className={styles.miniName}>{r.text}</span> },
              { key: "kind", label: "Category", width: 130, sort: (r) => r.kind, render: (r) => <span className={styles.status} data-tone={PAYMENT_TONE[r.kind]}>{r.kind}</span> },
              { key: "amount", label: "Amount", width: 110, sort: (r) => r.amount, render: (r) => <span className={styles.amount} data-in={r.amount > 0 || undefined}>{r.amount > 0 ? "+" : "−"}{money(Math.abs(r.amount))}</span> },
            ]}
            menu={(r, close) => (
              <MenuRow icon={<Copy size={16} />} onClick={() => (void navigator.clipboard?.writeText(r.text).catch(() => {}), close())}>Copy description</MenuRow>
            )}
          />
        </div>
      );
    case "chart":
      return (
        <div className={styles.trend}>
          <SeriesChart
            labels={MONTHS}
            mode={w.chart ?? "bars"}
            series={[
              { label: "Spend", tone: "main", values: SERIES.map((p) => p[0]), format: (v) => `$${Math.round(v).toLocaleString("en-US")}` },
              { label: "CPA", tone: "soft", values: SERIES.map((p) => p[1]), format: (v) => `$${Math.round(v).toLocaleString("en-US")}` },
            ]}
          />
        </div>
      );
    case "table":
      return (
        <div className={styles.widgetTable}>
          <DataTable
            label="channels"
            selectable={false}
            rows={CHANNELS}
            rowId={(r) => r[0]}
            columns={[
              { key: "name", label: "Channel", sort: (r) => r[0], render: (r) => <span className={styles.miniName}><Avatar text={r[0].slice(0, 2)} size={24} />{r[0]}</span> },
              { key: "trend", label: "Trend", width: 120, render: (r) => r[1] },
              { key: "spend", label: "Spend", width: 110, render: (r) => r[2] },
              { key: "quality", label: "Quality", width: 110, render: (r) => r[3] },
            ]}
            menu={(r, close) => (
              <MenuRow icon={<Copy size={16} />} onClick={() => (void navigator.clipboard?.writeText(r[0]).catch(() => {}), close())}>Copy name</MenuRow>
            )}
          />
        </div>
      );
    case "activity":
      return (
        <ul className={styles.activity}>
          {ACTIONS.map(([a, t, f, d]) => (
            <li key={t}>
              <Avatar text={a} size={26} />
              <span><b>{t}</b><small>{f}<time>{d}</time></small></span>
            </li>
          ))}
        </ul>
      );
  }
}

type Menu = { el: HTMLElement; id: string; kind: "actions" };
type Edge = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";
const EDGES: Edge[] = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
const EDGE_CURSOR: Record<Edge, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };
const MAX_ROWS = 8;
/** Cards that are one number: no header, and they can be a single row tall */
const isKpi = (w: Widget) => w.kind === "roi" || w.kind === "spend" || w.kind === "metric" || w.kind === "spark" || w.kind === "balance";

function WidgetContent({ w }: { w: Widget }) {
  return (
    <>
      {!isKpi(w) && <h3>{w.title ?? titleOf(w.kind)}{w.kind === "alerts" && <AlertTriangle size={15} />}{w.kind === "online" && <em>14</em>}</h3>}
      <div className={styles.widgetBody}><Body w={w} /></div>
    </>
  );
}

export function Dashboard({
  dash,
  accounts,
  onBack,
  dashboards = [],
  onSwitch,
  openFiltersSignal,
  onAccountPicked,
}: {
  dash: OpenDash;
  accounts: string[];
  onBack?: () => void;
  /** Other dashboards to jump to from the breadcrumb */
  dashboards?: OpenDash[];
  onSwitch?: (d: OpenDash) => void;
  /** Opens the filter from outside, like the onboarding does */
  openFiltersSignal?: number;
  /** Tells whether an account is picked in the filter */
  onAccountPicked?: (picked: boolean) => void;
}) {
  const [items, setItems] = useState<Widget[]>(() => pack(PRESETS[dash.template]));
  // The same filter as on the table, with the account added as the first field
  const fields: FieldDef[] = [{ key: "workspace", label: "Workspace", options: WORKSPACES }, { key: "account", label: "Account", options: accounts }, ...FIELDS];
  const [filter, setFilter] = useState<FilterState>(() => (dash.account ? filterWith({ account: [dash.account] }, fields) : emptyFilter(fields)));
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    // The onboarding can pick the account for the viewer
    if (!dash.account) return;
    setFilter((f) => ({ ...f, mode: "simple", simple: { ...f.simple, account: { op: "is", values: [dash.account!] } } }));
  }, [dash.account]);
  const active = activeCount(filter);
  const rows = ALL_ROWS.filter((r) => matches(r, filter, { account: r.account, workspace: r.workspace }));
  const accountPicked = filter.mode === "simple" ? (filter.simple.account?.values.length ?? 0) > 0 : filter.groups.some((g) => g.conds.some((c) => c.field === "account" && c.values.length > 0));
  useEffect(() => onAccountPicked?.(accountPicked), [accountPicked, onAccountPicked]);
  useEffect(() => {
    if (openFiltersSignal) setFiltersOpen(true);
  }, [openFiltersSignal]);
  const [menu, setMenu] = useState<Menu | null>(null);
  // The breadcrumb's dashboard name opens a list of dashboards to jump to
  const [switchEl, setSwitchEl] = useState<HTMLElement | null>(null);
  const [switchQuery, setSwitchQuery] = useState("");
  // Widget settings and adding widgets are not out yet: their buttons say so instead of opening them
  const [beta, setBeta] = useState<string | null>(null);
  const [full, setFull] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ w: Widget; at: number } | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const seq = useRef(100);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const current = menu?.id ? items.find((w) => w.id === menu.id) : undefined;
  const fullWidget = items.find((w) => w.id === full);
  const toBottom = () => requestAnimationFrame(() => scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" }));

  const duplicate = (w: Widget) => {
    seq.current += 1;
    setItems((l) => [...l, { ...w, id: `w${seq.current}`, x: 0, y: bottomOf(l) }]);
    setMenu(null);
    toBottom();
  };
  const remove = (w: Widget) => {
    const at = items.findIndex((x) => x.id === w.id);
    setItems((l) => l.filter((x) => x.id !== w.id));
    setUndo({ w, at });
    setMenu(null);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  };
  const restore = () => {
    if (!undo) return;
    setItems((l) => settle([...l.slice(0, undo.at), undo.w, ...l.slice(undo.at)], undo.w.id));
    setUndo(null);
  };
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const editingWidget = editing ? items.find((w) => w.id === editing) : undefined;
  const add = (w: Omit<Widget, "id">) => {
    seq.current += 1;
    setItems((l) => [...l, { ...w, id: `w${seq.current}`, x: 0, y: bottomOf(l) }]);
    setAdding(false);
    toBottom();
  };
  const patch = (id: string, p: Partial<Widget>) =>
    setItems((l) => settle(l.map((w) => (w.id === id ? { ...w, ...p, x: Math.max(0, Math.min(p.x ?? w.x ?? 0, COLUMNS - (p.c ?? w.c))) } : w)), id));

  const grid = useRef<HTMLDivElement>(null);
  // The card that follows the pointer while a widget is moved or resized; its grid cell shows where it lands
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; w: number; h: number } | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  // While a widget is moved or resized, its neighbours glide to their new places
  const live = useRef(false);
  const places = useRef(new Map<string, { x: number; y: number }>());
  const cards = () => [...(grid.current?.querySelectorAll<HTMLElement>("[data-widget]") ?? [])];
  const remember = () => {
    places.current = new Map(cards().map((el) => [el.dataset.widget!, { x: el.offsetLeft, y: el.offsetTop }]));
  };
  useLayoutEffect(() => {
    if (!live.current) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, { x: number; y: number }>();
    for (const el of cards()) {
      const id = el.dataset.widget!;
      const at = { x: el.offsetLeft, y: el.offsetTop };
      next.set(id, at);
      const was = places.current.get(id);
      if (!was || still) continue;
      // Starts from where the card is on screen, so a move that interrupts another stays smooth
      const shown = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      const dx = was.x + shown.m41 - at.x;
      const dy = was.y + shown.m42 - at.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.getAnimations().forEach((a) => a.cancel());
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 200, easing: "cubic-bezier(.2, .8, .2, 1)" });
    }
    places.current = next;
  }, [items]);

  /**
   * Scrolls the dashboard while the pointer rests near its top or bottom edge, so a widget can be moved
   * or stretched past what is on screen. After each step the drag runs again from the last pointer position.
   */
  const autoScroll = (again: () => void) => {
    let y: number | null = null;
    let raf = 0;
    const tick = () => {
      const el = scroll.current;
      if (el && y !== null) {
        const r = el.getBoundingClientRect();
        const zone = 56;
        const push = y < r.top + zone ? y - (r.top + zone) : y > r.bottom - zone ? y - (r.bottom - zone) : 0;
        if (push) {
          const was = el.scrollTop;
          el.scrollTop += Math.max(-22, Math.min(22, push * 0.4));
          if (el.scrollTop !== was) again();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return { at: (clientY: number) => (y = clientY), stop: () => cancelAnimationFrame(raf) };
  };

  const startMove = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    const box = grid.current;
    const card = e.currentTarget.closest<HTMLElement>("[data-widget]");
    if (e.button !== 0 || e.pointerType === "touch" || !box || !card) return;
    e.preventDefault();
    const scale = box.getBoundingClientRect().width / box.offsetWidth || 1;
    const local = (ev: { clientX: number; clientY: number }) => {
      const r = box.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale };
    };
    const start = local(e);
    const grab = { x: start.x - card.offsetLeft, y: start.y - card.offsetTop };
    const css = getComputedStyle(box);
    const gap = parseFloat(css.columnGap) || 0;
    const rowH = parseFloat(css.gridAutoRows) || 88;
    const track = (box.offsetWidth - gap * (COLUMNS - 1)) / COLUMNS;
    const self = items.find((x) => x.id === id)!;
    let cell = { x: self.x ?? 0, y: self.y ?? 0 };
    const size = { w: card.offsetWidth, h: card.offsetHeight };
    const before = items;
    let moving = false;
    let last: PointerEvent | null = null;
    const edge = autoScroll(() => last && move(last));

    const move = (ev: PointerEvent) => {
      last = ev;
      edge.at(ev.clientY);
      const p = local(ev);
      if (!moving) {
        if (Math.hypot(p.x - start.x, p.y - start.y) < 3) return;
        moving = true;
        remember();
        live.current = true;
      }
      setDrag({ id, x: p.x - grab.x, y: p.y - grab.y, ...size });
      // The widget takes the grid cell under its top-left corner, and anything there moves down
      const left = p.x - grab.x;
      const top = p.y - grab.y;
      const next = {
        x: Math.max(0, Math.min(COLUMNS - self.c, Math.round(left / (track + gap)))),
        y: Math.max(0, Math.round(top / (rowH + gap))),
      };
      if (next.x === cell.x && next.y === cell.y) return;
      cell = next;
      // Always from the layout before the drag, so widgets it passed over go back to their places
      setItems(swapOrSettle(before, self, next));
    };
    const finish = () => {
      edge.stop();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("keydown", key, true);
      setDrag(null);
      setTimeout(() => (live.current = false), 0);
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      ev.stopPropagation();
      setItems(before);
      finish();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("keydown", key, true);
  };

  const nudge = (e: ReactKeyboardEvent, id: string) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!step) return;
    e.preventDefault();
    const w = items.find((x) => x.id === id)!;
    remember();
    live.current = true;
    patch(id, { x: (w.x ?? 0) + step[0], y: Math.max(0, (w.y ?? 0) + step[1]) });
    setTimeout(() => (live.current = false), 0);
  };

  const startResize = (e: ReactPointerEvent<HTMLElement>, w: Widget, edge: Edge) => {
    const box = grid.current;
    const card = e.currentTarget.closest<HTMLElement>("[data-widget]");
    if (e.button !== 0 || e.pointerType === "touch" || !box || !card) return;
    e.preventDefault();
    e.stopPropagation();
    const scale = box.getBoundingClientRect().width / box.offsetWidth || 1;
    // Pointer in grid coordinates: the grid moves with the scroll, so stretching keeps up while the page scrolls
    const local = (ev: { clientX: number; clientY: number }) => {
      const r = box.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale };
    };
    const css = getComputedStyle(box);
    const gap = parseFloat(css.columnGap) || 0;
    const rowH = parseFloat(css.gridAutoRows) || 88;
    const track = (box.offsetWidth - gap * (COLUMNS - 1)) / COLUMNS;
    const tallest = MAX_ROWS * (rowH + gap) - gap;
    const dirX = edge.includes("e") ? 1 : edge.includes("w") ? -1 : 0;
    const dirY = edge.includes("s") ? 1 : edge.includes("n") ? -1 : 0;
    const start = local(e);
    const from = { x: start.x, y: start.y, left: card.offsetLeft, top: card.offsetTop, w: card.offsetWidth, h: card.offsetHeight };
    const minRows = isKpi(w) ? 1 : 2;
    const startCell = { x: w.x ?? 0, y: w.y ?? 0 };
    const base = items;
    let now = { c: w.c, r: w.r };

    remember();
    live.current = true;
    setResizing(w.id);
    box.dataset.resizing = "true";
    box.style.cursor = EDGE_CURSOR[edge];
    let last: PointerEvent | null = null;
    const edgeScroll = autoScroll(() => last && move(last));
    const move = (ev: PointerEvent) => {
      last = ev;
      if (dirY) edgeScroll.at(ev.clientY);
      const p = local(ev);
      let { c, r } = now;
      // The card follows the pointer freely, and its cell snaps to the nearest columns and rows
      const rawW = Math.max(track, Math.min(box.offsetWidth, from.w + dirX * (p.x - from.x)));
      const rawH = Math.max(rowH, Math.min(tallest, from.h + dirY * (p.y - from.y)));
      setDrag({ id: w.id, x: dirX < 0 ? from.left + from.w - rawW : from.left, y: dirY < 0 ? from.top + from.h - rawH : from.top, w: rawW, h: rawH });
      if (dirX) c = Math.max(2, Math.min(COLUMNS, Math.round((rawW + gap) / (track + gap))));
      if (dirY) r = Math.max(minRows, Math.min(MAX_ROWS, Math.round((rawH + gap) / (rowH + gap))));
      if (c === now.c && r === now.r) return;
      now = { c, r };
      // Pulling the left or top edge keeps the opposite edge in place
      const x = dirX < 0 ? Math.max(0, startCell.x + w.c - c) : startCell.x;
      const y = dirY < 0 ? Math.max(0, startCell.y + w.r - r) : startCell.y;
      setItems(settle(base.map((i) => (i.id === w.id ? { ...i, ...now, x, y } : i)), w.id));
    };
    const finish = () => {
      edgeScroll.stop();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      delete box.dataset.resizing;
      box.style.cursor = "";
      setResizing(null);
      setDrag(null);
      setTimeout(() => (live.current = false), 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };
  const dragged = drag ? items.find((x) => x.id === drag.id) : undefined;

  const tools = (w: Widget): ReactNode => (
    <div className={styles.widgetTools} data-open={menu?.id === w.id || undefined}>
      <button type="button" aria-label={`Actions: ${titleOf(w.kind)}`} onClick={(e) => setMenu({ el: e.currentTarget, id: w.id, kind: "actions" })}>
        <Ellipsis size={15} />
      </button>
      <button type="button" aria-label={`Settings: ${titleOf(w.kind)}`} onClick={() => (setMenu(null), setBeta("Widget settings"))}>
        <Settings size={14} />
      </button>
    </div>
  );

  return (
    <Rows.Provider value={rows}>
    <div className={styles.dash}>
      <header className={`${styles.dashHead} ${styles.floatingBar}`}>
        <nav className={styles.glass} aria-label="Path">
          {onBack ? <button type="button" className={styles.crumbLink} onClick={onBack}>Dashboards</button> : <span>Dashboards</span>}
          <ChevronRight size={14} />
          {onSwitch && dashboards.length ? (
            <button type="button" className={styles.crumbCurrent} aria-haspopup="menu" aria-expanded={!!switchEl} onClick={(e) => (setSwitchQuery(""), setSwitchEl(switchEl ? null : e.currentTarget))}>
              {dash.title} <ChevronDown size={14} />
            </button>
          ) : (
            <strong>{dash.title}</strong>
          )}
        </nav>
        {switchEl && (
          <Popover anchor={switchEl} onClose={() => setSwitchEl(null)} width={320}>
            <div className={styles.popSearch}>
              <Search size={14} />
              <input autoFocus value={switchQuery} onChange={(e) => setSwitchQuery(e.target.value)} placeholder="Search dashboards..." aria-label="Search dashboards" />
            </div>
            {dashboards.filter((d) => d.title.toLowerCase().includes(switchQuery.trim().toLowerCase())).map((d) => (
              <MenuRow key={d.id} icon={<BarChart3 size={16} />} selected={d.title === dash.title} onClick={() => (setSwitchEl(null), d.title !== dash.title && onSwitch?.(d))}>
                {d.title}
              </MenuRow>
            ))}
          </Popover>
        )}
        <div className={styles.headTools}>
          <FilterButton count={active} open={filtersOpen} spot="dash-account" onClick={() => setFiltersOpen(!filtersOpen)} onClear={() => setFilter(emptyFilter(fields))} />
          <button type="button" className={`${styles.primaryBtn} ${styles.glass}`} onClick={() => setBeta("Adding widgets")}>
            Add Widget <Plus size={15} />
          </button>
        </div>
      </header>
      <div ref={scroll} className={styles.dashScroll}>
        <div ref={grid} className={styles.dashGrid}>
          {items.map((w) => (
            <article
              key={w.id}
              className={styles.widget}
              data-widget={w.id}
              data-kpi={isKpi(w) || undefined}
              data-slot={drag?.id === w.id || undefined}
              data-resizing={resizing === w.id || undefined}
              style={{ gridColumn: `${(w.x ?? 0) + 1} / span ${w.c}`, gridRow: `${(w.y ?? 0) + 1} / span ${w.r}` }}
            >
              <WidgetContent w={w} />
              {EDGES.map((edge) => (
                <span key={edge} className={styles.widgetEdge} data-edge={edge} aria-hidden onPointerDown={(e) => startResize(e, w, edge)} />
              ))}
              <button
                type="button"
                className={styles.widgetGrip}
                aria-label={`Move: ${titleOf(w.kind)}. Arrow keys move it on the grid`}
                onPointerDown={(e) => startMove(e, w.id)}
                onKeyDown={(e) => nudge(e, w.id)}
              >
                <GripVertical size={14} />
              </button>
              {tools(w)}
            </article>
          ))}
          {drag && dragged && (
            <article
              className={styles.widget}
              data-floating
              data-kpi={isKpi(dragged) || undefined}
              style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }}
              aria-hidden
            >
              <WidgetContent w={dragged} />
            </article>
          )}
        </div>
      </div>

      {fullWidget && (
        <div className={styles.fullWidget} role="dialog" aria-label={titleOf(fullWidget.kind)}>
          <header>
            <h3>{titleOf(fullWidget.kind)}</h3>
            <button type="button" className={styles.iconBtn} aria-label="Exit full screen" onClick={() => setFull(null)}><X size={17} /></button>
          </header>
          <div className={styles.fullBody}><Body w={fullWidget} /></div>
        </div>
      )}

      {undo && (
        <div className={styles.toast} role="status">
          Widget deleted
          <button type="button" onClick={restore}>Undo</button>
        </div>
      )}

      {menu?.kind === "actions" && current && (
        <Popover anchor={menu.el} onClose={() => setMenu(null)} width={236}>
          <MenuRow icon={<Copy size={16} />} onClick={() => duplicate(current)}>Duplicate</MenuRow>
          <MenuRow icon={<Maximize2 size={16} />} onClick={() => (setFull(current.id), setMenu(null))}>Open full screen</MenuRow>
          <MenuRow icon={<Settings size={16} />} onClick={() => (setMenu(null), setBeta("Widget settings"))}>Settings</MenuRow>
          <MenuRow icon={<Trash2 size={16} />} danger onClick={() => remove(current)}>Delete widget</MenuRow>
        </Popover>
      )}
      {filtersOpen && <Filters filter={filter} setFilter={setFilter} fields={fields} onClose={() => setFiltersOpen(false)} />}
      {adding && <WidgetPicker accounts={accounts} onAdd={add} onClose={() => setAdding(false)} />}
      {beta && <BetaModal title={beta} onClose={() => setBeta(null)} />}
      {editingWidget && (
        <WidgetPicker
          key={editingWidget.id}
          accounts={accounts}
          edit={editingWidget}
          onAdd={(next) => (patch(editingWidget.id, next), setEditing(null))}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
    </Rows.Provider>
  );
}

type Category = "popular" | "metrics" | "charts" | "tables" | "team";
const CATEGORIES: { id: Category; label: string; icon: ReactNode }[] = [
  { id: "popular", label: "Popular", icon: <Star size={16} /> },
  { id: "metrics", label: "Metrics", icon: <Hash size={16} /> },
  { id: "charts", label: "Charts", icon: <BarChart3 size={16} /> },
  { id: "tables", label: "Tables", icon: <Table2 size={16} /> },
  { id: "team", label: "Team", icon: <Users size={16} /> },
];
type WidgetType = { id: string; title: string; hint: string; tone: string; tags: Category[]; base: Omit<Widget, "id"> };
const TYPES: WidgetType[] = [
  ...(Object.keys(METRIC) as MetricId[]).map((m): WidgetType => ({ id: `metric-${m}`, title: METRIC[m].label, hint: "Total for the period and the change", tone: "accent", tags: m === "roas" || m === "spend" ? ["popular", "metrics"] : ["metrics"], base: { kind: "metric", metric: m, c: 2, r: 1 } })),
  { id: "trend", title: "Spend and revenue by day", hint: "How the money moved last week", tone: "info", tags: ["popular", "charts"], base: { kind: "trend", c: 8, r: 4 } },
  { id: "alerts", title: "Needs attention", hint: "High CPA, rejections, budget running out", tone: "warm", tags: ["popular", "tables"], base: { kind: "alerts", c: 4, r: 4 } },
  { id: "top", title: "Top creatives by ROAS", hint: "What works and where to add budget", tone: "good", tags: ["popular", "tables"], base: { kind: "top", c: 7, r: 5 } },
  { id: "geo", title: "Spend by geo", hint: "Where the money goes", tone: "info", tags: ["charts"], base: { kind: "geo", c: 5, r: 2 } },
  { id: "roi", title: "ROI", hint: "Return on spend for the period", tone: "accent", tags: ["popular", "metrics"], base: { kind: "roi", c: 3, r: 1 } },
  { id: "spend", title: "Spend", hint: "How much was spent in the period", tone: "accent", tags: ["metrics"], base: { kind: "spend", c: 3, r: 1 } },
  { id: "bars", title: "Bar chart", hint: "Spend and CPA by month", tone: "info", tags: ["popular", "charts"], base: { kind: "chart", chart: "bars", c: 4, r: 3 } },
  { id: "line", title: "Line chart", hint: "How a metric changed by month", tone: "info", tags: ["charts"], base: { kind: "chart", chart: "line", c: 4, r: 3 } },
  { id: "table", title: "Channels table", hint: "Spend and quality for each channel", tone: "good", tags: ["popular", "tables"], base: { kind: "table", c: 6, r: 5 } },
  { id: "map", title: "Spend on the map", hint: "Each country as a circle sized by its spend", tone: "info", tags: ["popular", "charts"], base: { kind: "map", c: 5, r: 3 } },
  { id: "spark", title: "Metric with trend", hint: "A number with its last seven days", tone: "accent", tags: ["popular", "metrics"], base: { kind: "spark", metric: "revenue", c: 3, r: 2 } },
  { id: "area", title: "Area chart", hint: "Spend and revenue by day, filled", tone: "info", tags: ["charts"], base: { kind: "trend", chart: "area", c: 8, r: 4 } },
  { id: "countries", title: "Top countries", hint: "Spend by country and where it is going", tone: "info", tags: ["tables"], base: { kind: "countries", c: 3, r: 4 } },
  { id: "buyers", title: "Top buyers", hint: "Who brings the most revenue", tone: "warm", tags: ["team"], base: { kind: "buyers", c: 3, r: 4 } },
  { id: "launches", title: "Launches", hint: "What goes live, with budget and status", tone: "good", tags: ["tables"], base: { kind: "launches", c: 5, r: 4 } },
  { id: "calendar", title: "Launch calendar", hint: "The month with launch days marked", tone: "warm", tags: ["team"], base: { kind: "calendar", c: 4, r: 4 } },
  { id: "balance", title: "Budget left", hint: "What is left of the budget and how much is spent", tone: "accent", tags: ["metrics"], base: { kind: "balance", c: 4, r: 2 } },
  { id: "donut", title: "Spend by platform", hint: "Each platform's share of the spend", tone: "info", tags: ["popular", "charts"], base: { kind: "donut", c: 4, r: 3 } },
  { id: "payments", title: "Budget movements", hint: "Top-ups, spend and refunds", tone: "good", tags: ["tables"], base: { kind: "payments", c: 8, r: 4 } },
  { id: "activity", title: "Recent activity", hint: "What the team changed in campaigns", tone: "warm", tags: ["team"], base: { kind: "activity", c: 4, r: 5 } },
  { id: "online", title: "Online", hint: "Who on the team is online", tone: "warm", tags: ["popular", "team"], base: { kind: "online", c: 3, r: 3 } },
];

/** Add widget: pick a type, then set it up next to a live preview */
function WidgetPicker({
  accounts,
  onAdd,
  onClose,
  edit,
}: {
  accounts: string[];
  onAdd: (w: Omit<Widget, "id">) => void;
  onClose: () => void;
  /** Opens straight on the setup of a widget that is already on the dashboard */
  edit?: Widget;
}) {
  const [category, setCategory] = useState<Category>("popular");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<(Omit<Widget, "id"> & { title: string }) | null>(() => (edit ? { ...edit, title: edit.title ?? (edit.kind === "metric" ? METRIC[edit.metric ?? "spend"].label : titleOf(edit.kind)) } : null));
  const [color, setColor] = useState<{ el: HTMLElement; side: "above" | "below" } | null>(null);
  const [source, setSource] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && !source && !color && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose, source, color]);
  const q = query.trim().toLowerCase();
  const list = TYPES.filter((t) => (q ? `${t.title} ${t.hint}`.toLowerCase().includes(q) : t.tags.includes(category)));
  const set = (p: Partial<Widget>) => setDraft((d) => d && { ...d, ...p });

  return (
    <Layer onClose={onClose}>
      <div className={styles.picker} role="dialog" aria-label="Add widget" data-drag-panel>
        {!draft ? (
          <>
            <aside className={styles.pickerSide}>
              <p className={styles.pickerBrand} onPointerDown={dragPanel}><LayoutGrid size={18} /> Add widget</p>
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" aria-pressed={!q && category === c.id} onClick={() => (setQuery(""), setCategory(c.id))}>
                  {c.icon} {c.label}
                </button>
              ))}
            </aside>
            <section className={styles.pickerMain}>
              <header onPointerDown={dragPanel}>
                <h3>{q ? "Search results" : CATEGORIES.find((c) => c.id === category)!.label}</h3>
                <label className={styles.pickerSearch}>
                  <Search size={15} />
                  <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search widgets..." aria-label="Search widgets" />
                </label>
                <button type="button" className={styles.iconBtn} aria-label="Close" onClick={onClose}><X size={17} /></button>
              </header>
              <div className={styles.pickerGrid}>
                {list.map((t) => (
                  <button key={t.id} type="button" className={styles.pickerCard} onClick={() => setDraft({ ...t.base, title: t.title, account: null, delta: true })}>
                    <span className={styles.pickerPreview} data-tone={t.tone}>
                      <span className={styles.pickerMini} aria-hidden>
                        <span className={styles.widget} data-kpi={isKpi({ ...t.base, id: t.id }) || undefined}>
                          <WidgetContent w={{ ...t.base, id: t.id, title: t.title }} />
                        </span>
                      </span>
                    </span>
                    <strong>{t.title}</strong>
                    <small>{t.hint}</small>
                  </button>
                ))}
                {!list.length && <p className={styles.popEmpty}>Nothing found</p>}
              </div>
            </section>
          </>
        ) : (
          <div className={styles.cfg}>
            <header className={styles.cfgHead} onPointerDown={dragPanel}>
              {edit ? <span /> : <button type="button" className={styles.ghostBtn} onClick={() => setDraft(null)}><ArrowLeft size={15} /> Back</button>}
              <strong>{edit ? "Widget settings" : "Add widget"}</strong>
              <button type="button" className={styles.iconBtn} aria-label="Close" onClick={onClose}><X size={17} /></button>
            </header>
            <div className={styles.cfgBody}>
              <section className={styles.cfgPreview}>
                <div className={styles.cfgCard} data-wide={draft.c >= 6 || undefined}>
                  <div className={styles.widget} data-kpi={isKpi({ ...draft, id: "x" }) || undefined} style={{ height: isKpi({ ...draft, id: "x" }) ? 120 : 380 }}>
                    <WidgetContent w={{ ...draft, id: "preview" }} />
                  </div>
                </div>
                <p className={styles.cfgNote}><Info size={15} /> Preview on test data</p>
              </section>
              <aside className={styles.cfgSide}>
                <p className={styles.popLabel}>Name</p>
                <input className={styles.numInput} value={draft.title} onChange={(e) => set({ title: e.target.value })} aria-label="Widget name" />
                <p className={styles.popLabel}>Data source</p>
                <button type="button" className={styles.select} onClick={(e) => setSource(source ? null : e.currentTarget)}>
                  <span>{draft.account ?? "All accounts"}</span> <ChevronDown size={15} />
                </button>
                {(draft.kind === "metric" || draft.kind === "spark") && (
                  <>
                    <p className={styles.popLabel}>Metric</p>
                    <div className={`${styles.seg} ${styles.segGrid}`}>
                      {(Object.keys(METRIC) as MetricId[]).map((m) => (
                        <button key={m} type="button" aria-pressed={(draft.metric ?? "spend") === m} onClick={() => set({ metric: m, title: METRIC[m].label })}>{METRIC[m].label}</button>
                      ))}
                    </div>
                  </>
                )}
                {(draft.kind === "chart" || draft.kind === "trend") && (
                  <>
                    <p className={styles.popLabel}>Chart type</p>
                    <div className={styles.seg}>
                      {(["line", "area", "bars", "percent"] as const).map((v) => (
                        <button key={v} type="button" aria-pressed={(draft.chart ?? (draft.kind === "trend" ? "line" : "bars")) === v} onClick={() => set({ chart: v })}>
                          {v === "bars" ? <BarChart3 size={13} /> : v === "line" ? <LineChart size={13} /> : v === "area" ? <AreaChart size={13} /> : <Percent size={13} />} {{ bars: "Bars", line: "Line", area: "Area", percent: "Percent" }[v]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {(draft.kind === "metric" || draft.kind === "spark" || draft.kind === "top") && (
                  <>
                    <p className={styles.popLabel}>Colour coding{draft.kind === "top" ? " · ROAS" : ""}</p>
                    {(["above", "below"] as const).map((side) => {
                      const rule = draft.paint?.[side];
                      return (
                        <div key={side} className={styles.cfgPaint}>
                          <span>{side === "above" ? "Above" : "Below"}</span>
                          <input
                            className={styles.numInput}
                            inputMode="decimal"
                            placeholder="Value"
                            value={rule?.value ?? ""}
                            aria-label={side === "above" ? "Highlight if above" : "Highlight if below"}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.,]/g, "");
                              set({ paint: { ...draft.paint, [side]: value ? { value, color: rule?.color ?? (side === "above" ? "#2f9e44" : "#d93d3d") } : undefined } });
                            }}
                          />
                          <button type="button" className={styles.select} disabled={!rule} aria-label="Colour" onClick={(e) => setColor({ el: e.currentTarget, side })}>
                            <span><i className={styles.swatch} style={{ background: rule?.color ?? (side === "above" ? "#2f9e44" : "#d93d3d") }} /> {colorName(rule?.color ?? (side === "above" ? "#2f9e44" : "#d93d3d"))}</span> <ChevronDown size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
                {isKpi({ ...draft, id: "x" }) && (
                  <label className={styles.cfgToggle}>
                    Show change
                    <Toggle on={draft.delta !== false} label="Show change for the period" onChange={() => set({ delta: draft.delta === false })} />
                  </label>
                )}
                <footer className={styles.cfgFoot}>
                  <button type="button" className={styles.softBtn} onClick={onClose}>Cancel</button>
                  <button type="button" className={styles.primaryBtn} onClick={() => onAdd({ ...draft, title: draft.title.trim() || undefined })}>{edit ? "Save" : "Add widget"}</button>
                </footer>
              </aside>
            </div>
          </div>
        )}
      </div>
      {color && draft && (
        <Popover anchor={color.el} onClose={() => setColor(null)} align="end" width={248}>
          <ColorPicker
            value={draft.paint?.[color.side]?.color ?? "#d93d3d"}
            onChange={(hex) => set({ paint: { ...draft.paint, [color.side]: { value: draft.paint?.[color.side]?.value ?? "", color: hex } } })}
          />
        </Popover>
      )}
      {source && draft && (
        <Popover anchor={source} onClose={() => setSource(null)} width={240}>
          <MenuRow selected={!draft.account} onClick={() => (set({ account: null }), setSource(null))}>All accounts</MenuRow>
          {accounts.map((a) => (
            <MenuRow key={a} selected={draft.account === a} onClick={() => (set({ account: a }), setSource(null))}>{a}</MenuRow>
          ))}
        </Popover>
      )}
    </Layer>
  );
}
