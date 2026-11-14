"use client";

import Link from "next/link";
import { useState } from "react";
import { NavButton, NavLink } from "@/components/ui/NavLink/NavLink";
import { site } from "@/data/site";
import { ContactMenu } from "../ContactMenu/ContactMenu";
import { MobileMenu } from "../MobileMenu/MobileMenu";
import { ProjectsModal } from "../ProjectsModal/ProjectsModal";
import styles from "./SiteHeader.module.css";

type Page = "home" | "projects" | "process";

/** SiteHeader pattern: logo, nav (Projects opens the modal, Contact opens the menu), status. */
export function SiteHeader({ current = "home" }: { current?: Page }) {
  const [projectsOpen, setProjectsOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          {site.name}
          <span className={styles.accent}>_</span>
        </Link>

        <nav aria-label="Main" className={styles.nav}>
          <NavButton active={current === "projects" || projectsOpen} onClick={() => setProjectsOpen(true)}>
            Projects
          </NavButton>
          <NavLink href="/process" active={current === "process"}>
            My design process
          </NavLink>
          <NavLink href="/cv.pdf">CV.pdf</NavLink>
          <ContactMenu />
        </nav>

        <p className={styles.status}>
          <span className={styles.dot} aria-hidden />
          {site.status}
        </p>

        <MobileMenu onOpenProjects={() => setProjectsOpen(true)} />
      </div>

      <ProjectsModal open={projectsOpen} onClose={() => setProjectsOpen(false)} />
    </header>
  );
}
