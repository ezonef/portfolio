import type { IconName } from "@/components/ui/Icon/Icon";
import projectsData from "@/content/projects.json";

export type ProjectCategory = "admin" | "ds" | "mobile";

export type Project = {
  slug: string;
  number: string;
  title: string;
  description: string;
  company: string;
  years: string;
  category: ProjectCategory;
  recent: boolean;
  cover: string;
  /** UI topics the case covers — used by the Onboarding / Drawer chips. [Edit to match real cases] */
  topics: ProjectTopic[];
  /** Extra tags — the card shows their count as "+N". [Edit to match real cases] */
  tags: string[];
};

export type ProjectTopic = "onboarding" | "drawer";

export const categoryLabel: Record<ProjectCategory, string> = {
  admin: "Admin & internal",
  ds: "Design system",
  mobile: "Mobile",
};

/** Long form for the case eyebrow: "/ case 01 — admin & internal tools" */
export const categoryLong: Record<ProjectCategory, string> = {
  admin: "admin & internal tools",
  ds: "design systems",
  mobile: "mobile apps",
};

/** Edited through the local admin (npm run admin) — stored in src/content/projects.json. */
export const projects = projectsData as Project[];

export type ProjectFilter = "all" | ProjectCategory | ProjectTopic;

// Figma: Filter chips — All + 3 categories (Home) + 2 UI topics (All projects page)
export const projectFilters: { id: ProjectFilter; label: string; icon?: IconName; match: (p: Project) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "admin", label: "Admin panel", icon: "list", match: (p) => p.category === "admin" },
  { id: "ds", label: "Design system", icon: "layout-grid", match: (p) => p.category === "ds" },
  { id: "mobile", label: "iOS app", icon: "smartphone", match: (p) => p.category === "mobile" },
  { id: "onboarding", label: "Onboarding", icon: "link", match: (p) => p.topics.includes("onboarding") },
  { id: "drawer", label: "Drawer", icon: "monitor", match: (p) => p.topics.includes("drawer") },
];

/** Home shows only the first four (All + categories). */
export const homeFilters = projectFilters.slice(0, 4);

export function filterProjects(filter: ProjectFilter) {
  const f = projectFilters.find((x) => x.id === filter);
  return f ? projects.filter(f.match) : projects;
}
