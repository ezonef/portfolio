import type { Metadata } from "next";
import Image from "next/image";
import { ProcessStepper } from "@/components/site/ProcessStepper/ProcessStepper";
import { SiteFooter } from "@/components/site/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader/SiteHeader";
import {
  collaboration,
  collaborationIntro,
  principles,
  processFacts,
  processIntro,
  stages,
} from "@/data/process";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "My design process — Mykyta Sharapaniuk" };

const pad = (n: number) => String(n).padStart(2, "0");

/** Figma: My design process · 1440 and · 390. Content lives in src/data/process.ts. */
export default function ProcessPage() {
  return (
    <>
      <SiteHeader current="process" />
      <main>
        <section className={`container ${styles.hero}`}>
          <p className="mono-m">/ my design process — how I work</p>
          <h1 className={`display-l ${styles.title}`}>From a messy problem to a clear, shipped interface.</h1>
          <p className={`body-l ${styles.lead}`}>{processIntro}</p>
          <dl className={styles.facts}>
            {processFacts.map((f) => (
              <div key={f.label} className={styles.fact}>
                <dt className="mono-label">{f.label}</dt>
                <dd className="heading-h3">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <ProcessStepper stages={stages} />

        <section className={`container ${styles.stages}`} aria-label="Stages">
          {stages.map((s, i) => (
            <article key={s.id} id={s.id} className={styles.stage}>
              <header className={styles.stageHead}>
                <span className="mono-m">{pad(i + 1)}</span>
                <h2 className="heading-h2">{s.name}</h2>
                <span className={`mono-s ${styles.length}`}>{s.length}</span>
              </header>

              <div className={styles.stageBody}>
                <p className="body-l">{s.purpose}</p>
                <div className={styles.lists}>
                  <div>
                    <p className="mono-label">I do</p>
                    <ul className="body-s">
                      {s.doList.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mono-label">You get</p>
                    <ul className="body-s">
                      {s.getList.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mono-label">Tools</p>
                    <p className="mono-s">{s.tools}</p>
                  </div>
                </div>
              </div>

              <figure className={styles.artifact}>
                {s.artifact.src ? (
                  <Image src={s.artifact.src} alt={s.artifact.label} fill sizes="(max-width: 760px) 100vw, 360px" />
                ) : (
                  <figcaption className="mono-xs">{s.artifact.label}</figcaption>
                )}
              </figure>
            </article>
          ))}
        </section>

        <section className={`container ${styles.principles}`} aria-labelledby="principles-title">
          <div className={styles.sectionHead}>
            <h2 id="principles-title" className="heading-h2">
              Principles
            </h2>
            <p className="mono-s">what stays the same on every project</p>
          </div>
          <ol className={styles.cards}>
            {principles.map((p, i) => (
              <li key={p.title} className={styles.card}>
                <span className="mono-xs">P/{pad(i + 1)}</span>
                <h3 className="heading-h3">{p.title}</h3>
                <p className="body-s">{p.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={`container ${styles.collab}`} aria-labelledby="collab-title">
          <div className={styles.collabHead}>
            <h2 id="collab-title" className="heading-h2">
              Working together
            </h2>
            <p className="body-s">{collaborationIntro}</p>
          </div>
          <dl className={styles.rows}>
            {collaboration.map((r) => (
              <div key={r.when} className={styles.row}>
                <dt className="mono-s">{r.when}</dt>
                <dd className="body-m">{r.what}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
