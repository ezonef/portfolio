import type { Metadata } from "next";
import { ProjectsBrowser } from "@/components/site/ProjectsBrowser/ProjectsBrowser";
import { SiteFooter } from "@/components/site/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader/SiteHeader";
import { projects } from "@/data/projects";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "All projects — Mykyta Sharapaniuk" };

/** Figma: All projects · 1440 — hero, filter toolbar, 3-column grid of ProjectCards. */
export default function ProjectsPage() {
  return (
    <>
      <SiteHeader current="projects" />
      <main>
        <section className={`container ${styles.hero}`}>
          <p className="mono-m">/ projects — 2023 → now</p>
          <div className={styles.titleRow}>
            <h1 className={`display-xl ${styles.title}`}>
              All projects <span className={`mono-m ${styles.count}`}>({String(projects.length).padStart(2, "0")})</span>
            </h1>
            <p className={`body-l ${styles.intro}`}>
              [One line: what kinds of products these are and what connects them.]
            </p>
          </div>
        </section>
        <ProjectsBrowser />
      </main>
      <SiteFooter />
    </>
  );
}
