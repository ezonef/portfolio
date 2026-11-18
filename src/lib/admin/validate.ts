import type { CaseStudy } from "@/data/cases";
import type { Project } from "@/data/projects";
import { SLUG_RE } from "./guard";

const CATEGORIES = ["admin", "ds", "mobile"];
const TOPICS = ["onboarding", "drawer"];

const str = (v: unknown, max = 5000): v is string => typeof v === "string" && v.length <= max;
const strList = (v: unknown) => Array.isArray(v) && v.length <= 50 && v.every((x) => str(x, 200));
/** Images must be files we serve from /public/images — no external URLs. */
const imagePath = (v: unknown) => str(v, 300) && /^\/images\/[\w\-./]+$/.test(v) && !v.includes("..");

function checkProject(p: unknown, i: number): string | null {
  const x = p as Record<string, unknown>;
  const at = `Project ${i + 1}`;
  if (!x || typeof x !== "object") return `${at}: not an object`;
  if (!str(x.slug, 80) || !SLUG_RE.test(x.slug)) return `${at}: slug must be lowercase-with-dashes`;
  for (const k of ["number", "title", "description", "company", "years"]) if (!str(x[k], 400)) return `${at}: ${k} is missing`;
  if (!str(x.title) || !x.title.trim()) return `${at}: title is empty`;
  if (!CATEGORIES.includes(x.category as string)) return `${at}: unknown category`;
  if (typeof x.recent !== "boolean") return `${at}: recent must be true/false`;
  if (!imagePath(x.cover)) return `${at}: cover must be an uploaded image`;
  if (!Array.isArray(x.topics) || !x.topics.every((t) => TOPICS.includes(t))) return `${at}: unknown topic`;
  if (!strList(x.tags)) return `${at}: tags must be short texts`;
  return null;
}

function checkCase(c: unknown, slug: string): string | null {
  const x = c as Record<string, unknown>;
  const at = `Case "${slug}"`;
  if (!x || typeof x !== "object") return `${at}: not an object`;
  for (const k of ["headline", "lead", "role", "problem", "flowName", "outcome"]) if (!str(x[k])) return `${at}: ${k} is missing`;
  if (!Array.isArray(x.steps) || x.steps.length > 20) return `${at}: steps must be a list (max 20)`;
  for (const s of x.steps as Record<string, unknown>[]) {
    if (!str(s?.title, 200) || !str(s?.text) || !str(s?.hint, 200)) return `${at}: a step has empty fields`;
    if (!imagePath(s.screen)) return `${at}: step "${s.title}" needs an uploaded screen`;
  }
  if (!Array.isArray(x.decisions) || x.decisions.length > 20) return `${at}: decisions must be a list`;
  for (const d of x.decisions as Record<string, unknown>[]) if (!str(d?.chose, 300) || !str(d?.rejected, 300)) return `${at}: a decision has empty fields`;
  return null;
}

/** Returns an error message, or null when the payload is safe to write. */
export function validateContent(body: unknown): { error: string } | { projects: Project[]; cases: Record<string, CaseStudy> } {
  const b = body as { projects?: unknown; cases?: unknown };
  if (!b || !Array.isArray(b.projects) || !b.cases || typeof b.cases !== "object") return { error: "Bad payload" };
  if (b.projects.length > 100) return { error: "Too many projects" };
  const slugs = new Set<string>();
  for (const [i, p] of b.projects.entries()) {
    const e = checkProject(p, i);
    if (e) return { error: e };
    const slug = (p as Project).slug;
    if (slugs.has(slug)) return { error: `Slug "${slug}" is used twice` };
    slugs.add(slug);
  }
  const cases: Record<string, CaseStudy> = {};
  for (const [slug, c] of Object.entries(b.cases as Record<string, unknown>)) {
    if (!slugs.has(slug)) continue; // case of a deleted project — drop it
    const e = checkCase(c, slug);
    if (e) return { error: e };
    const s = c as CaseStudy;
    // Keep only known fields, in a stable order, so the JSON diff stays readable.
    cases[slug] = {
      headline: s.headline, lead: s.lead, role: s.role, problem: s.problem, flowName: s.flowName,
      steps: s.steps.map(({ title, text, screen, hint }) => ({ title, text, screen, hint })),
      decisions: s.decisions.map(({ chose, rejected }) => ({ chose, rejected })),
      outcome: s.outcome,
    };
  }
  const projects = (b.projects as Project[]).map((p, i) => ({
    slug: p.slug, number: String(i + 1).padStart(2, "0"), title: p.title, description: p.description,
    company: p.company, years: p.years, category: p.category, recent: p.recent, cover: p.cover,
    topics: p.topics, tags: p.tags,
  }));
  return { projects, cases };
}
