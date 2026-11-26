/** Spike prototype data: one test campaign that runs through all five products. */
export type View = "tasks" | "buying" | "automation" | "hiring" | "docs";
export type Go = (view: View, focus?: string) => void;

export type Campaign = { id: string; name: string; spend: number; purchases: number; on: boolean; archived?: boolean };
const AOV = 450;
export const CAMPAIGNS: Campaign[] = [
  { id: "ST-01", name: "Stride Trail Max", spend: 2100, purchases: 21, on: true },
  { id: "ST-02", name: "Stride Court Rise", spend: 1400, purchases: 14, on: true },
  { id: "ST-03", name: "Stride Broad", spend: 1050, purchases: 10, on: true },
  { id: "ST-04", name: "Stride Lookalike", spend: 875, purchases: 9, on: true },
  { id: "ST-05", name: "Stride Cart 14d", spend: 700, purchases: 8, on: true },
  { id: "ST-06", name: "Stride Visitors", spend: 525, purchases: 5, on: false },
  { id: "ST-07", name: "Stride Creative test", spend: 350, purchases: 3, on: false },
  { id: "ARCH-01", name: "Stride Trail Max", spend: 600, purchases: 6, on: false, archived: true },
  { id: "ARCH-02", name: "Stride Court Rise", spend: 250, purchases: 2, on: false, archived: true },
  { id: "ARCH-03", name: "Stride Broad", spend: 200, purchases: 2, on: false, archived: true },
  { id: "ARCH-04", name: "Stride Video", spend: 175, purchases: 2, on: false, archived: true },
];
export const pln = (n: number) => `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
export const stats = (list: Pick<Campaign, "spend" | "purchases">[]) => {
  const spend = list.reduce((a, c) => a + c.spend, 0);
  const purchases = list.reduce((a, c) => a + c.purchases, 0);
  return { spend, purchases, cpa: purchases ? spend / purchases : 0, roas: spend ? (purchases * AOV) / spend : 0 };
};

export type TaskNode = { id: string; label: string; depth: number; kind: "root" | "group" | "bolt" | "item" };
export const TASKS: TaskNode[] = [
  { id: "STRIDE-123", label: "STRIDE-123 · Stride Sale PL", depth: 0, kind: "root" },
  { id: "t-meta", label: "Meta Ads · Trail Max / Court Rise", depth: 1, kind: "group" },
  { id: "t-setup", label: "Ad account setup", depth: 2, kind: "bolt" },
  { id: "t-pay", label: "Payment method verified", depth: 3, kind: "item" },
  { id: "t-pixel", label: "Meta Pixel · verified", depth: 3, kind: "item" },
  { id: "t-domain", label: "Domain verified", depth: 3, kind: "item" },
  { id: "t-capi", label: "Conversions API · events", depth: 3, kind: "item" },
  { id: "t-backup", label: "Backup accounts ready", depth: 3, kind: "item" },
  { id: "t-report", label: "Strategy & reporting", depth: 2, kind: "bolt" },
  { id: "t-budget", label: "Daily budget · 2,000 zł", depth: 2, kind: "bolt" },
  { id: "t-creative", label: "Trail Max / Court Rise creatives", depth: 1, kind: "group" },
  { id: "t-cart", label: "Cart recovery · AUTO-01", depth: 1, kind: "group" },
  { id: "t-winners", label: "Review winning creatives", depth: 1, kind: "group" },
];

export const STAGES = [
  { id: "new", label: "New applicants", color: "#2563eb" },
  { id: "screening", label: "Screening", color: "#7c3aed" },
  { id: "interview", label: "Interview", color: "#0e8fa8" },
  { id: "test", label: "Test task", color: "#c2650a" },
  { id: "offer", label: "Offer", color: "#15803d" },
] as const;
export type StageId = (typeof STAGES)[number]["id"];
export type Priority = "Low" | "Medium" | "High";
export type Candidate = { id: string; name: string; years: number; note: string; priority: Priority; source: string; stage: StageId };
const c = (id: string, name: string, years: number, note: string, priority: Priority, source: string, stage: StageId): Candidate => ({ id, name, years, note, priority, source, stage });
export const CANDIDATES: Candidate[] = [
  c("c1", "Kirill Novikov", 4, "23 Sep · review portfolio", "Low", "Indeed", "new"),
  c("c2", "Alina Sokolova", 2, "23 Sep · review application", "Medium", "Telegram", "new"),
  c("c3", "Denis Volkov", 5, "23 Sep · review experience", "High", "LinkedIn", "new"),
  c("c4", "Elena Morozova", 4, "23 Sep · awaiting reply", "Medium", "Djinni", "screening"),
  c("c5", "Ilya Kuznetsov", 3, "24 Sep · screening 11:30", "High", "Telegram", "screening"),
  c("c6", "Mikhail Smirnov", 4, "23 Sep · feedback pending", "Medium", "Djinni", "interview"),
  c("c7", "Polina Belova", 4, "24 Sep · interview 12:00", "Medium", "Indeed", "interview"),
  c("c8", "Artem Zakharov", 5, "25 Sep · interview 16:00", "High", "LinkedIn", "interview"),
  c("c9", "Alexey Kovalev", 3, "23 Sep · test under review", "High", "LinkedIn", "test"),
  c("c10", "Daria Romanova", 4, "24 Sep · launch test due", "Medium", "Telegram", "test"),
  c("c11", "Roman Pavlov", 4, "25 Sep · test review at 14:00", "Medium", "Indeed", "test"),
  c("c12", "Nikita Egorov", 6, "24 Sep · decision today", "High", "Djinni", "offer"),
  c("c13", "Sofia Andreeva", 4, "23 Sep · agreeing terms", "High", "LinkedIn", "offer"),
];

/** In document text, **x** is bold and [[ST-01]] links to that item in its product. */
export type DocBlock = { h?: string; id?: string; p?: string; li?: string };
export type Doc = { id: string; title: string; blocks: DocBlock[] };
export const DOCS: Doc[] = [
  {
    id: "BRIEF-01",
    title: "BRIEF-01 · Campaign brief",
    blocks: [
      { p: "Advertising campaign for Stride Trail Max and Court Rise sneakers in Poland." },
      { p: "**Campaign owner:** Emma Carter" },
      { p: "**Campaign ID:** [[STRIDE-123]]" },
      { p: "**Promotion period:** 21–27 September" },
      { p: "**Channels:** Facebook and Instagram" },
      { h: "Campaign objective", id: "objective" },
      { p: "Drive purchases through Meta Ads and recover customers who leave the store without completing their order." },
      { p: "Both campaigns share the same promotion, landing page and purchase tracking." },
      { h: "Offer", id: "offer" },
      { p: "**30% off** with the code **STRIDE30**." },
      { p: "All ads and recovery emails must use the same offer and promotion dates. Recovery runs in [[AUTO-01]]." },
      { h: "Audience", id: "audience" },
      { p: "Men and women aged **25–35** in Poland. Test three audience groups:" },
      { li: "Broad prospecting." },
      { li: "Lookalike audiences based on previous purchases." },
      { li: "Retargeting for product viewers and abandoned carts." },
      { h: "Budget and targets", id: "budget" },
      { p: "Current daily budget: **2,000 PLN**" },
      { p: "Trail Max: **1,200 PLN** per day in [[ST-01]]." },
      { p: "Court Rise: **800 PLN** per day in [[ST-02]]." },
    ],
  },
  {
    id: "STRATEGY-02",
    title: "STRATEGY-02 · Creative strategy",
    blocks: [
      { p: "**Parent campaign:** Stride Sale · Poland" },
      { p: "**Products:** Trail Max and Court Rise" },
      { p: "**Offer:** 30% off with **STRIDE30**" },
      { h: "Core message", id: "message" },
      { p: "Two sneaker collections, one promotion." },
      { p: "Give customers a clear reason to explore the product, choose their size and complete their purchase." },
      { h: "Trail Max direction", id: "trail" },
      { p: "Focus on comfort and everyday use. Show the sneakers during a walk, a commute or a casual day in the city." },
      { p: "**Headline:** Made for your everyday." },
      { p: "**CTA:** Shop Trail Max" },
      { p: "**Campaign reference:** [[ST-01]]" },
      { h: "Court Rise direction", id: "court" },
      { p: "Focus on personal style and outfit combinations. Use close-up shots to highlight the silhouette and colour." },
      { p: "**Headline:** Bring your own style." },
      { p: "**CTA:** Shop Court Rise" },
      { p: "**Campaign reference:** [[ST-02]]" },
    ],
  },
  {
    id: "HR-07-DOC",
    title: "HR-07 · Meta Ads Buyer role",
    blocks: [
      { p: "Hiring brief for the buyer who will take over the campaign after launch. Pipeline: [[HR-07]]." },
      { h: "Responsibilities", id: "duties" },
      { li: "Run and scale Meta Ads campaigns." },
      { li: "Keep CPA at or below 100 zł and ROAS at or above 4.50×." },
      { li: "Report results in the shared campaign table." },
      { h: "Test task", id: "test" },
      { p: "Review [[ST-03]] and [[ST-06]], then propose what to scale." },
    ],
  },
];

export type SearchKind = "Task" | "Campaign" | "Workflow" | "Candidate" | "Document";
export type SearchItem = { id: string; kind: SearchKind; title: string; meta: string; view: View; focus: string; preview: [string, string][] };

export const SEARCH: SearchItem[] = [
  ...TASKS.map((t): SearchItem => ({
    id: `task-${t.id}`,
    kind: "Task",
    title: t.label,
    meta: t.depth === 0 ? "Campaign launch · Live" : "STRIDE-123 · Subtask",
    view: "tasks",
    focus: t.id,
    preview: [["Parent", t.depth === 0 ? "Sprint 38" : "STRIDE-123"], ["Owner", "Emma Carter"], ["Sprint", "21–27 Sep"]],
  })),
  ...CAMPAIGNS.map((x): SearchItem => {
    const s = stats([x]);
    return {
      id: `camp-${x.id}`,
      kind: "Campaign",
      title: `${x.id} · ${x.name}`,
      meta: `${pln(x.spend)} · ROAS ${s.roas.toFixed(2)}×`,
      view: "buying",
      focus: x.id,
      preview: [["Spend", pln(x.spend)], ["Purchases", String(x.purchases)], ["CPA", pln(s.cpa)], ["ROAS", `${s.roas.toFixed(2)}×`]],
    };
  }),
  {
    id: "wf-auto",
    kind: "Workflow",
    title: "AUTO-01 · Cart recovery",
    meta: "Stride funnel · Stops on purchase",
    view: "automation",
    focus: "AUTO-01",
    preview: [["Collection", "Trail Max / Court Rise"], ["Triggers", "Purchase, wishlist"], ["Market", "PL"]],
  },
  ...CANDIDATES.map((x): SearchItem => ({
    id: `cand-${x.id}`,
    kind: "Candidate",
    title: x.name,
    meta: `HR-07 · ${STAGES.find((s) => s.id === x.stage)!.label}`,
    view: "hiring",
    focus: x.id,
    preview: [["Experience", `Meta Ads · ${x.years} years`], ["Priority", x.priority], ["Source", x.source], ["Next", x.note]],
  })),
  ...DOCS.flatMap((d): SearchItem[] => [
    { id: `doc-${d.id}`, kind: "Document", title: d.title, meta: "Documentation", view: "docs", focus: d.id, preview: [["Sections", String(d.blocks.filter((b) => b.h).length)], ["Owner", "Emma Carter"], ["Updated", "20 Sep"]] },
    ...d.blocks
      .filter((b) => b.h)
      .map((b): SearchItem => ({ id: `doc-${d.id}-${b.id}`, kind: "Document", title: b.h!, meta: d.title, view: "docs", focus: `${d.id}#${b.id}`, preview: [["Document", d.id], ["Section", b.h!]] })),
  ]),
];

/** Where a reference like ST-01 opens. */
export function resolveRef(ref: string): { view: View; focus: string } {
  if (ref.startsWith("AUTO")) return { view: "automation", focus: ref };
  if (ref.startsWith("HR")) return { view: "hiring", focus: ref };
  if (ref.startsWith("STRIDE")) return { view: "tasks", focus: ref };
  return { view: "buying", focus: ref };
}
