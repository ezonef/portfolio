import { notFound } from "next/navigation";
import { Placeholder } from "@/components/site/Placeholder/Placeholder";
import { categoryLabel, projects } from "@/data/projects";

// Pre-render one page per project at build time.
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <Placeholder
      current="projects"
      eyebrow={`/ case ${project.number} — ${categoryLabel[project.category].toLowerCase()}`}
      title={project.title}
    />
  );
}
