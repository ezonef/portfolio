"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Chip } from "@/components/ui/Chip/Chip";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { ProjectCard } from "@/components/ui/ProjectCard/ProjectCard";
import { categoryLabel, filterProjects, homeFilters, projects, type ProjectFilter } from "@/data/projects";
import styles from "./SelectedWork.module.css";

/**
 * "Selected work" (Figma: Home → Selected work):
 * title + "See all" · filter chips · [counter + ← → column] [two ProjectCards in a scrollable track].
 */
export function SelectedWork() {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const list = filterProjects(filter);
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = Math.max(0, list.length - 1);

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
        <h2 id="work-title" className="heading-h2">
          Selected work
        </h2>
        <Link href="/projects" className={`mono-s ${styles.seeAll}`}>
          See all {pad(projects.length)} →
        </Link>
      </div>

      <div className={styles.chips} role="group" aria-label="Filter projects">
        {homeFilters.map((f) => (
          <Chip
            key={f.id}
            appearance="soft"
            icon={f.icon}
            selected={filter === f.id}
            count={filterProjects(f.id).length}
            onClick={() => choose(f.id)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      <div className={styles.row}>
        <div className={styles.side}>
          <p className={styles.counter} aria-live="polite">
            <span className={styles.current}>{pad(Math.min(index + 1, list.length))}</span>
            <span className="mono-m"> / {pad(list.length)}</span>
          </p>
          <div className={styles.pager}>
            <IconButton icon="arrow-left" label="Previous case" disabled={index === 0} onClick={() => scrollTo(index - 1)} />
            <IconButton
              icon="arrow-right"
              label="Next case"
              variant="primary"
              disabled={index >= last}
              onClick={() => scrollTo(index + 1)}
            />
          </div>
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
                more={p.tags.length}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
