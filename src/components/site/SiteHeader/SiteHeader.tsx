import Link from "next/link";
import { NavLink } from "@/components/ui/NavLink/NavLink";
import { site } from "@/data/site";
import { ContactMenu } from "../ContactMenu/ContactMenu";
import { MobileMenu } from "../MobileMenu/MobileMenu";
import styles from "./SiteHeader.module.css";

type Page = "home" | "projects" | "process";

/** SiteHeader pattern: logo, nav (Contact opens the menu), status. */
export function SiteHeader({ current = "home" }: { current?: Page }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          {site.name}
        </Link>

        <nav aria-label="Main" className={styles.nav}>
          <NavLink href="/projects" active={current === "projects"}>
            Projects
          </NavLink>
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

        <MobileMenu />
      </div>
    </header>
  );
}
