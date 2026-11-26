/** NLS prototype data. Every name and number here is test data. */
export type Level = "account" | "bundle" | "campaign" | "adset" | "ad";
export type Status = "Active" | "Paused" | "Test" | "Rejected";
export type FieldKey = "status" | "tag" | "buyer" | "geo" | "source";

export type Leaf = {
  status: Status;
  budget: number;
  spend: number;
  purchases: number;
  revenue: number;
  /** An ad can have several buyers and several tags */
  buyer: string[];
  tag: string[];
  geo: string;
  source: string;
};
export type Node = { id: string; level: Level; name: string; leaf?: Leaf; children?: Node[] };
export type Account = { id: string; name: string; initials: string; children: Node[] };

export const BUYERS = ["Anna Fedorova", "Igor Vasiliev", "Maria Ivanova", "Dmitry Petrov"];
export const TAGS = ["Warm-up", "Retarget", "Scale"];
/** Each tag keeps one colour everywhere it shows */
export const TAG_TONE: Record<string, string> = { "Warm-up": "info", Retarget: "good", Scale: "muted" };
export const STATUS_TONE: Record<string, string> = { Active: "good", Paused: "muted", Test: "info", Rejected: "bad" };
/** The colour a value of a field is shown in, wherever it is picked or listed; undefined means plain text */
export const toneOf = (field: string | null | undefined, v: string) => (field === "tag" ? TAG_TONE[v] : field === "status" ? STATUS_TONE[v] : undefined);
export const STATUSES: Status[] = ["Active", "Paused", "Test", "Rejected"];
export const GEOS = ["Poland", "Germany", "Italy", "USA", "Spain", "France", "UK"];
export const SOURCES = ["Facebook", "TikTok", "Google"];

export const FIELDS: { key: FieldKey; label: string; options: string[] }[] = [
  { key: "status", label: "Status", options: STATUSES },
  { key: "tag", label: "Tags", options: TAGS },
  { key: "buyer", label: "Buyer", options: BUYERS },
  { key: "geo", label: "Geo", options: GEOS },
  { key: "source", label: "Source", options: SOURCES },
];

type LeafTuple = [string, Status, number, number, number, number, number, number, number, number];
const ad = ([id, status, budget, spend, purchases, revenue, b, t, g, s]: LeafTuple, name: string): Node => ({
  id,
  level: "ad",
  name,
  leaf: { status, budget, spend, purchases, revenue, buyer: [BUYERS[b]], tag: [TAGS[t]], geo: GEOS[g], source: SOURCES[s] },
});
/** Every value of a field on an ad: one for status or geo, any number for buyer and tag */
export const fieldValues = (l: Leaf, k: string): string[] => {
  const v = (l as unknown as Record<string, unknown>)[k];
  return Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)];
};
const group = (level: Level, id: string, name: string, children: Node[]): Node => ({ id, level, name, children });

export const ACCOUNTS: Account[] = [
  {
    id: "a1",
    name: "Account 4821",
    initials: "EK",
    children: [
      group("bundle", "b1", "Bundle · Trail Max", [
        group("campaign", "c1", "PL · Trail Max · Broad", [
          group("adset", "s1", "Ad set · 25–44", [
            ad(["ad1", "Active", 700, 640, 7, 2980, 0, 2, 0, 0], "Video · Review 15s"),
            ad(["ad2", "Active", 500, 455, 5, 2120, 0, 2, 0, 0], "Carousel · Models"),
            ad(["ad3", "Paused", 300, 210, 1, 390, 0, 0, 6, 0], "Static · Discount"),
          ]),
          group("adset", "s2", "Ad set · Lookalike 2%", [
            ad(["ad4", "Active", 450, 418, 5, 2240, 1, 2, 0, 0], "Video · Unboxing"),
            ad(["ad5", "Test", 150, 96, 1, 410, 1, 0, 4, 0], "UGC · First test"),
          ]),
        ]),
        group("campaign", "c2", "DE · Trail Max · Retarget", [
          group("adset", "s3", "Ad set · Cart 14d", [
            ad(["ad6", "Active", 380, 352, 6, 2410, 2, 1, 1, 0], "Carousel · Cart"),
            ad(["ad7", "Rejected", 120, 18, 0, 0, 2, 1, 1, 0], "Static · Before and after"),
          ]),
        ]),
      ]),
      group("campaign", "c3", "IT · Court Rise · Broad", [
        group("adset", "s4", "Ad set · 18–34", [
          ad(["ad8", "Active", 420, 396, 4, 1490, 3, 0, 2, 1], "TikTok · Trend 9s"),
          ad(["ad9", "Paused", 200, 174, 1, 280, 3, 0, 5, 1], "TikTok · Review"),
        ]),
      ]),
    ],
  },
  {
    id: "a2",
    name: "Account 7306",
    initials: "IV",
    children: [
      group("campaign", "c4", "US · Stride · Search", [
        group("adset", "s5", "Ad set · Brand", [
          ad(["ad10", "Active", 900, 842, 11, 4630, 1, 2, 3, 2], "Search · Brand exact"),
          ad(["ad11", "Active", 600, 538, 6, 2390, 1, 2, 3, 2], "Search · Brand broad"),
        ]),
      ]),
      group("campaign", "c5", "US · Stride · Retarget", [
        group("adset", "s6", "Ad set · Visitors 30d", [
          ad(["ad12", "Test", 250, 188, 2, 760, 0, 1, 3, 0], "Video · Win-back"),
          ad(["ad13", "Rejected", 100, 12, 0, 0, 0, 1, 3, 0], "Static · Promo code"),
        ]),
      ]),
    ],
  },
  {
    id: "a3",
    name: "Account 1954",
    initials: "MI",
    children: [
      group("campaign", "c6", "PL · Court Rise · TikTok", [
        group("adset", "s7", "Ad set · Interests", [
          ad(["ad14", "Active", 340, 301, 4, 1520, 2, 0, 0, 1], "TikTok · Sport 12s"),
          ad(["ad15", "Paused", 180, 142, 1, 310, 2, 0, 0, 1], "TikTok · Lifestyle"),
        ]),
      ]),
    ],
  },
  {
    id: "a4",
    name: "Account 5530",
    initials: "DP",
    children: [
      group("bundle", "b2", "Bundle · Aero Run", [
        group("campaign", "c7", "DE · Aero Run · Broad", [
          group("adset", "s8", "Ad set · 25–54", [
            ad(["ad16", "Active", 800, 731, 9, 3860, 3, 2, 1, 0], "Video · Run 20s"),
            ad(["ad17", "Active", 450, 402, 3, 1180, 3, 2, 1, 0], "Carousel · Colours"),
            ad(["ad18", "Test", 150, 88, 0, 0, 3, 0, 5, 0], "UGC · Runner review"),
          ]),
        ]),
        group("campaign", "c8", "IT · Aero Run · Retarget", [
          group("adset", "s9", "Ad set · Views 7d", [
            ad(["ad19", "Active", 300, 276, 5, 1950, 0, 1, 2, 0], "Static · 15% off"),
            ad(["ad20", "Paused", 160, 121, 1, 240, 0, 1, 2, 0], "Video · Reminder"),
          ]),
        ]),
      ]),
    ],
  },
  {
    id: "a5",
    name: "Account 8812",
    initials: "AF",
    children: [
      group("campaign", "c9", "US · Peak Pack · Google", [
        group("adset", "s10", "Ad set · Category search", [
          ad(["ad21", "Active", 1100, 1012, 12, 5340, 0, 2, 3, 2], "Search · Backpacks"),
          ad(["ad22", "Rejected", 200, 24, 0, 0, 0, 2, 3, 2], "Search · Competitors"),
        ]),
      ]),
      group("campaign", "c10", "PL · Peak Pack · TikTok", [
        group("adset", "s11", "Ad set · Travel", [
          ad(["ad23", "Active", 360, 330, 3, 980, 1, 0, 0, 1], "TikTok · Packing for a hike"),
          ad(["ad24", "Test", 140, 97, 1, 260, 1, 0, 4, 1], "TikTok · Pockets tour"),
        ]),
      ]),
    ],
  },
];

export const leaves = (nodes: Node[]): Leaf[] =>
  nodes.flatMap((n) => (n.leaf ? [n.leaf] : leaves(n.children ?? [])));

export const leafNodes = (nodes: Node[]): Node[] =>
  nodes.flatMap((n) => (n.leaf ? [n] : leafNodes(n.children ?? [])));

export function totals(nodes: Node[]) {
  const l = leaves(nodes);
  const sum = (k: "budget" | "spend" | "purchases" | "revenue") => l.reduce((a, x) => a + x[k], 0);
  const spend = sum("spend");
  const purchases = sum("purchases");
  const revenue = sum("revenue");
  return {
    budget: sum("budget"),
    spend,
    purchases,
    revenue,
    cpa: purchases ? spend / purchases : 0,
    roas: spend ? revenue / spend : 0,
  };
}

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
