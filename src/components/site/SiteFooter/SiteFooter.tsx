import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { AsciiBand } from "../AsciiBand/AsciiBand";
import { FOOTER_ASCII } from "@/data/ascii";
import { site } from "@/data/site";
import styles from "./SiteFooter.module.css";

const columns = [
  {
    label: "Index",
    links: [
      { t: "CV.pdf", h: "/cv.pdf" },
      { t: "Projects", h: "/#work" },
      { t: "About", h: "/#about" },
      { t: "My design process", h: "/process" },
    ],
  },
  {
    label: "Elsewhere",
    links: [
      { t: "LinkedIn", h: "https://www.linkedin.com/in/mykyta-sharapaniuk-1080a0339/" },
      { t: "Behance", h: "https://www.behance.net/nikitasarapamuk" },
      { t: "GitHub", h: "https://github.com/ezonef" },
    ],
  },
  { label: "Based", text: [site.location, site.timezone] },
  { label: "Languages", text: [site.languages] },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.asciiWrap}>
        <AsciiBand art={FOOTER_ASCII} tone="tertiary" />
      </div>

      <div className={`container ${styles.inner}`}>
        <div className={styles.cta}>
          <h2 className={`heading-h2 ${styles.heading}`}>
            <span className={styles.muted}>Have a complex product?</span> Let’s make it clear.
          </h2>
          <Button variant="inverse" icon="arrow-up-right" href={`mailto:${site.email}`}>
            {site.email}
          </Button>
        </div>

        <div className={styles.columns}>
          {columns.map((col) => (
            <div key={col.label}>
              <p className={`mono-label ${styles.label}`}>{col.label}</p>
              {col.links?.map((l) =>
                l.h.startsWith("http") ? (
                  <a key={l.t} href={l.h} target="_blank" rel="noreferrer" className={`${styles.link} ${styles.external}`}>
                    <span className={styles.name}>{l.t}</span>
                    <span aria-hidden>↗</span>
                  </a>
                ) : l.h.endsWith(".pdf") ? (
                  <a key={l.t} href={l.h} className={styles.link}>
                    {l.t}
                  </a>
                ) : (
                  <Link key={l.t} href={l.h} className={styles.link}>
                    {l.t}
                  </Link>
                ),
              )}
              {col.text?.map((t) => (
                <p key={t} className={styles.link}>
                  {t}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.bottom}>
          <span>© 2026 {site.fullName}</span>
          <span>Designed by me · front end built with Claude</span>
        </div>
      </div>
    </footer>
  );
}
