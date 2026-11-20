import { BLOCK_TYPES, TEXT_BLOCK_TYPES, type CaseBlock, type CaseStudy } from "@/data/case-types";
import type { Project } from "@/data/project-meta";
import { SLUG_RE } from "./guard";

const str = (v: unknown, max = 5000): v is string => typeof v === "string" && v.length <= max;
const strList = (v: unknown) => Array.isArray(v) && v.length <= 50 && v.every((x) => str(x, 200));
/** Images must be files we serve from /public/images — no external URLs. */
const imagePath = (v: unknown) => str(v, 300) && /^\/images\/[\w\-./]+$/.test(v) && !v.includes("..");

function checkProject(p: unknown, i: number): string | null {
  const x = p as Record<string, unknown>;
  const at = `Project ${i + 1}`;
  if (!x || typeof x !== "object") return `${at}: not an object`;
  if (!str(x.slug, 80) || !SLUG_RE.test(x.slug)) return `${at}: slug must be lowercase-with-dashes`;
  for (const k of ["number", "title", "description"]) if (!str(x[k], 400)) return `${at}: ${k} is missing`;
  if (!str(x.title) || !x.title.trim()) return `${at}: title is empty`;
  if (typeof x.recent !== "boolean") return `${at}: recent must be true/false`;
  if (x.hidden !== undefined && typeof x.hidden !== "boolean") return `${at}: hidden must be true/false`;
  if (x.draft !== undefined && typeof x.draft !== "boolean") return `${at}: draft must be true/false`;
  if (!imagePath(x.cover)) return `${at}: cover must be an uploaded image`;
  if (!strList(x.tags)) return `${at}: tags must be short texts`;
  return null;
}

export function checkBlocks(list: unknown, at: string): string | null {
  if (!Array.isArray(list) || list.length > 400) return `${at}: blocks must be a list (max 400)`;
  for (const bl of list as Record<string, unknown>[]) {
    if (!bl || !BLOCK_TYPES.includes(bl.type as CaseBlock["type"]) || !str(bl.id, 40)) return `${at}: a block is broken`;
    if (TEXT_BLOCK_TYPES.includes(bl.type as never) && !str(bl.text)) return `${at}: a text block is too long`;
    if (bl.type === "image" && ((bl.src !== "" && !imagePath(bl.src)) || !str(bl.caption, 300))) return `${at}: an image block has a bad image path`;
  }
  return null;
}

function checkCase(c: unknown, slug: string): string | null {
  const x = c as Record<string, unknown>;
  const at = `Case "${slug}"`;
  if (!x || typeof x !== "object") return `${at}: not an object`;
  for (const k of ["headline", "lead", "role"]) if (!str(x[k])) return `${at}: ${k} is missing`;
  if (!Array.isArray(x.steps) || x.steps.length > 20) return `${at}: screens must be a list (max 20)`;
  for (const [i, s] of (x.steps as Record<string, unknown>[]).entries()) {
    const name = `${at}, screen ${i + 1}`;
    if (!str(s?.title, 200) || !str(s?.hint, 200)) return `${name}: title or caption is too long`;
    if (s.hidden !== undefined && typeof s.hidden !== "boolean") return `${name}: hidden must be true/false`;
    if (!imagePath(s.screen)) return `${name}${s.title ? ` "${s.title}"` : ""} needs an uploaded screen`;
    if (s.backdrop !== undefined && s.backdrop !== "" && !imagePath(s.backdrop) && !/^#[0-9a-f]{6}$/i.test(String(s.backdrop)))
      return `${name}: background must be an uploaded image or a colour like #1b1b19`;
    const e = checkBlocks(s.body, name);
    if (e) return e;
  }
  return checkBlocks(x.story, `${at}, intro`) ?? checkBlocks(x.outcome, `${at}, outcome`);
}

export function cleanBlocks(list: CaseBlock[]): CaseBlock[] {
  return list
    .filter((b) => b.type !== "image" || b.src) // empty image blocks are dropped
    .map((b) => {
      if (b.type === "image") return { id: b.id, type: "image", src: b.src, caption: b.caption };
      if (b.type === "divider") return { id: b.id, type: "divider" };
      return { id: b.id, type: b.type, text: b.text };
    });
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
      headline: s.headline, lead: s.lead, role: s.role,
      story: cleanBlocks(s.story),
      steps: s.steps.map(({ title, screen, backdrop, hint, body, hidden }) => ({
        title, screen, backdrop: backdrop ?? "", hint, body: cleanBlocks(body), ...(hidden ? { hidden: true } : {}),
      })),
      outcome: cleanBlocks(s.outcome),
    };
  }
  const projects = (b.projects as Project[]).map((p, i) => ({
    slug: p.slug, number: String(i + 1).padStart(2, "0"), title: p.title, description: p.description,
    recent: p.recent, cover: p.cover,
    tags: p.tags, ...(p.hidden ? { hidden: true } : {}), ...(p.draft ? { draft: true } : {}),
  }));
  return { projects, cases };
}
