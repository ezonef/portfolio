"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Chip } from "@/components/ui/Chip/Chip";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { ProjectCard } from "@/components/ui/ProjectCard/ProjectCard";
import { filterProjects, leadTag, homeFilters, projects, type ProjectFilter } from "@/data/projects";
import styles from "./SelectedWork.module.css";

/** Next card starts when the previous one is 90% faded in (see the entrance note below) */
const OVERLAP = 0.36;
/** The whole entrance, first card in → last card settled */
const TOTAL = 1600;

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

  /**
   * Entrance: when the cards come into view they fade in one after another — each starts when the one
   * before is 90% visible — and the whole run takes about 1.6 s. After that, filtering is instant.
   * With --ease-out a card reaches 90% at 36% of its time, hence OVERLAP.
   */
  const [reveal, setReveal] = useState<"waiting" | "playing" | "done">("waiting");
  const count = useRef(list.length);
  const rise = Math.min(1000, TOTAL / (OVERLAP * Math.max(0, count.current - 1) + 1));
  useEffect(() => {
    const track = trackRef.current;
    if (!track || reveal !== "waiting") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setReveal("playing");
      },
      { threshold: 0.25 },
    );
    io.observe(track);
    return () => io.disconnect();
  }, [reveal]);
  useEffect(() => {
    if (reveal !== "playing") return;
    const total = rise * (OVERLAP * Math.max(0, count.current - 1) + 1);
    const t = setTimeout(() => setReveal("done"), total + 50);
    return () => clearTimeout(t);
  }, [reveal, rise]);

  const scrollTo = (i: number) => {
    const track = trackRef.current;
    const card = track?.children[i] as HTMLElement | undefined;
    if (!track || !card) return;
    // JS smooth scrolling ignores the OS setting, so check it here
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: reduce ? "auto" : "smooth" });
    setIndex(i);
  };

  /**
   * Two cards are visible at once, so "next" ends when the track can't scroll any further —
   * not at the last card's index. The counter follows the card at the left edge.
   */
  const [atEnd, setAtEnd] = useState(false);
  const sync = () => {
    const track = trackRef.current;
    if (!track) return;
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 2);
    const cards = Array.from(track.children) as HTMLElement[];
    if (!cards.length) return;
    const left = track.scrollLeft;
    let nearest = 0;
    cards.forEach((c, i) => {
      if (Math.abs(c.offsetLeft - track.offsetLeft - left) < Math.abs(cards[nearest].offsetLeft - track.offsetLeft - left)) nearest = i;
    });
    setIndex(nearest);
  };
  const syncRef = useRef(sync);
  syncRef.current = sync;
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => syncRef.current());
    ro.observe(track);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    syncRef.current();
  }, [filter]);

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
              disabled={atEnd || index >= last}
              onClick={() => scrollTo(index + 1)}
            />
          </div>
        </div>

        <div
          ref={trackRef}
          className={styles.track}
          onScroll={sync}
          data-reveal={reveal}
          style={{ "--rise": `${Math.round(rise)}ms`, "--overlap": OVERLAP } as CSSProperties}
        >
          {list.map((p, i) => (
            <div key={p.slug} className={styles.slide} style={{ "--i": i } as CSSProperties}>
              <ProjectCard
                href={`/projects/${p.slug}`}
                cover={p.cover}
                tag={leadTag(p)}
                title={p.title}
                description={p.description}
                more={Math.max(0, p.tags.length - 1)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
