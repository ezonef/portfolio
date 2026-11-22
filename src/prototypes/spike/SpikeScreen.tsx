"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./screen.module.css";

/** The Spike "Campaign delivery" screen, painted only by the tokens set on its root. Rows are test data. */
const WIDTH = 860;

type Row = [name: string, spend: string, purchases: string, cpa: string, roas: string, on: boolean];
type Group = { title: string; badge?: string; total: string; spend: string; purchases: string; cpa: string; roas: string; rows: Row[] };

const GROUPS: Group[] = [
  {
    title: "Emma Carter · Account 4821",
    badge: "A",
    total: "Total · 21–23 Sep",
    spend: "7,000.00 zł",
    purchases: "70",
    cpa: "100.00 zł",
    roas: "4.50×",
    rows: [
      ["ST-01 · Stride Trail Max · Active", "2,100.00 zł", "21", "100.00 zł", "4.50×", true],
      ["ST-02 · Stride Court Rise · Active", "1,400.00 zł", "14", "100.00 zł", "4.50×", true],
      ["ST-03 · Stride Broad · Active", "1,050.00 zł", "10", "105.00 zł", "4.29×", true],
      ["ST-04 · Stride Lookalike · Active", "875.00 zł", "9", "97.22 zł", "4.63×", true],
      ["ST-05 · Stride Cart 14d · Active", "700.00 zł", "8", "87.50 zł", "5.14×", true],
      ["ST-06 · Stride Visitors · Paused", "525.00 zł", "5", "105.00 zł", "4.29×", false],
      ["ST-07 · Stride Creative test · Paused", "350.00 zł", "3", "116.67 zł", "3.86×", false],
    ],
  },
  {
    title: "Archived · previous test",
    total: "Total · previous test",
    spend: "1,225.00 zł",
    purchases: "12",
    cpa: "102.08 zł",
    roas: "4.41×",
    rows: [
      ["ARCH-01 · Stride Trail Max", "600.00 zł", "6", "100.00 zł", "4.50×", false],
      ["ARCH-02 · Stride Court Rise", "250.00 zł", "2", "125.00 zł", "3.60×", false],
      ["ARCH-03 · Stride Broad", "200.00 zł", "2", "100.00 zł", "4.50×", false],
      ["ARCH-04 · Stride Video", "175.00 zł", "2", "87.50 zł", "5.14×", false],
    ],
  },
];

const TREE: { label: string; depth: number; icon: IconName; on?: boolean; muted?: boolean }[] = [
  { label: "Stride", depth: 1, icon: "folder" },
  { label: "Sprints", depth: 2, icon: "folder" },
  { label: "Stride Sale · PL", depth: 3, icon: "list", on: true },
  { label: "Trail Max / Court…", depth: 3, icon: "list" },
  { label: "Creatives", depth: 3, icon: "list" },
  { label: "Launch checklist", depth: 3, icon: "list" },
  { label: "Results · 21–23 S…", depth: 3, icon: "list" },
  { label: "Strategy", depth: 2, icon: "doc", muted: true },
  { label: "Backlog", depth: 2, icon: "doc", muted: true },
  { label: "Trail Max", depth: 1, icon: "folder", muted: true },
  { label: "Court Rise", depth: 1, icon: "folder", muted: true },
  { label: "Retargeting", depth: 1, icon: "folder", muted: true },
];

const TABS: { label: string; icon: IconName; view?: "delivery" | "documents" }[] = [
  { label: "Overview", icon: "grid" },
  { label: "Accounts", icon: "users" },
  { label: "Campaign delivery", icon: "spark", view: "delivery" },
  { label: "Landing pages", icon: "globe" },
  { label: "Domains", icon: "link" },
  { label: "Campaigns", icon: "box" },
  { label: "Documents", icon: "doc", view: "documents" },
];

export function SpikeScreen({ style }: { style: CSSProperties }) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0.7, height: 800 });
  const [view, setView] = useState<"delivery" | "documents">("delivery");

  // laid out at one width and scaled to the player; the height reflows to fill it
  useEffect(() => {
    const el = box.current!;
    const measure = () => {
      const scale = el.clientWidth / WIDTH;
      if (scale > 0) setFit({ scale, height: el.clientHeight / scale });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className={styles.box} style={style}>
      <div className={styles.screen} style={{ width: WIDTH, height: fit.height, transform: `scale(${fit.scale})` }}>
        <header className={styles.top}>
          <span className={styles.logo}>Spike</span>
          <span className={styles.search}>
            <Icon name="search" />
            Search
            <kbd>Ctrl + K</kbd>
          </span>
          <span className={styles.topIcons}>
            <Icon name="star" />
            <Icon name="bell" />
            <span className={styles.avatar} aria-hidden />
          </span>
        </header>

        <div className={styles.body}>
          <nav className={styles.rail} aria-label="Sections">
            {(["home", "box", "users", "link", "doc", "calendar"] as const).map((n) => (
              <span key={n} data-on={n === "box" || undefined}>
                <Icon name={n} />
              </span>
            ))}
          </nav>

          <nav className={styles.spaces} aria-label="Spaces">
            <p className={styles.spacesHead}>
              Spaces
              <Icon name="search" />
            </p>
            <p className={styles.project}>
              <span aria-hidden />
              Stride Campaign
            </p>
            {TREE.map((t) => (
              <p key={t.label} className={styles.treeRow} data-on={t.on || undefined} data-muted={t.muted || undefined} style={{ marginLeft: t.depth * 12 }}>
                <Icon name={t.icon} />
                <span>{t.label}</span>
              </p>
            ))}
          </nav>

          <main className={styles.main}>
            <p className={styles.crumbs}>
              Stride Campaign <i>›</i> Stride · PL <i>›</i> Sprints <i>›</i> <b>Stride Sale · PL</b>
            </p>

            <div className={styles.tabs} role="group" aria-label="Layout content">
              {TABS.map((t) =>
                t.view ? (
                  <button key={t.label} type="button" aria-pressed={view === t.view} onClick={() => setView(t.view!)}>
                    <Icon name={t.icon} />
                    {t.label}
                  </button>
                ) : (
                  <span key={t.label}>
                    <Icon name={t.icon} />
                    {t.label}
                  </span>
                ),
              )}
            </div>

            <div className={styles.toolbar}>
              <span className={styles.tool}>Appearance · User</span>
              <Icon name="search" />
              <span className={styles.toolRight}>
                <span className={styles.me}>
                  <span className={styles.avatar} aria-hidden />
                  Me
                </span>
                <span className={styles.tool}>Assignee</span>
                <span className={styles.tool}>Display</span>
                <span className={styles.tool}>Filter</span>
                <button type="button" className={styles.primary}>
                  Add campaign
                </button>
              </span>
            </div>

            {view === "delivery" ? (
              GROUPS.map((g) => <Delivery key={g.title} group={g} />)
            ) : (
              <article className={styles.doc}>
                <h4>Campaign brief</h4>
                <p>Main message, offer and channels for the launch, next to the tasks that depend on them.</p>
                <h4>Creative direction</h4>
                <p>Same shell, navigation and tokens as the table. Only the content slot changes.</p>
                <button type="button" className={styles.primary}>
                  Approve brief
                </button>
              </article>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Delivery({ group: g }: { group: Group }) {
  return (
    <section className={styles.group}>
      <p className={styles.groupTitle}>
        {g.badge && <span>{g.badge}</span>}
        {g.title} <i>▾</i>
      </p>
      <div className={`${styles.row} ${styles.total}`}>
        <span />
        <b>{g.total}</b>
        <span />
        <span><em data-tone="spend">{g.spend}</em></span>
        <span><em data-tone="good">{g.purchases}</em></span>
        <span>{g.cpa}</span>
        <span>{g.roas}</span>
      </div>
      <div className={`${styles.row} ${styles.head}`}>
        <span>On/Off</span>
        <span>Campaign / delivery</span>
        <span />
        <span>Spend (PLN)</span>
        <span>Purchases</span>
        <span>CPA (PLN)</span>
        <span>ROAS</span>
      </div>
      {g.rows.map(([name, spend, purchases, cpa, roas, on]) => (
        <div key={name} className={styles.row}>
          <span className={styles.toggle} data-on={on || undefined} aria-label={on ? "On" : "Off"} role="img" />
          <span className={styles.name}>{name}</span>
          <i className={styles.play}>▸</i>
          <span>{spend}</span>
          <span>{purchases}</span>
          <span>{cpa}</span>
          <span>{roas}</span>
        </div>
      ))}
      <p className={styles.add}>+ Add campaign</p>
    </section>
  );
}

const PATHS = {
  search: "M7 12a5 5 0 100-10 5 5 0 000 10zM10.6 10.6L14 14",
  star: "M8 2l1.8 3.8 4.2.5-3.1 2.8.8 4.1L8 11.2l-3.7 2 .8-4.1L2 6.3l4.2-.5L8 2z",
  bell: "M4 7a4 4 0 118 0c0 4 1.5 4.5 1.5 4.5h-11S4 11 4 7zM6.8 13.5a1.4 1.4 0 002.4 0",
  home: "M2.5 7.5L8 3l5.5 4.5V13a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V7.5zM6.5 13.5v-4h3v4",
  box: "M8 2l5.5 3v6L8 14l-5.5-3V5L8 2zM2.5 5L8 8l5.5-3M8 8v6",
  users: "M6 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M10.5 3.2a2.5 2.5 0 010 4.6M12 9.8c1.5.5 2.5 1.8 2.5 3.7",
  link: "M6.5 9.5l3-3M7 4.5l1-1a3 3 0 014.5 4.5l-1 1M9 11.5l-1 1A3 3 0 013.5 8l1-1",
  doc: "M4 2h5.5L12.5 5v9H4V2zM9.5 2v3h3M6 8.5h4M6 11h4",
  calendar: "M3 4h10v9.5H3V4zM3 7h10M5.5 2.5V5M10.5 2.5V5",
  folder: "M2 4.5h4l1.5 1.5H14v7H2V4.5z",
  list: "M5 4.5h8M5 8h8M5 11.5h8M2.5 4.5h.5M2.5 8h.5M2.5 11.5h.5",
  grid: "M2.5 2.5h4.5V7H2.5V2.5zM9 2.5h4.5V7H9V2.5zM2.5 9H7v4.5H2.5V9zM9 9h4.5v4.5H9V9z",
  spark: "M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5L8 2z",
  globe: "M8 14A6 6 0 108 2a6 6 0 000 12zM2 8h12M8 2c2 2 2.5 4 2.5 6S10 12 8 14c-2-2-2.5-4-2.5-6S6 4 8 2z",
} satisfies Record<string, string>;
type IconName = keyof typeof PATHS;

function Icon({ name }: { name: IconName }): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
