import type { IconName } from "@/components/ui/Icon/Icon";

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

export const projects: Project[] = [
  { slug: "admin-panel", number: "01", title: "Admin panel — [Project]", description: "Internal tool: tables, filters, statuses, role-based views.", company: "Softica", years: "2025–26", category: "admin", recent: true, cover: "/images/cover-photo.jpg", topics: ["drawer"], tags: ["Tables", "Filters", "Roles"] },
  { slug: "design-system", number: "02", title: "Design system — [Project]", description: "Components, variables and slots for a growing product.", company: "Softica", years: "2025–26", category: "ds", recent: true, cover: "/images/cover-photo.jpg", topics: [], tags: ["Variables", "Slots", "Docs"] },
  { slug: "ios-app", number: "03", title: "iOS app — [Project]", description: "Core mobile flows built on iOS guidelines.", company: "Outsorce", years: "2024–25", category: "mobile", recent: false, cover: "/images/cover-photo.jpg", topics: ["onboarding"], tags: ["SwiftUI", "Onboarding", "Payments"] },
  { slug: "templates-roles", number: "04", title: "Templates & roles — [Project]", description: "Template builder with permissions per role.", company: "Outsorce", years: "2024–25", category: "admin", recent: false, cover: "/images/cover-photo.jpg", topics: ["onboarding", "drawer"], tags: ["Builder", "Permissions"] },
  { slug: "component-library", number: "05", title: "Component library — [Project]", description: "From scattered screens to one source of truth.", company: "Outsorce", years: "2024–25", category: "ds", recent: false, cover: "/images/cover-photo.jpg", topics: [], tags: ["Tokens", "Audit", "Docs"] },
  { slug: "mobile", number: "06", title: "Mobile — [Project]", description: "First shipped product, under senior mentorship.", company: "Fuse", years: "2023–24", category: "mobile", recent: false, cover: "/images/cover-photo.jpg", topics: ["onboarding"], tags: ["iOS", "Android"] },
];

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
