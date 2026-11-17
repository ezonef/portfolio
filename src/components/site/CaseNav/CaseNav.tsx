import Link from "next/link";
import { site } from "@/data/site";
import styles from "./CaseNav.module.css";

type Props = { number: string; total: string; nextHref: string };

/** Figma: Template/Case → Case nav — back link · logo · links · "01 / 06 · Next →". */
export function CaseNav({ number, total, nextHref }: Props) {
  return (
    <header className={styles.nav}>
      <Link href="/projects" className={styles.muted}>
        ← All projects
      </Link>
      <Link href="/" className={styles.logo}>
        {site.name}
      </Link>
      <nav aria-label="Main" className={styles.links}>
        <Link href="/">Main</Link>
        <Link href="/process">My design process</Link>
        <a href="/cv.pdf">CV</a>
        <a href={`mailto:${site.email}`}>Contact</a>
      </nav>
      <Link href={nextHref} className={styles.muted}>
        {number} / {total} · Next →
      </Link>
    </header>
  );
}
