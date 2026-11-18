"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip/Chip";
import { ProjectCard } from "@/components/ui/ProjectCard/ProjectCard";
import { filterProjects, leadTag, projectFilters, type ProjectFilter } from "@/data/projects";
import styles from "./ProjectsBrowser.module.css";

/** Figma: All projects → Toolbar (filter chips) + Project grid. */
export function ProjectsBrowser() {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const list = filterProjects(filter);

  return (
    <>
      <div className={styles.toolbar}>
        <div className={`container ${styles.chips}`} role="group" aria-label="Filter projects">
          {projectFilters.map((f) => (
            <Chip
              key={f.id}
              appearance="soft"
              selected={filter === f.id}
              count={f.id === "all" ? filterProjects("all").length : undefined}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      <section className={`container ${styles.grid}`} aria-live="polite" aria-label="Projects">
        {list.map((p) => (
          <ProjectCard
            key={p.slug}
            href={`/projects/${p.slug}`}
            cover={p.cover}
            tag={leadTag(p)}
            number={p.number}
            title={p.title}
            description={p.description}
            more={Math.max(0, p.tags.length - 1)}
          />
        ))}
        {list.length === 0 && <p className="body-m">No projects with this tag yet.</p>}
      </section>
    </>
  );
}
