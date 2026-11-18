import projectsData from "@/content/projects.json";

export * from "./project-meta";
import type { Project } from "./project-meta";

/**
 * Edited through the local admin (npm run admin) — stored in src/content/projects.json.
 * The site sees only published, visible cases, numbered 01, 02… in list order.
 */
export const projects: Project[] = (projectsData as Project[])
  .filter((p) => !p.hidden && !p.draft)
  .map((p, i) => ({ ...p, number: String(i + 1).padStart(2, "0") }));

/** "all" or a tag. */
export type ProjectFilter = string;

/** Filter chips: All + every tag used by a visible case, most used first (ties keep list order). */
export const projectFilters: { id: ProjectFilter; label: string }[] = (() => {
  const count = new Map<string, number>();
  for (const p of projects) for (const t of new Set(p.tags)) count.set(t, (count.get(t) ?? 0) + 1);
  const tags = [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)!);
  return [{ id: "all", label: "All" }, ...tags.map((t) => ({ id: t, label: t }))];
})();

/** Home shows All + the three most used tags. */
export const homeFilters = projectFilters.slice(0, 4);

export function filterProjects(filter: ProjectFilter) {
  return filter === "all" ? projects : projects.filter((p) => p.tags.includes(filter));
}

/** Small helpers for the card and the case eyebrow. */
export const leadTag = (p: Project) => p.tags[0];
export const caseEyebrow = (number: string, p: Project) =>
  `/ case ${number}${leadTag(p) ? ` — ${leadTag(p).toLowerCase()}` : ""}`;
