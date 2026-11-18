import type { CaseStudy } from "@/data/case-types";
import { blockId } from "@/data/case-types";
import { CHANGELOG_BLOCKS, normalizeEntry, type ChangelogEntry } from "@/data/changelog-types";
import { checkBlocks, cleanBlocks } from "./validate";
import type { Project } from "@/data/project-meta";

const today = () => new Date().toISOString().slice(0, 10);
const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const live = (p?: Project) => !!p && !p.draft && !p.hidden;
/** Card + case, without the list number (moving a case is not a change worth a line). */
const fingerprint = (p: Project, c?: CaseStudy) => JSON.stringify([{ ...p, number: undefined }, c ?? null]);

/**
 * After a save: propose changelog lines for what changed on the live site.
 * A case that went live → "published"; a live case whose card or page changed → "updated".
 * Proposals are pending until you approve them; repeated saves refresh one pending line instead of piling up.
 */
export function proposeEntries(
  before: { projects: Project[]; cases: Record<string, CaseStudy> },
  after: { projects: Project[]; cases: Record<string, CaseStudy> },
  entries: ChangelogEntry[],
): ChangelogEntry[] {
  const out = entries.map((e) => normalizeEntry({ ...e }));
  const pendingFor = (slug: string, kind: ChangelogEntry["kind"]) =>
    out.find((e) => e.status === "pending" && e.slug === slug && e.kind === kind);

  for (const p of after.projects) {
    const old = before.projects.find((x) => x.slug === p.slug);
    if (!live(p)) continue;
    const title = p.title || "Untitled";
    if (!live(old)) {
      if (pendingFor(p.slug, "published")) continue;
      out.push({ id: newId(), date: today(), title: `New case: ${title}`, body: p.description ? [{ id: blockId(), type: "text", text: p.description }] : [], status: "pending", kind: "published", slug: p.slug });
    } else if (fingerprint(old!, before.cases[p.slug]) !== fingerprint(p, after.cases[p.slug])) {
      if (pendingFor(p.slug, "published")) continue; // still waiting to announce it as new
      const existing = pendingFor(p.slug, "updated");
      if (existing) existing.date = today();
      else out.push({ id: newId(), date: today(), title: `Updated: ${title}`, body: [], status: "pending", kind: "updated", slug: p.slug });
    }
  }
  return out;
}

const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;

/** Returns an error, or the cleaned list. */
export function validateChangelog(body: unknown): { error: string } | { entries: ChangelogEntry[] } {
  const list = (body as { entries?: unknown })?.entries;
  if (!Array.isArray(list) || list.length > 500) return { error: "Bad changelog" };
  const entries: ChangelogEntry[] = [];
  for (const e of list as Record<string, unknown>[]) {
    if (!e || !str(e.id, 40) || !str(e.title, 300)) return { error: "A changelog entry is broken" };
    const blocksError = checkBlocks(e.body, "Changelog");
    if (blocksError) return { error: blocksError };
    if ((e.body as { type: string }[]).some((b) => !CHANGELOG_BLOCKS.includes(b.type as never))) return { error: "Changelog lines can only use text blocks" };
    if (!str(e.date, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return { error: "A changelog date is broken" };
    if (e.status !== "pending" && e.status !== "approved") return { error: "Unknown changelog status" };
    if (e.kind !== "published" && e.kind !== "updated" && e.kind !== "note") return { error: "Unknown changelog kind" };
    if (e.slug !== undefined && !(str(e.slug, 80) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.slug))) return { error: "Bad slug in changelog" };
    entries.push({ id: e.id, date: e.date, title: e.title, body: cleanBlocks(e.body as never), status: e.status, kind: e.kind, ...(e.slug ? { slug: e.slug as string } : {}) });
  }
  return { entries };
}
