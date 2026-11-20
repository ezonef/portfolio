/**
 * My design process — the page's words. Everything in [brackets] is a placeholder: replace it with your own.
 * Layout: src/app/process/page.tsx. Illustrations are Hairline figures (public/hairline).
 */

export const processHero = {
  tag: "My design process",
  title: ["I design the system.", "The screens follow."],
  lead: "Most of my time goes into framing the problem and the rules behind an interface. Once those are written down, screens come fast — and every state is already covered.",
};

export const processFacts = [
  { label: "Focus", value: "B2B · admin · systems" },
  { label: "Platforms", value: "Web · iOS" },
  { label: "Works with", value: "PMs · devs · AI" },
  { label: "Ends with", value: "Dev-ready system" },
];

/** Read one line at a time as you scroll */
export const timeStatements = [
  "Drawing a screen is cheap now.",
  "Deciding what it should do is not.",
  "So that's where my time goes.",
];

export const ai = {
  tag: "AI in my workflow",
  title: ["AI does the typing.", "I make the calls."],
  noTrust:
    "Where I don't trust it: research conclusions, accessibility sign-off and anything a user will rely on. Those I check by hand.",
  toolkit: [
    { name: "Claude Code", use: "Prototypes and front end" },
    { name: "Figma + Variables", use: "The source of truth" },
    { name: "Custom skills", use: "Component architecture, design audits" },
    { name: "Hairline", use: "The illustrations on this page" },
  ],
};

/**
 * Before / after AI, stage by stage of the classic process (Discover → Deliver).
 * Each dot is a feature, placed by the hours that stage took. With AI, prototyping shrinks
 * and the time goes into discovery and definition — better decisions, and a shorter project.
 * `median` is the typical hours for a mid-size B2B feature; `spread` is how much features differ
 * (log scale: 0.3 ≈ most features within ±35% of the median, with a long tail of slow ones).
 * [Rough estimate — replace with your own numbers.]
 */
const STAGES = ["Discover", "Define", "Ideate", "Prototype", "Test", "Deliver"];
const BEFORE = [
  { median: 4, spread: 0.35 },
  { median: 3, spread: 0.3 },
  { median: 6, spread: 0.35 },
  { median: 12, spread: 0.3 },
  { median: 3.5, spread: 0.35 },
  { median: 5, spread: 0.3 },
];
const AFTER = [
  { median: 7, spread: 0.3 },
  { median: 5, spread: 0.3 },
  { median: 3, spread: 0.35 },
  { median: 3.5, spread: 0.4 },
  { median: 4, spread: 0.3 },
  { median: 1.5, spread: 0.4 },
];

export const drawingTime = {
  title: ["Where the hours go,", "before and after AI."],
  text: "Each dot is a feature I shipped, placed by the hours one stage of it took. AI drafts the prototypes and the handoff, so those stages shrink — and the saved hours go into discovery and definition. Better-decided features, in less time overall.",
  columns: [
    ...STAGES.map((label, i) => ({ label, ...BEFORE[i] })),
    ...STAGES.map((label, i) => ({ label, ...AFTER[i] })),
  ],
  /** Index of the column where AI entered the workflow */
  aiFrom: STAGES.length,
  note: "Hours per stage of a feature · one dot per feature · rough estimate",
};

export type Step = {
  id: string;
  /** The stage of the process, matching the bottom bar */
  tag: string;
  title: string;
  /** One string per paragraph */
  text: string[];
  figure: "deck" | "ripple" | "states";
};

export const steps: Step[] = [
  {
    id: "architecture",
    tag: "Define",
    title: "Organising the architecture",
    text: [
      "Before any screen: the objects, who can do what, and where everything lives. AI drafts the map from interviews, docs and the existing product; I decide what is one thing and what is two, and what belongs together.",
      "The result is one map of entities, roles and navigation that the whole team signs off — so nobody argues about structure once the screens start, and every later decision has a place to go.",
    ],
    figure: "deck",
  },
  {
    id: "pains",
    tag: "Ideate",
    title: "Business pains, and how they get solved",
    text: [
      "Every flow starts from a cost — lost hours, support tickets, churn, a deal that stalls on a missing feature. I rank the pains by what they cost the business, not by how loud they are.",
      "Each pain gets a change in the product and a number that proves it worked. AI helps me explore many directions fast; I keep the ones that move that number and drop the rest before they reach a sprint.",
    ],
    figure: "ripple",
  },
  {
    id: "system",
    tag: "Prototype",
    title: "Building the system",
    text: [
      "Tokens and components first, so one decision updates every screen that uses it — instead of fifty frames by hand. Screens are assembled from the library, and the prototype runs in code on test data.",
      "Then every state on purpose: empty, loading, error, long text, no permission. Developers get a system they can build from, not a pile of pictures to guess at.",
    ],
    figure: "states",
  },
];

/** Bento: work that runs on AI alone, each through a skill that holds my rules */
export const skills = {
  tag: "Skills",
  title: ["The rest runs on skills.", "I check the output."],
  text: "These jobs go to AI end to end, but never raw: each runs through a skill with my rules in it, so what comes back already looks like my work — in a fraction of the time.",
  items: [
    {
      art: "component",
      name: "Component architecture",
      skill: "figma-component-architect",
      text: "Builds Figma components with private primitives, slots, variables and every size — the way I would.",
      saves: "days → an hour",
      size: "wide",
    },
    {
      art: "audit",
      name: "Design audit",
      skill: "audit-suite",
      text: "Naming, contrast, spacing and missing states, checked against the system.",
      saves: "a day → minutes",
      size: "wide",
    },
    {
      art: "edge",
      name: "Edge cases",
      skill: "break-ui",
      text: "Worst-case data: long names, empty lists, huge numbers.",
      saves: "hours → minutes",
      size: "small",
    },
    {
      art: "prototype",
      name: "Prototypes in code",
      skill: "Claude Code",
      text: "Clickable front end on test data — this site included.",
      saves: "weeks → days",
      size: "small",
    },
    {
      art: "figure",
      name: "Illustrations",
      skill: "hairline",
      text: "Live line figures, like the ones on this page.",
      saves: "days → an hour",
      size: "small",
    },
  ] as {
    art: "component" | "audit" | "edge" | "prototype" | "figure";
    name: string;
    skill: string;
    text: string;
    saves: string;
    size: "small" | "wide";
  }[],
};

export const collaborationIntro = "Short loops and written decisions, so the team always knows where the design is.";

export const collaboration = [
  { when: "Weekly", what: "Demo call: what changed, what is next, open questions." },
  { when: "Daily", what: "Async updates in Figma comments, Slack, Telegram…" },
  { when: "Always", what: "A shared decision log so nobody re-argues settled questions." },
];
