import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseNav } from "@/components/site/CaseNav/CaseNav";
import { CaseView } from "@/components/site/CaseView/CaseView";
import { SiteFooter } from "@/components/site/SiteFooter/SiteFooter";
import { getCase, nextProject } from "@/data/cases";
import { categoryLong, projects } from "@/data/projects";

type Params = { params: Promise<{ slug: string }> };

// Pre-render one page per project at build time.
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  return { title: project ? `${project.title} — Mykyta Sharapaniuk` : "Case" };
}

/** Figma: Case · 1440 (Template/Case). */
export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const next = nextProject(project);
  const total = String(projects.length).padStart(2, "0");

  return (
    <>
      <CaseNav number={project.number} total={total} nextHref={`/projects/${next.slug}`} />
      <main>
        <CaseView
          study={getCase(project)}
          eyebrow={`/ case ${project.number} — ${categoryLong[project.category]}`}
          next={{ href: `/projects/${next.slug}`, number: next.number, title: next.title }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
