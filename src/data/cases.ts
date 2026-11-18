import casesData from "@/content/cases.json";
import { projects, type Project } from "./projects";

/**
 * Case study content — mirrors Figma: Template/Case.
 * Inline links are written as [[text]]: they render as "↗ text" and show that step's screen.
 * Every [PLACEHOLDER] is text from the Figma template — replace it per project.
 */
export type CaseStep = {
  title: string;
  text: string;
  /** Screen shown in the player for this step */
  screen: string;
  /** Right side of the caption under the screen, e.g. "status chips" */
  hint: string;
};

export type CaseDecision = { chose: string; rejected: string };

export type CaseStudy = {
  headline: string;
  lead: string;
  role: string;
  problem: string;
  flowName: string;
  steps: CaseStep[];
  decisions: CaseDecision[];
  outcome: string;
};

/** Starting point for every new case (the admin copies it). */
export const caseTemplate: CaseStudy = {
  headline: "[Project] — an admin panel people stop fighting with.",
  lead: "Description",
  role: "Product Designer",
  problem:
    "[What hurt users or the business. Example shape: finding one record meant opening a hidden filter panel and losing the list.]",
  flowName: "Main flow",
  steps: [
    {
      title: "Find",
      text: "Status filters live as [[chips above the table]], not behind a button. One click and the [[table]] keeps only matching rows.",
      screen: "/images/cover-photo.jpg",
      hint: "status chips",
    },
    {
      title: "Review",
      text: "A row opens in a [[side drawer]], so the list stays in view. The main action — [[Approve]] — sits at the bottom where the thumb and eye end up.",
      screen: "/images/cover-photo.jpg",
      hint: "side drawer",
    },
    {
      title: "Act",
      text: "Operators [[tick several rows]] and a [[bulk bar]] appears with one status change for all of them.",
      screen: "/images/cover-photo.jpg",
      hint: "bulk bar",
    },
    {
      title: "Track",
      text: "Every change lands in the [[activity log]] with who did it and when. Updated rows [[turn Active]] in place — no reload.",
      screen: "/images/cover-photo.jpg",
      hint: "activity log",
    },
  ],
  decisions: [
    { chose: "Status filters as chips", rejected: "Filter panel behind a button" },
    { chose: "Side drawer for details", rejected: "Separate record page" },
    { chose: "Bulk bar on selection", rejected: "Row-by-row editing" },
  ],
  outcome: "[Real result only — shipped, adopted, feedback from the team, a metric if you have one.]",
};

/** Per-project content, edited through the local admin — stored in src/content/cases.json. */
const cases = casesData as Partial<Record<string, Partial<CaseStudy>>>;

export function getCase(project: Project): CaseStudy {
  return { ...caseTemplate, ...cases[project.slug] };
}

/** Next project in the list (wraps around to the first). */
export function nextProject(project: Project): Project {
  const i = projects.findIndex((p) => p.slug === project.slug);
  return projects[(i + 1) % projects.length];
}
