import Link from "next/link";
import { NavLink } from "@/components/ui/NavLink/NavLink";
import { site } from "@/data/site";
import { ContactMenu } from "../ContactMenu/ContactMenu";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./CaseNav.module.css";

type Props = { number: string; total: string; nextHref: string };

/** Figma: Template/Case → Case nav — back link · logo · links · "01 / 06 · Next →" · theme. */
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
        <NavLink href="/">Main</NavLink>
        <NavLink href="/process">My design process</NavLink>
        <NavLink href="/cv.pdf">CV.pdf</NavLink>
        <ContactMenu />
      </nav>
      <div className={styles.end}>
        <Link href={nextHref} className={styles.muted}>
          {number} / {total} · Next →
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
