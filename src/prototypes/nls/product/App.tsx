"use client";

import {
  Activity,
  BarChart3,
  Bell,
  Blocks,
  ChevronDown,
  CircleDollarSign,
  CircleHelp,
  Component,
  Ellipsis,
  FileText,
  Home,
  Inbox,
  LayoutTemplate,
  LayoutDashboard,
  MessageSquare,
  MousePointerClick,
  Radar,
  Search,
  Settings,
  Table2,
  UserPlus,
  Users,
  ScrollText,
  Aperture,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { AiChat } from "./AiChat";
import { Dashboard } from "./Dashboard";
import { DashboardList, SAVED, TEMPLATES, TemplatePicker, type OpenDash } from "./Dashboards";
import { ACCOUNTS, BUYERS, SOURCES, TAGS, TAG_TONE, leaves, money, totals, type Leaf, type Node } from "./data";
import { Filters, activeCount, emptyFilter, matches, type FieldDef, type FilterState } from "./Filters";
import { SelectionBar, TagList, applyChanges, type BarChanges } from "./SelectionBar";
import { Onboarding, type StepRun, type View } from "./Onboarding";
import { Operations } from "./Operations";
import { Customize, useTheme } from "./Customize";
import { DataTable } from "./DataTable";
import { Avatar, FilterButton, MenuRow, PeopleCell, Popover, RootEl } from "./ui";
import styles from "./product.module.css";

type RailItem = { id: string; label: string; icon: ReactNode; view?: View };
const RAIL: (RailItem | "line")[] = [
  { id: "home", label: "Home", icon: <Home size={18} /> },
  "line",
  { id: "tracker", label: "Tracker", icon: <Radar size={18} /> },
  { id: "stats", label: "Statistics", icon: <Table2 size={18} />, view: "table" },
  { id: "creatives", label: "Creatives", icon: <MousePointerClick size={18} /> },
  "line",
  { id: "dash", label: "Dashboards", icon: <BarChart3 size={18} />, view: "dashboard" },
  { id: "accounts", label: "Accounts", icon: <LayoutDashboard size={18} />, view: "accounts" },
  { id: "team", label: "Team", icon: <Users size={18} /> },
  { id: "ai", label: "AI", icon: <Aperture size={18} /> },
  { id: "templates", label: "Templates", icon: <Blocks size={18} /> },
  { id: "logs", label: "Logs", icon: <Activity size={18} /> },
  { id: "docs", label: "Docs", icon: <FileText size={18} /> },
  { id: "alerts", label: "Alerts", icon: <Bell size={18} /> },
  { id: "more", label: "More", icon: <Ellipsis size={18} /> },
];
const RAIL_END: RailItem[] = [
  { id: "invite", label: "Invite", icon: <UserPlus size={18} /> },
  { id: "billing", label: "Billing", icon: <CircleDollarSign size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
];
const SIDE = [
  { label: "Operations", icon: <Component size={15} />, on: true },
  { label: "Templates", icon: <LayoutTemplate size={15} /> },
  { label: "Logs", icon: <ScrollText size={15} /> },
  { label: "Comments", icon: <MessageSquare size={15} /> },
];

const Logo = () => (
  <svg width="48" height="19" viewBox="0 0 48 19" fill="currentColor" role="img" aria-label="NLS">
    <path d="M29.4453 6.31282L29.4453 7.26074L33.479 7.26074L33.479 4.04392L48 4.03383L48 0.000241137L37.3109 0.0103038L35.7478 0.0103038C32.267 0.0103036 29.4453 2.83204 29.4453 6.31282Z" />
    <path d="M6.31282 3.58362e-07L7.26074 3.64555e-08L7.26074 4.03361L4.04389 4.03361L4.03381 18.5545L0.000188542 18.5545L0.0102508 7.86555L0.0102506 6.30257C0.0102503 2.82176 2.832 5.10512e-07 6.31282 3.58362e-07Z" />
    <path d="M26.6824 18.5547L27.6304 18.5547L27.6304 14.5211L24.4135 14.5211L24.4034 0.000168129L20.3698 0.000168481L20.3799 10.6891L20.3799 12.2521C20.3799 15.7329 23.2016 18.5547 26.6824 18.5547Z" />
    <path d="M48 12.2519L48 11.2939L43.9664 11.2939L43.9664 14.5208L29.4452 14.5208L29.4452 18.5544L40.1344 18.5544L41.6975 18.5544C45.1783 18.5544 48 15.7327 48 12.2519Z" />
    <path d="M12.2524 18.5547L11.2944 18.5547L11.2944 14.5211L14.5213 14.5211L14.5213 7.03924e-05L18.555 7.0168e-05L18.555 10.6891L18.555 12.2521C18.555 15.7329 15.7332 18.5547 12.2524 18.5547Z" />
    <path d="M43.9663 11.2939L33.4788 11.2939L33.4788 7.26033L36.9579 7.26033L40.689 7.26033C42.499 7.26033 43.9663 8.72763 43.9663 10.5376V11.2939Z" />
    <path d="M11.2944 14.5215L11.2944 4.03409L7.26079 4.03409L7.26079 7.51308L7.26079 11.2442C7.26079 13.0542 8.7281 14.5215 10.5381 14.5215L11.2944 14.5215Z" />
  </svg>
);
const FlagUS = () => <span className={styles.flag} aria-hidden />;

type AccountRow = { id: string; name: string; initials: string; source: string; buyer: string[]; tag: string[]; campaigns: number; spend: number };
const countCampaigns = (nodes: Node[]): number => nodes.reduce((n, x) => n + (x.level === "campaign" ? 1 : 0) + countCampaigns(x.children ?? []), 0);
/** An account's ad source is the one most of its ads run on */
const mainSource = (nodes: Node[]) => {
  const count = new Map<string, number>();
  for (const l of leaves(nodes)) count.set(l.source, (count.get(l.source) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Facebook";
};
const SOURCE_MARK: Record<string, string> = { Facebook: "f", TikTok: "t", Google: "G" };
const START_ACCOUNTS: AccountRow[] = ACCOUNTS.map((a) => ({
  id: a.id,
  name: a.name,
  initials: a.initials,
  source: mainSource(a.children),
  buyer: [...new Set(leaves(a.children).flatMap((l) => l.buyer))].slice(0, 2),
  tag: [...new Set(leaves(a.children).flatMap((l) => l.tag))].slice(0, 1),
  campaigns: countCampaigns(a.children),
  spend: totals(a.children).spend,
}));
/** What an account can be filtered by */
const ACCOUNT_FIELDS: FieldDef[] = [
  { key: "buyer", label: "Buyer", options: BUYERS },
  { key: "tag", label: "Tags", options: TAGS },
  { key: "source", label: "Source", options: SOURCES },
];
const STATS_DASH: OpenDash = { id: "stats", title: "Account statistics", template: "stats", account: null };

/** Ad accounts: a plain table, and Add puts a new one straight into it */
function Accounts({ rows, onAdd, onRemove, onEdit, ai }: { rows: AccountRow[]; onAdd: () => void; onRemove: (id: string) => void; onEdit: (ids: string[], ch: BarChanges) => void; ai?: { open: boolean; onToggle: () => void } }) {
  // The same filter panel as the operations table, with the fields an account has
  const [filter, setFilter] = useState<FilterState>(() => emptyFilter(ACCOUNT_FIELDS));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const shown = rows.filter((r) => matches(r as unknown as Leaf, filter));
  return (
    <div className={styles.page}>
      <header className={`${styles.pageHead} ${styles.floatingBar}`}>
        <h3 className={styles.listTitle}>Accounts</h3>
        <div className={styles.headTools}>
          <FilterButton count={activeCount(filter)} open={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)} onClear={() => setFilter(emptyFilter(ACCOUNT_FIELDS))} />
          <button type="button" className={`${styles.primaryBtn} ${styles.glass}`} data-spot="add-account" onClick={onAdd}>
            Add account <Plus size={15} />
          </button>
        </div>
      </header>
      {filtersOpen && <Filters filter={filter} setFilter={setFilter} fields={ACCOUNT_FIELDS} metrics={false} onClose={() => setFiltersOpen(false)} />}
      <div className={styles.tableScroll}>
        <DataTable
          label="accounts"
          rows={shown}
          rowId={(r) => r.id}
          columns={[
            {
              key: "name",
              label: "Name",
              sort: (r) => r.name,
              render: (r) => (
                <span className={styles.accountName}>
                  <span className={styles.sourceIcon} data-source={r.source} title={r.source} aria-label={r.source}>{SOURCE_MARK[r.source] ?? r.source[0]}</span>
                  {r.name}
                </span>
              ),
            },
            { key: "status", label: "Status", width: 140, render: () => <span className={styles.status} data-tone="good">Connected</span> },
            { key: "buyer", label: "Buyer", width: 200, sort: (r) => r.buyer[0] ?? "", render: (r) => <PeopleCell names={r.buyer} /> },
            { key: "tag", label: "Tags", width: 200, render: (r) => <TagList tags={r.tag} tone={(v) => TAG_TONE[v]} /> },
            { key: "campaigns", label: "Campaigns", width: 120, sort: (r) => r.campaigns, render: (r) => r.campaigns },
            { key: "spend", label: "Spend", width: 120, sort: (r) => r.spend, render: (r) => money(r.spend) },
          ]}
          menu={(r, close) => (
            <MenuRow danger icon={<Trash2 size={16} />} onClick={() => (onRemove(r.id), close())}>Delete account</MenuRow>
          )}
          bulk={(picked, clear) => (
            <SelectionBar
              count={picked.length}
              lists={[
                { key: "buyer", label: "Buyer", options: BUYERS, look: "person", sets: picked.map((r) => r.buyer) },
                { key: "tag", label: "Tag", options: TAGS, look: "tag", tone: (v) => TAG_TONE[v], sets: picked.map((r) => r.tag) },
              ]}
              onApply={(ch) => onEdit(picked.map((r) => r.id), ch)}
              onDelete={() => (picked.forEach((r) => onRemove(r.id)), clear())}
              ai={ai}
              onClear={clear}
            />
          )}
        />
      </div>
    </div>
  );
}

export function NlsApp({
  initialView = "table",
  filters = false,
  openColumn = false,
  onboarding = false,
  layout = false,
}: {
  initialView?: View;
  filters?: boolean;
  openColumn?: boolean;
  onboarding?: boolean;
  /** One fixed Figma layout at 1728 wide: its rail is drawn but does not navigate */
  layout?: boolean;
}) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>(initialView);
  const [filtersOpen, setFiltersOpen] = useState(filters);
  // The onboarding opens from the help button; on its own screen the button only invites a click
  const [tour, setTour] = useState(onboarding);
  const [picker, setPicker] = useState(false);
  const [dashFilterSignal, setDashFilterSignal] = useState(0);
  const [dashAccount, setDashAccount] = useState(false);
  const [tableFilters, setTableFilters] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  // Every selection bar's orb opens the AI panel and closes it again, like the one in the top bar
  const ai = { open: aiOpen, onToggle: () => setAiOpen((o) => !o) };
  const [accounts, setAccounts] = useState<AccountRow[]>(START_ACCOUNTS);
  // The second sidebar folds down to its icons; hovering one shows its name
  const [sideCollapsed, setSideCollapsed] = useState(false);
  // "More" in the rail: which sections show, and the theme
  const [customizing, setCustomizing] = useState(false);
  // With sections hidden, "More" first lists them, with the way to the settings below
  const [moreEl, setMoreEl] = useState<HTMLElement | null>(null);
  const [railHidden, setRailHidden] = useState<Set<string>>(() => new Set());
  const [theme, setTheme] = useTheme();
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const darkNow = theme === "dark" || (theme === "auto" && systemDark);
  /** The rail without hidden sections, and without dividers left next to each other or at the edges */
  const visibleRail = (list: (RailItem | "line")[]) =>
    list
      .filter((r) => r === "line" || !railHidden.has(r.id))
      .filter((r, i, all) => r !== "line" || (i > 0 && all[i - 1] !== "line" && i < all.length - 1));
  const [dash, setDash] = useState<OpenDash | null>(initialView === "dashboard" ? STATS_DASH : null);
  const added = useRef(0);

  const addAccount = useCallback(() => {
    added.current += 1;
    const n = added.current;
    const number = String(2210 + n * 137);
    setAccounts((l) => [...l, { id: `new-${n}`, name: `Account ${number}`, initials: "NA", source: "Facebook", buyer: [], tag: [], campaigns: 0, spend: 0 }]);
  }, []);
  const openDashboards = useCallback(() => {
    setView("dashboard");
    setDash(null);
    setPicker(false);
  }, []);

  const run = useCallback(
    (r: StepRun) => {
      if (r === "addAccount") addAccount();
      else if (r === "dashboards") openDashboards();
      else if (r === "newDashboard") setPicker(true);
      else if (r === "openTemplate") {
        setPicker(false);
        setDash(STATS_DASH);
      }
      else if (r === "openDashFilter") setDashFilterSignal((n) => n + 1);
      else if (r === "filter") {
        setView("table");
        setFiltersOpen(true);
      } else setView(r);
    },
    [addAccount, openDashboards],
  );

  const railButton = (r: RailItem) => {
    const body = (
      <>
        {r.icon}
        <span>{r.label}</span>
      </>
    );
    if (r.id === "more")
      return (
        <button key={r.id} type="button" className={styles.railItem} data-spot="rail-more" data-hint="each" aria-label={r.label} aria-expanded={customizing || !!moreEl} onClick={(e) => (railHidden.size ? setMoreEl(moreEl ? null : e.currentTarget) : setCustomizing(true))}>
          {body}
        </button>
      );
    return r.view && !layout ? (
      <button key={r.id} type="button" className={styles.railItem} data-spot={`rail-${r.id}`} data-hint="each" aria-current={view === r.view ? "page" : undefined} onClick={() => (r.view === "dashboard" ? openDashboards() : setView(r.view!))}>
        {body}
      </button>
    ) : (
      <div key={r.id} className={styles.railItem} data-static data-spot={`rail-${r.id}`} aria-current={r.view && view === r.view ? "page" : undefined}>{body}</div>
    );
  };

  return (
    <div ref={setRoot} className={styles.app} data-layout={layout || undefined} data-theme={darkNow ? "dark" : "light"}>
      <RootEl.Provider value={root}>
        <header className={styles.topbar}>
          <span className={styles.logo}><Logo /></span>
          <div className={styles.campaign}><FlagUS /> Campaign <ChevronDown size={14} /></div>
          <div className={styles.topSearch}>
            <Search size={15} /> Search <span><kbd>Ctrl</kbd> + <kbd>k</kbd></span>
          </div>
          <div className={styles.topTools}>
            <button type="button" className={styles.aiBtn} data-spot="ai-button" aria-label="AI assistant" aria-expanded={aiOpen} onClick={() => setAiOpen(!aiOpen)}>
              <ThinkingOrb state="working" size={20} theme="auto" speed={aiOpen ? 1.2 : 0.85} aria-hidden="true" /><b>6+</b>
            </button>
            <span className={styles.inbox}><Inbox size={17} /><b>6+</b></span>
            <Avatar text="GF" size={30} />
          </div>
        </header>

        <div className={styles.body}>
          <nav className={styles.rail} aria-label="Sections">
            <div className={styles.railTop}>
              {visibleRail(RAIL).map((r, i) => (r === "line" ? <hr key={i} /> : railButton(r)))}
            </div>
            <div>{RAIL_END.map(railButton)}</div>
          </nav>

          <main className={styles.surface}>
            <div className={styles.surfaceMain}>
              {view === "table" && (
                <aside className={styles.sidebar} data-collapsed={sideCollapsed || undefined}>
                  <div className={styles.workspace} data-tip={sideCollapsed ? "Workspace" : undefined}>
                    <FlagUS />
                    {!sideCollapsed && (
                      <>
                        <span>Workspace</span>
                        <ChevronDown size={14} />
                        <button type="button" className={styles.iconBtn} aria-label="Collapse menu" onClick={() => setSideCollapsed(true)}>
                          <PanelLeftClose size={16} />
                        </button>
                      </>
                    )}
                  </div>
                  {/* Folded, the toggle sits right under the workspace */}
                  {sideCollapsed && (
                    <button type="button" className={styles.sideToggle} aria-label="Expand menu" onClick={() => setSideCollapsed(false)}>
                      <PanelLeftOpen size={17} />
                    </button>
                  )}
                  <ul>
                    {SIDE.map((s) => (
                      <li key={s.label} data-on={s.on || undefined} data-tip={sideCollapsed ? s.label : undefined} aria-label={sideCollapsed ? s.label : undefined}>
                        {s.icon}
                        {!sideCollapsed && s.label}
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
              <div className={styles.content}>
                <div className={styles.viewBox} hidden={view !== "table"}>
                  <Operations filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen} openColumn={openColumn} presetFilter={filters} onAskAi={() => setAiOpen(true)} ai={ai} onOpenDashboard={(account) => (setView("dashboard"), setDash({ ...STATS_DASH, id: `stats-${account ?? "all"}`, account }))} onFilterActive={setTableFilters} />
                </div>
                {view === "accounts" && <Accounts rows={accounts} onAdd={addAccount} onRemove={(id) => setAccounts((l) => l.filter((a) => a.id !== id))} ai={ai} onEdit={(ids, ch) => setAccounts((l) => l.map((a) => (ids.includes(a.id) ? { ...a, buyer: applyChanges(a.buyer, ch.buyer), tag: applyChanges(a.tag, ch.tag) } : a)))} />}
                {view === "dashboard" &&
                  (dash ? (
                    <Dashboard
                      key={dash.id}
                      dash={dash}
                      accounts={accounts.map((a) => a.name)}
                      openFiltersSignal={dashFilterSignal}
                      onAccountPicked={setDashAccount}
                      onBack={() => setDash(null)}
                      dashboards={SAVED}
                      onSwitch={setDash}
                    />
                  ) : (
                    <DashboardList onOpen={setDash} onCreate={() => setPicker(true)} ai={ai} />
                  ))}
              </div>
            </div>

            <footer className={styles.footer}>
              <span />
              <button type="button" className={styles.helpBtn} aria-label="Onboarding and guides" aria-pressed={tour} data-invite={(onboarding && !tour) || undefined} disabled={layout} onClick={() => setTour(!tour)}><CircleHelp size={16} /></button>
            </footer>
            {aiOpen && <AiChat onClose={() => setAiOpen(false)} />}
          </main>
        </div>

        {picker && view === "dashboard" && !dash && (
          <TemplatePicker
            onClose={() => setPicker(false)}
            onPick={(t) => {
              setPicker(false);
              setDash({ id: `new-${t}-${Date.now()}`, title: TEMPLATES.find((x) => x.id === t)!.title, template: t, account: null });
            }}
          />
        )}
        {tour && <Onboarding root={root} view={view} setView={setView} run={run} autoStart={onboarding} ready={{ dashAccount, tableFilter: tableFilters > 0 }} onClose={() => setTour(false)} />}
        {moreEl && (
          <Popover anchor={moreEl} onClose={() => setMoreEl(null)} width={300}>
            <div className={styles.moreGrid}>
              {RAIL.filter((r): r is RailItem => r !== "line" && railHidden.has(r.id)).map((r) => (
                <button key={r.id} type="button" onClick={() => (r.view && !layout && (r.view === "dashboard" ? openDashboards() : setView(r.view)), setMoreEl(null))}>
                  <span>{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
            <button type="button" className={styles.moreCustomize} onClick={() => (setMoreEl(null), setCustomizing(true))}>
              <Settings size={16} /> Customize menu
            </button>
          </Popover>
        )}
        {customizing && (
          <Customize
            items={RAIL.filter((r): r is RailItem => r !== "line" && r.id !== "more")}
            hidden={railHidden}
            setHidden={setRailHidden}
            theme={theme}
            setTheme={setTheme}
            onClose={() => setCustomizing(false)}
          />
        )}
      </RootEl.Provider>
    </div>
  );
}

export const TableScreen = () => <NlsApp />;
export const SettingsScreen = () => <NlsApp openColumn />;
export const FiltersScreen = () => <NlsApp filters />;
export const OnboardingScreen = () => <NlsApp onboarding />;
export const DashboardScreen = () => <NlsApp initialView="dashboard" layout />;
