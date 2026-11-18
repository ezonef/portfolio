"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CaseBlocks } from "@/components/site/CaseBlocks/CaseBlocks";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { Step } from "@/components/ui/Step/Step";
import { Tag } from "@/components/ui/Tag/Tag";
import type { CaseStudy } from "@/data/case-types";
import styles from "./CaseView.module.css";

type Props = {
  study: CaseStudy;
  eyebrow: string;
  /** The project's tags — shown under the headline */
  tags: string[];
  next: { href: string; number: string; title: string };
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Figma: Template/Case → Body.
 * Left: the story (scrolls). Right: the screen panel (sticky) with a step player.
 * The ↗ links inside a step's text switch the player to that step.
 */
export function CaseView({ study, eyebrow, tags, next }: Props) {
  const [active, setActive] = useState(0);
  const steps = study.steps;
  const step = steps[active];
  const go = (i: number) => setActive(Math.max(0, Math.min(steps.length - 1, i)));

  return (
    <div className={styles.body}>
      <article className={styles.story}>
        <p className={`mono-s ${styles.eyebrow}`}>{eyebrow}</p>
        <h1 className={`heading-h1 ${styles.title}`}>{study.headline}</h1>
        {tags.length > 0 && (
          <ul className={styles.tags} aria-label="Tags">
            {tags.map((t) => (
              <li key={t}>
                <Tag tone="muted">{t}</Tag>
              </li>
            ))}
          </ul>
        )}
        <p className={`body-l ${styles.lead}`}>{study.lead}</p>

        <dl className={styles.meta}>
          <div className={styles.cell}>
            <dt className="mono-label">Role</dt>
            <dd className="body-s">{study.role}</dd>
          </div>
        </dl>

        {study.story.length > 0 && <CaseBlocks blocks={study.story} className={styles.storyBlocks} />}


        {study.outcome.length > 0 && <CaseBlocks blocks={study.outcome} className={styles.outcomeBlocks} />}

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
            <div key={i} className={styles.layer} data-active={i === active} aria-hidden={i !== active}>
              {s.backdrop && (
                <Image src={s.backdrop} alt="" fill priority={i === 0} sizes="(max-width: 1024px) 100vw, 60vw" className={styles.backdrop} />
              )}
              <div className={styles.screens}>
                <Image
                  src={s.screen}
                  alt={i === active ? `Screen ${i + 1}: ${s.title}` : ""}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className={styles.screen}
                />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.player}>
          {steps.map((s, i) => (
            <Step key={i} number={pad(i + 1)} title={s.title} active={i === active} onClick={() => go(i)} />
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
            {pad(active + 1)} / {pad(steps.length)} · {step.title}
          </span>
          <span className={styles.hint}>↗ {step.hint}</span>
        </p>

        {/* What's on the current screen — written per screen in the admin */}
        {step.body.length > 0 && (
          <div className={styles.describe} aria-live="polite">
            <CaseBlocks key={active} blocks={step.body} />
          </div>
        )}
      </aside>
    </div>
  );
}
