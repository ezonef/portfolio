import type { Metadata } from "next";
import Link from "next/link";
import { CaseBlocks } from "@/components/site/CaseBlocks/CaseBlocks";
import { SiteFooter } from "@/components/site/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader/SiteHeader";
import { changelog } from "@/data/changelog";
import { projects } from "@/data/projects";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Changelog — Mykyta Sharapaniuk" };

const nice = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** What changed on the site — only lines approved in the admin (src/content/changelog.json). */
export default function ChangelogPage() {
  const live = new Set(projects.map((p) => p.slug));
  return (
    <>
      <SiteHeader current="changelog" />
      <main>
        <section className={`container ${styles.hero}`}>
          <p className="mono-m">/ changelog</p>
          <h1 className={`display-l ${styles.title}`}>What’s new on the site.</h1>
        </section>

        <section className={`container ${styles.body}`}>
          {changelog.length === 0 ? (
            <p className={`body-l ${styles.empty}`}>Nothing here yet.</p>
          ) : (
            <ol className={styles.list}>
              {changelog.map((e) => (
                <li key={e.id} className={styles.entry}>
                  <time className={`mono-s ${styles.date}`} dateTime={e.date}>
                    {nice(e.date)}
                  </time>
                  <div className={styles.content}>
                    <h2 className="heading-h3">
                      {e.slug && live.has(e.slug) ? (
                        <Link href={`/projects/${e.slug}`} className={styles.link}>
                          {e.title} →
                        </Link>
                      ) : (
                        e.title
                      )}
                    </h2>
                    {e.body.length > 0 && <CaseBlocks blocks={e.body} className={styles.text} />}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
