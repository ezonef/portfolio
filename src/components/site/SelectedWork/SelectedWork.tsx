"use client";

import { useRef, useState } from "react";
import { Chip } from "@/components/ui/Chip/Chip";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { ProjectCard } from "@/components/ui/ProjectCard/ProjectCard";
import { categoryLabel, filterProjects, filters, projects, type ProjectFilter } from "@/data/projects";
import styles from "./SelectedWork.module.css";

/** "Selected work": filter chips + a horizontal track of ProjectCards with ← / → paging. */
export function SelectedWork() {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const list = filterProjects(filter);
  const pad = (n: number) => String(n).padStart(2, "0");

  const scrollTo = (i: number) => {
    const track = trackRef.current;
    const card = track?.children[i] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
    setIndex(i);
  };

  const choose = (f: ProjectFilter) => {
    setFilter(f);
    setIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
  };

  return (
    <section id="work" className={`container ${styles.section}`} aria-labelledby="work-title">
      <div className={styles.head}>
        <div className={styles.title}>
          <h2 id="work-title" className="heading-h2">
            Selected work
          </h2>
          <span className="mono-m" aria-live="polite">
            {pad(Math.min(index + 1, list.length))} / {pad(list.length)}
          </span>
          <div className={styles.pager}>
            <IconButton icon="arrow-left" label="Previous case" disabled={index === 0} onClick={() => scrollTo(index - 1)} />
            <IconButton
              icon="arrow-right"
              label="Next case"
              variant="primary"
              disabled={index >= list.length - 1}
              onClick={() => scrollTo(index + 1)}
            />
          </div>
        </div>
        <span className={`mono-s ${styles.total}`}>{pad(projects.length)} projects</span>
      </div>

      <div className={styles.chips} role="group" aria-label="Filter projects">
        {filters.map((f) => (
          <Chip key={f.id} selected={filter === f.id} count={filterProjects(f.id).length} onClick={() => choose(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div ref={trackRef} className={styles.track}>
        {list.map((p) => (
          <div key={p.slug} className={styles.slide}>
            <ProjectCard
              href={`/projects/${p.slug}`}
              cover={p.cover}
              category={categoryLabel[p.category]}
              number={p.number}
              title={p.title}
              description={p.description}
              meta={`${p.company} · ${p.years}`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
