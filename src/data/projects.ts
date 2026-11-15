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
};

export const categoryLabel: Record<ProjectCategory, string> = {
  admin: "Admin & internal",
  ds: "Design system",
  mobile: "Mobile",
};

export const projects: Project[] = [
  { slug: "admin-panel", number: "01", title: "Admin panel — [Project]", description: "Internal tool: tables, filters, statuses, role-based views.", company: "Softica", years: "2025–26", category: "admin", recent: true, cover: "/images/cover-photo.jpg" },
  { slug: "design-system", number: "02", title: "Design system — [Project]", description: "Components, variables and slots for a growing product.", company: "Softica", years: "2025–26", category: "ds", recent: true, cover: "/images/cover-photo.jpg" },
  { slug: "ios-app", number: "03", title: "iOS app — [Project]", description: "Core mobile flows built on iOS guidelines.", company: "Outsorce", years: "2024–25", category: "mobile", recent: false, cover: "/images/cover-photo.jpg" },
  { slug: "templates-roles", number: "04", title: "Templates & roles — [Project]", description: "Template builder with permissions per role.", company: "Outsorce", years: "2024–25", category: "admin", recent: false, cover: "/images/cover-photo.jpg" },
  { slug: "component-library", number: "05", title: "Component library — [Project]", description: "From scattered screens to one source of truth.", company: "Outsorce", years: "2024–25", category: "ds", recent: false, cover: "/images/cover-photo.jpg" },
  { slug: "mobile", number: "06", title: "Mobile — [Project]", description: "First shipped product, under senior mentorship.", company: "Fuse", years: "2023–24", category: "mobile", recent: false, cover: "/images/cover-photo.jpg" },
];

export type ProjectFilter = "all" | "recent" | ProjectCategory;

export const filters: { id: ProjectFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recent" },
  { id: "admin", label: "Admin & internal tools" },
  { id: "ds", label: "Design systems" },
  { id: "mobile", label: "Mobile" },
];

export function filterProjects(filter: ProjectFilter) {
  if (filter === "all") return projects;
  if (filter === "recent") return projects.filter((p) => p.recent);
  return projects.filter((p) => p.category === filter);
}
