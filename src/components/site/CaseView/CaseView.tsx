"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CaseBlocks } from "@/components/site/CaseBlocks/CaseBlocks";
import { EmbedFrame } from "@/components/site/PrototypeFrame/EmbedFrame";
import { PrototypeFrame } from "@/components/site/PrototypeFrame/PrototypeFrame";
import { Icon } from "@/components/ui/Icon/Icon";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { Step } from "@/components/ui/Step/Step";
import { Tag } from "@/components/ui/Tag/Tag";
import { isColor, type CaseStudy } from "@/data/case-types";
import { findPrototype } from "@/prototypes/registry";
import { PrototypeToolsSlot } from "@/prototypes/tools-slot";
import styles from "./CaseView.module.css";

type Props = {
  study: CaseStudy;
  eyebrow: string;
  /** The project's tags — shown under the headline */
  tags: string[];
  next: { href: string; number: string; title: string };
};

/** The Description card closes by itself after this long, unless it's being read */
const NOTES_AUTO_CLOSE = 7000;

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
  // screens shown at least once — code prototypes mount on first view
  const [seen, setSeen] = useState(() => new Set([0]));
  useEffect(() => {
    setSeen((v) => (v.has(active) ? v : new Set(v).add(active)));
  }, [active]);

  // Description card on the player: open by default, the viewer's choice is remembered
  const [notesOpen, setNotesOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem("case-notes") === "closed") setNotesOpen(false);
    } catch {}
  }, []);
  const [notesHeld, setNotesHeld] = useState(false);
  const toggleNotes = () => {
    setNotesHeld(false);
    setNotesOpen((open) => {
      try {
        localStorage.setItem("case-notes", open ? "closed" : "open");
      } catch {}
      return !open;
    });
  };
  const hasNotes = step.body.length > 0;
  // closes on its own; doesn't count as the viewer's choice, so it isn't remembered
  useEffect(() => {
    if (!notesOpen || !hasNotes || notesHeld) return;
    const t = setTimeout(() => setNotesOpen(false), NOTES_AUTO_CLOSE);
    return () => clearTimeout(t);
  }, [notesOpen, hasNotes, notesHeld, active]);
  // the active prototype can put its own button here, beside Description
  const [toolsSlot, setToolsSlot] = useState<HTMLElement | null>(null);

  // Esc closes the open card (not while typing somewhere)
  useEffect(() => {
    if (!notesOpen || !hasNotes) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target;
      if (t instanceof Element && t.closest("input, textarea, [contenteditable]")) return;
      toggleNotes();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
        <div className={styles.stageWrap}>
          <div className={styles.stage}>
            {steps.map((s, i) => (
              <div key={i} className={styles.layer} data-active={i === active} aria-hidden={i !== active} inert={i !== active}>
                {isColor(s.backdrop) ? (
                  <div className={styles.backdropColor} style={{ background: s.backdrop }} />
                ) : (
                  s.backdrop && <Image src={s.backdrop} alt="" fill priority={i === 0} sizes="(max-width: 1024px) 100vw, 60vw" className={styles.backdrop} />
                )}
                <div className={styles.screens} data-fill={s.embed || findPrototype(s.prototype)?.fill ? true : undefined}>
                  {s.embed ? (
                    seen.has(i) && <EmbedFrame src={s.embed} title={`Screen ${i + 1}: ${s.title}`} />
                  ) : s.prototype ? (
                    // a live prototype mounts the first time its screen is shown, then stays (keeps its state)
                    seen.has(i) && (
                      <PrototypeToolsSlot.Provider value={i === active ? toolsSlot : null}>
                        <PrototypeFrame id={s.prototype} label={`Screen ${i + 1}: ${s.title}`} />
                      </PrototypeToolsSlot.Provider>
                    )
                  ) : (
                    <Image
                      src={s.screen}
                      alt={i === active ? `Screen ${i + 1}: ${s.title}` : ""}
                      fill
                      priority={i === 0}
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className={styles.screen}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.tools}>
            <div ref={setToolsSlot} className={styles.toolsSlot} />
            {hasNotes && (
              <button
                type="button"
                className={`mono-s ${styles.notesToggle}`}
                aria-expanded={notesOpen}
                aria-controls="screen-notes"
                onClick={toggleNotes}
              >
                <Icon name="circle-help" />
                Description
              </button>
            )}
          </div>

          {/* What's on the current screen — a card on the player, next to what it describes.
              Desktop: floats over the backdrop and can be hidden. Phone: sits under the screen. */}
          {hasNotes && (
            <>
              <div
                id="screen-notes"
                className={styles.notes}
                data-open={notesOpen}
                aria-live="polite"
                onPointerEnter={(e) => e.pointerType === "mouse" && setNotesHeld(true)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setNotesHeld(false)}
                onFocus={() => setNotesHeld(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setNotesHeld(false);
                }}
              >
                <p className={`mono-label ${styles.notesTitle}`}>
                  {pad(active + 1)} · {step.title}
                </p>
                <CaseBlocks key={active} blocks={step.body} className={styles.notesBody} />
                <button type="button" className={styles.notesClose} onClick={toggleNotes} tabIndex={notesOpen ? 0 : -1}>
                  <span>Close</span>
                  <kbd className={styles.notesKey}>esc</kbd>
                </button>
              </div>
            </>
          )}
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
        </p>
      </aside>
    </div>
  );
}
