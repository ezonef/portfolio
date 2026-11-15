"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@/components/ui/Chip/Chip";
import type { IconName } from "@/components/ui/Icon/Icon";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { ProjectCard } from "@/components/ui/ProjectCard/ProjectCard";
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
 * Figma: quick filter chips + close in one row, then "Recent" and three ProjectCards.
 */
export function ProjectsModal({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) {
      setCategory(null);
      setShowAll(false);
    }
  }, [open]);

  const list = useMemo(() => {
    const filtered = category ? projects.filter((p) => p.category === category) : projects;
    return showAll || category ? filtered : filtered.slice(0, 3);
  }, [category, showAll]);

  const label = category ? `${categoryLabel[category]} · ${list.length}` : showAll ? "All projects" : "Recent";

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
        <div className={styles.top}>
          <div className={styles.chips} role="group" aria-label="Filter projects">
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
          <IconButton icon="x" label="Close" onClick={onClose} autoFocus />
        </div>

        <div className={styles.body}>
          <div className={styles.label}>
            <span className="mono-label">{label}</span>
            {!category && !showAll && (
              <button type="button" className={styles.seeAll} onClick={() => setShowAll(true)}>
                See all {String(projects.length).padStart(2, "0")} →
              </button>
            )}
          </div>

          <div className={styles.grid}>
            {list.map((p) => (
              <ProjectCard
                key={p.slug}
                href={`/projects/${p.slug}`}
                cover={p.cover}
                category={categoryLabel[p.category]}
                number={p.number}
                title={p.title}
                description={p.description}
                onNavigate={onClose}
              />
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
