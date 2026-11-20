import type { Metadata } from "next";
import { DotTimeline } from "@/components/site/DotTimeline/DotTimeline";
import { Hairline } from "@/components/site/Hairline/Hairline";
import { ScrollStatements } from "@/components/site/ScrollStatements/ScrollStatements";
import { SectionNav } from "@/components/site/SectionNav/SectionNav";
import { SkillArt } from "@/components/site/SkillArt/SkillArt";
import { SiteFooter } from "@/components/site/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader/SiteHeader";
import {
  ai,
  collaboration,
  collaborationIntro,
  drawingTime,
  processFacts,
  processHero,
  skills,
  steps,
  timeStatements,
} from "@/data/process";
import styles from "./page.module.css";

/** The bottom bar: the page's sections, named after the stages of the process */
const NAV = [
  { id: "introduction", label: "Introduction" },
  { id: "discover", label: "Discover" },
  { id: "economy", label: "Economy", badge: true },
  { id: "architecture", label: "Define" },
  { id: "pains", label: "Ideate" },
  { id: "system", label: "Prototype" },
  { id: "skills", label: "Test" },
  { id: "together", label: "Deliver" },
];

export const metadata: Metadata = { title: "My design process — Mykyta Sharapaniuk" };

/** A section tag: ■ LABEL in a hairline box */
const Tag = ({ children }: { children: string }) => (
  <p className={`mono-xs ${styles.tag}`}>
    <span className={styles.tagMark} aria-hidden />
    {children}
  </p>
);

/** Two-tone heading: the first part in ink, the second muted */
const Title = ({ parts, as: As = "h2", id, className }: { parts: string[]; as?: "h1" | "h2"; id?: string; className?: string }) => (
  <As id={id} className={className}>
    {parts[0]} <span className={styles.dim}>{parts[1]}</span>
  </As>
);

/** Bits of ASCII scattered over the hero's dot grid, on fixed spots (same on server and client) */
const BITS = ["+", "·", "##", "01", "0x1F", ":·:", "*", "=", "-=+", "%", "@", "▢", "1011", "::", "#"];
function HeroCanvas() {
  let seed = 11;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 2 ** 32);
  const bits = Array.from({ length: 64 }, (_, i) => ({
    x: Math.round(rnd() * 98 * 10) / 10,
    y: Math.round(rnd() * 92 * 10) / 10,
    t: BITS[i % BITS.length],
    o: 0.35 + rnd() * 0.65,
  }));
  return (
    <div className={styles.heroCanvas} aria-hidden>
      {bits.map((b, i) => (
        <span key={i} style={{ left: `${b.x}%`, top: `${b.y}%`, opacity: b.o }}>
          {b.t}
        </span>
      ))}
    </div>
  );
}

/**
 * My design process. A framed column; sections are cells divided by hairlines.
 * Order: hero → where my time goes → AI → drawing time before/after → three steps → skills bento → working together.
 * Words: src/data/process.ts. Figures: Hairline (src/components/site/Hairline).
 */
export default function ProcessPage() {
  return (
    <>
      <SiteHeader current="process" />
      <main className={styles.page}>
        <div className={styles.frame}>
          {/* Hero */}
          <section id="introduction" className={styles.hero}>
            <HeroCanvas />
            <Tag>{processHero.tag}</Tag>
            <Title as="h1" parts={processHero.title} className={`display-l ${styles.heroTitle}`} />
            <p className={`body-l ${styles.heroLead}`}>{processHero.lead}</p>
            <Hairline name="layers" className={styles.heroFigure} />
          </section>

          <dl className={styles.facts}>
            {processFacts.map((f) => (
              <div key={f.label} className={styles.fact}>
                <dt className="mono-label">{f.label}</dt>
                <dd className="body-m">{f.value}</dd>
              </div>
            ))}
          </dl>

          {/* Where my time goes */}
          <section id="discover" className={`${styles.cell} ${styles.time}`} aria-labelledby="time-title">
            <Tag>Where my time goes</Tag>
            <h2 id="time-title" className="visually-hidden">
              Where my time goes
            </h2>
            <ScrollStatements lines={timeStatements} size={`display-l ${styles.statement}`} />
          </section>

          {/* AI */}
          <section className={styles.processHead} aria-labelledby="ai-title">
            <Tag>{ai.tag}</Tag>
            <Title id="ai-title" parts={ai.title} className={`heading-h1 ${styles.sectionTitle}`} />
          </section>
          <section className={styles.toolkit} aria-label="Toolkit">
            <p className={`body-m ${styles.noTrust}`}>{ai.noTrust}</p>
            <dl className={styles.tools}>
              {ai.toolkit.map((t) => (
                <div key={t.name} className={styles.tool}>
                  <dt className="mono-s">{t.name}</dt>
                  <dd className="body-s">{t.use}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Where the hours go: the dots assemble into a chart as you scroll */}
          <section id="economy" className={styles.chartCell} aria-labelledby="drawing-title">
            <DotTimeline columns={drawingTime.columns} aiFrom={drawingTime.aiFrom}>
              <div className={styles.chartHead}>
                <Title id="drawing-title" parts={drawingTime.title} className={`heading-h1 ${styles.sectionTitle}`} />
                <p className={`body-m ${styles.chartText}`}>{drawingTime.text}</p>
              </div>
            </DotTimeline>
            <p className={`mono-xs ${styles.chartNote}`}>{drawingTime.note}</p>
          </section>

          {/* Steps: text and figure swap sides each time */}
          {steps.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className={`${styles.cell} ${styles.step}`}
              data-flip={i % 2 === 1 || undefined}
              data-step={s.id}
              aria-labelledby={`${s.id}-title`}
            >
              <div className={styles.stepBody}>
                <Tag>{s.tag}</Tag>
                <h2 id={`${s.id}-title`} className={`heading-h1 ${styles.stepTitle}`}>
                  {s.title}
                </h2>
                {s.text.map((t) => (
                  <p key={t} className={`body-m ${styles.stepText}`}>
                    {t}
                  </p>
                ))}
              </div>
              <div className={styles.stepFigure}>
                <Hairline name={s.figure} />
              </div>
            </section>
          ))}

          {/* Skills bento */}
          <section id="skills" className={styles.cell} aria-labelledby="skills-title">
            <Tag>{skills.tag}</Tag>
            <Title id="skills-title" parts={skills.title} className={`heading-h1 ${styles.sectionTitle}`} />
            <p className={`body-m ${styles.skillsText}`}>{skills.text}</p>
            <ul className={styles.bento}>
              {skills.items.map((k) => (
                <li key={k.name} className={styles.bentoCell} data-size={k.size}>
                  <div className={styles.bentoArt}>
                    <SkillArt name={k.art} />
                  </div>
                  <span className={`mono-xs ${styles.skill}`}>/{k.skill}</span>
                  <h3 className="heading-h3">{k.name}</h3>
                  <p className={`body-s ${styles.bentoText}`}>{k.text}</p>
                  <p className={`mono-xs ${styles.saves}`}>{k.saves}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Working together */}
          <section id="together" className={`${styles.cell} ${styles.collab}`} aria-labelledby="collab-title">
            <div>
              <Tag>Working together</Tag>
              <h2 id="collab-title" className={`heading-h2 ${styles.sectionTitle}`}>
                Working together
              </h2>
              <p className="body-m">{collaborationIntro}</p>
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

          <p className={`mono-xs ${styles.credit}`}>
            Illustrations: <a href="https://github.com/lucasmarkes/hairline">Hairline</a> by Lucas Marques, MIT.
          </p>
        </div>
      </main>
      <SectionNav label="Process stages" items={NAV} />
      <SiteFooter />
    </>
  );
}
