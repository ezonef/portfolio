import casesData from "@/content/cases.json";
import { projects, type Project } from "./projects";

export * from "./case-types";
import { normalizeCase, type CaseStudy } from "./case-types";

const step = (id: string, title: string, text: string, hint: string) => ({
  title,
  screen: "/images/cover-photo.jpg",
  backdrop: "",
  hint,
  body: [{ id, type: "text" as const, text }],
});

/** Starting point for every new case (the admin copies it). */
export const caseTemplate: CaseStudy = {
  headline: "[Project] — an admin panel people stop fighting with.",
  lead: "Description",
  role: "Product Designer",
  story: [
    { id: "t-context", type: "h2", text: "Context" },
    { id: "t-problem-label", type: "label", text: "Problem" },
    {
      id: "t-problem",
      type: "text",
      text: "[What hurt users or the business. Example shape: finding one record meant opening a hidden filter panel and losing the list.]",
    },
  ],
  steps: [
    step("t-s1", "Find", "Status filters live as [[chips above the table]], not behind a button. One click and the [[table]] keeps only matching rows.", "status chips"),
    step("t-s2", "Review", "A row opens in a [[side drawer]], so the list stays in view. The main action — [[Approve]] — sits at the bottom where the thumb and eye end up.", "side drawer"),
    step("t-s3", "Act", "Operators [[tick several rows]] and a [[bulk bar]] appears with one status change for all of them.", "bulk bar"),
    step("t-s4", "Track", "Every change lands in the [[activity log]] with who did it and when. Updated rows [[turn Active]] in place — no reload.", "activity log"),
  ],
  outcome: [
    { id: "t-outcome", type: "h2", text: "Outcome" },
    { id: "t-outcome-text", type: "text", text: "[Real result only — shipped, adopted, feedback from the team, a metric if you have one.]" },
  ],
};

/** Per-project content, edited through the local admin — stored in src/content/cases.json. */
const cases = casesData as unknown as Record<string, Record<string, unknown>>;

export function getCase(project: Project): CaseStudy {
  const study = normalizeCase(caseTemplate, cases[project.slug]);
  return { ...study, steps: study.steps.filter((s) => !s.hidden) };
}

/** Next project in the list (wraps around to the first). */
export function nextProject(project: Project): Project {
  const i = projects.findIndex((p) => p.slug === project.slug);
  return projects[(i + 1) % projects.length];
}
