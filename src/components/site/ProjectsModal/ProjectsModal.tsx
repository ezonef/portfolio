"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@/components/ui/Chip/Chip";
import type { IconName } from "@/components/ui/Icon/Icon";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { ProjectCard } from "@/components/ui/ProjectCard/ProjectCard";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { categoryLabel, projects, type ProjectCategory } from "@/data/projects";
import styles from "./ProjectsModal.module.css";

const quick: { id: ProjectCategory; label: string; icon: IconName }[] = [
  { id: "admin", label: "Admin panel", icon: "list" },
  { id: "ds", label: "Design system", icon: "layout-grid" },
  { id: "mobile", label: "iOS app", icon: "smartphone" },
];

type Props = { open: boolean; onClose: () => void };

/**
 * Projects modal on the native <dialog>: showModal() gives focus trapping, Esc to close
 * and a ::backdrop for the scrim. Clicking the scrim closes it too.
 */
export function ProjectsModal({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProjectCategory | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (!category || p.category === category) &&
        (!q || `${p.title} ${p.description} ${categoryLabel[p.category]}`.toLowerCase().includes(q)),
    );
  }, [query, category]);

  const showRecent = !query && !category;
  const list = showRecent ? projects.filter((p) => p.recent).concat(projects.filter((p) => !p.recent)).slice(0, 3) : results;

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label="Projects"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the scrim
      }}
    >
      <div className={styles.modal}>
        <div className={styles.search}>
          <SearchField
            label="Search projects"
            placeholder="Search projects, screens, UI elements, flows…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className={styles.field}
          />
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>

        <div className={styles.chips}>
          {quick.map((c) => (
            <Chip
              key={c.id}
              icon={c.icon}
              selected={category === c.id}
              onClick={() => setCategory((cur) => (cur === c.id ? null : c.id))}
            >
              {c.label}
            </Chip>
          ))}
        </div>

        <div className={styles.body}>
          <div className={styles.label}>
            <span className="mono-label">{showRecent ? "Recent" : `Results · ${results.length}`}</span>
            <Link href="/#work" className={styles.seeAll} onClick={onClose}>
              See all {String(projects.length).padStart(2, "0")} →
            </Link>
          </div>

          {list.length > 0 ? (
            <div className={styles.grid}>
              {list.map((p) => (
                <ProjectCard
                  key={p.slug}
                  compact
                  href={`/projects/${p.slug}`}
                  cover={p.cover}
                  category={categoryLabel[p.category]}
                  number={p.number}
                  title={p.title}
                  meta={`${p.company} · ${p.years}`}
                  onNavigate={onClose}
                />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>Nothing found for “{query}”. Try “admin”, “design system” or “iOS”.</p>
          )}
        </div>
      </div>
    </dialog>
  );
}
