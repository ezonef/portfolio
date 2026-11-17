"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { Step } from "@/components/ui/Step/Step";
import type { CaseStudy } from "@/data/cases";
import styles from "./CaseView.module.css";

type Props = {
  study: CaseStudy;
  eyebrow: string;
  next: { href: string; number: string; title: string };
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Figma: Template/Case → Body.
 * Left: the story (scrolls). Right: the screen panel (sticky) with a step player.
 * The ↗ links inside a step's text switch the player to that step.
 */
export function CaseView({ study, eyebrow, next }: Props) {
  const [active, setActive] = useState(0);
  const steps = study.steps;
  const step = steps[active];
  const go = (i: number) => setActive(Math.max(0, Math.min(steps.length - 1, i)));

  return (
    <div className={styles.body}>
      <article className={styles.story}>
        <p className={`mono-s ${styles.eyebrow}`}>{eyebrow}</p>
        <h1 className={`heading-h1 ${styles.title}`}>{study.headline}</h1>
        <p className={`body-l ${styles.lead}`}>{study.lead}</p>

        <dl className={styles.meta}>
          <div className={styles.cell}>
            <dt className="mono-label">Role</dt>
            <dd className="body-s">{study.role}</dd>
          </div>
        </dl>

        <h2 className={`heading-h2 ${styles.section}`}>Context</h2>
        <div className={styles.problem}>
          <p className="mono-label">Problem</p>
          <p className="body-m">{study.problem}</p>
        </div>

        <ol className={styles.flow}>
          {steps.map((s, i) => (
            <li key={s.title} className={styles.flowStep}>
              <div className={styles.flowHead}>
                <span className={`mono-s ${styles.flowNumber}`}>{pad(i + 1)}</span>
                <h3 className="heading-h3">{s.title}</h3>
              </div>
              <p className="body-m">{withLinks(s.text, () => setActive(i))}</p>
            </li>
          ))}
        </ol>

        <h2 className={`heading-h2 ${styles.section}`}>Key decisions</h2>
        <ul className={styles.decisions}>
          {study.decisions.map((d) => (
            <li key={d.chose} className={styles.decision}>
              <div>
                <p className="mono-label">Chose</p>
                <p className={`body-m ${styles.chose}`}>↗ {d.chose}</p>
              </div>
              <div>
                <p className="mono-label">Rejected</p>
                <p className="body-m">{d.rejected}</p>
              </div>
            </li>
          ))}
        </ul>

        <h2 className={`heading-h2 ${styles.section}`}>Outcome</h2>
        <p className={`body-m ${styles.outcome}`}>{study.outcome}</p>

        <Link href={next.href} className={styles.next}>
          <span className="mono-label">Next case · {next.number}</span>
          <span className="heading-h3">{next.title} →</span>
        </Link>
      </article>

      <aside className={styles.panel} aria-label="Screens">
        {/* All screens stay mounted and crossfade with a CSS transition, so rapid clicks
            retarget from the current opacity instead of restarting the fade. */}
        <div className={styles.stage}>
          {steps.map((s, i) => (
            <Image
              key={i}
              src={s.screen}
              alt={i === active ? `${study.flowName}, step ${i + 1}: ${s.title}` : ""}
              aria-hidden={i !== active}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className={styles.screen}
              data-active={i === active}
            />
          ))}
        </div>

        <div className={styles.player}>
          {steps.map((s, i) => (
            <Step key={s.title} number={pad(i + 1)} title={s.title} active={i === active} onClick={() => go(i)} />
          ))}
          <IconButton icon="arrow-left" label="Previous step" disabled={active === 0} onClick={() => go(active - 1)} />
          <IconButton
            icon="arrow-right"
            label="Next step"
            variant="primary"
            disabled={active === steps.length - 1}
            onClick={() => go(active + 1)}
          />
        </div>

        <p className={`mono-xs ${styles.caption}`} aria-live="polite">
          <span>
            {study.flowName} · {pad(active + 1)} / {pad(steps.length)} · {step.title}
          </span>
          <span className={styles.hint}>↗ {step.hint}</span>
        </p>
      </aside>
    </div>
  );
}

/** "[[text]]" → an underlined "↗ text" button that shows this step's screen. */
function withLinks(text: string, onPick: () => void): ReactNode {
  return text.split(/\[\[(.+?)\]\]/g).map((part, i) =>
    i % 2 === 1 ? (
      <button key={i} type="button" className={styles.inline} onClick={onPick}>
        ↗ {part}
      </button>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
