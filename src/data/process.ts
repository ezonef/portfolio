/**
 * My design process — mirrors Figma: My design process · 1440 / · 390.
 * Everything in [brackets] is a placeholder from the Figma layout: replace with your own words.
 */
export type Stage = {
  id: string;
  name: string;
  length: string;
  purpose: string;
  doList: string[];
  getList: string[];
  tools: string;
  /** Path to an artifact image in /public, or a placeholder label while there is none */
  artifact: { src?: string; label: string };
};

export const processIntro =
  "[Two sentences: how you approach a project, who you work with, and what the client gets at the end.]";

export const processFacts = [
  { label: "Stages", value: "05" },
  { label: "Typical length", value: "[2–8 weeks]" },
  { label: "Platforms", value: "Web · iOS" },
  { label: "Ends with", value: "Dev handoff" },
];

export const stages: Stage[] = [
  {
    id: "discover",
    name: "Discover",
    length: "[1–2 weeks]",
    purpose: "[What this stage is for: understand the business, the users and what is broken today.]",
    doList: ["Stakeholder interviews", "User interviews", "Analytics review", "Competitor audit"],
    getList: ["Problem brief", "User map", "Success metrics"],
    tools: "FigJam · Notion · [Analytics]",
    artifact: { label: "[Artifact image: research board]" },
  },
  {
    id: "define",
    name: "Define",
    length: "[1 week]",
    purpose: "[Turn findings into a clear scope: jobs, main flows and information architecture.]",
    doList: ["Jobs-to-be-done", "User flows", "Information architecture"],
    getList: ["Flow map", "IA diagram", "Agreed MVP scope"],
    tools: "FigJam · Notion",
    artifact: { label: "[Artifact image: flow map]" },
  },
  {
    id: "design",
    name: "Design",
    length: "[2–4 weeks]",
    purpose: "[From wireframes to hi-fi screens, built on a component system so every state is covered.]",
    doList: ["Wireframes", "Hi-fi screens & states", "Components & variables"],
    getList: ["Final screens", "UI kit / design system", "Prototype"],
    tools: "Figma · Variables",
    artifact: { label: "[Artifact image: screens + components]" },
  },
  {
    id: "validate",
    name: "Validate",
    length: "[1 week]",
    purpose: "[Check the design with real users and the team before it is built, then fix what does not work.]",
    doList: ["Usability tests", "Design review with devs", "Iterations"],
    getList: ["Test report", "Fixed screens"],
    tools: "[Maze] · Figma prototype",
    artifact: { label: "[Artifact image: test findings]" },
  },
  {
    id: "deliver",
    name: "Deliver",
    length: "[ongoing]",
    purpose: "[Hand off a file developers can build from without guessing, and stay through QA and release.]",
    doList: ["Specs & annotations", "Tokens handoff", "Design QA"],
    getList: ["Dev-ready file", "QA checklist"],
    tools: "Dev Mode · [Storybook]",
    artifact: { label: "[Artifact image: annotated handoff]" },
  },
];

export const principles = [
  { title: "Clarity over cleverness", text: "[One line on what this means in practice.]" },
  { title: "Systems, not screens", text: "[One line on what this means in practice.]" },
  { title: "Decisions with evidence", text: "[One line on what this means in practice.]" },
  { title: "Ship, then polish", text: "[One line on what this means in practice.]" },
];

export const collaborationIntro = "[How communication works during a project.]";

export const collaboration = [
  { when: "Weekly", what: "Demo call: what changed, what is next, open questions." },
  { when: "Daily", what: "Async updates in Figma comments and [Slack / Telegram]." },
  { when: "Always", what: "A shared decision log so nobody re-argues settled questions." },
];
