"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { CaseBlocks } from "@/components/site/CaseBlocks/CaseBlocks";
import { EmbedFrame, LinkFrame } from "@/components/site/PrototypeFrame/EmbedFrame";
import { PrototypeFrame } from "@/components/site/PrototypeFrame/PrototypeFrame";
import { Icon } from "@/components/ui/Icon/Icon";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { Segmented } from "@/components/ui/Segmented/Segmented";
import { Step } from "@/components/ui/Step/Step";
import { Tag } from "@/components/ui/Tag/Tag";
import { isColor, linkLabel, type CaseLink, type CaseStep, type CaseStudy, type ScreenSource } from "@/data/case-types";
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
type Device = "desktop" | "mobile";
const DEVICES: { value: Device; label: string }[] = [
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
];

/** The screen's own links, plus the page it shows live, so that page can always be opened */
function linksFor(step: CaseStep, device: Device): CaseLink[] {
  const url = device === "mobile" && step.mobile ? step.mobile.url : step.url;
  const list = step.links ?? [];
  return url && !list.some((l) => l.url === url) ? [{ label: linkLabel(url), url }, ...list] : list;
}

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

  // Desktop or phone layout, for the screens that have both. Phones start on the phone layout.
  const [device, setDevice] = useState<Device>("desktop");
  const [mobileShown, setMobileShown] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(max-width: 760px)").matches) setDevice("mobile");
  }, []);
  useEffect(() => {
    if (device === "mobile") setMobileShown(true);
  }, [device]);
  const hasMobile = !!step.mobile;
  const links = linksFor(step, device);

  // Fullscreen moves the same player, so a prototype keeps its state
  const wrap = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const native = useRef(false);
  const enterFull = () => {
    setFull(true);
    wrap.current
      ?.requestFullscreen?.()
      .then(() => (native.current = true))
      .catch(() => {});
  };
  const exitFull = () => {
    setFull(false);
    native.current = false;
    if (document.fullscreenElement) void document.exitFullscreen();
  };
  useEffect(() => {
    const change = () => {
      if (!document.fullscreenElement && native.current) {
        native.current = false;
        setFull(false);
      }
    };
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    if (!full) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [full]);
  // Browsers without the Fullscreen API: Esc closes the description first, then the player
  useEffect(() => {
    if (!full || (notesOpen && hasNotes)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, [contenteditable]")) return;
      exitFull();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full, notesOpen, hasNotes]);

  // The player's controls are one block the viewer can drag anywhere over the screen
  const stage = useRef<HTMLDivElement>(null);
  const dockEl = useRef<HTMLDivElement>(null);
  const dockAt = useRef({ x: 0, y: 0 });
  const dockGrab = useRef<{ x: number; y: number } | null>(null);
  const [dock, setDock] = useState({ x: 0, y: 0 });
  const [dockDragging, setDockDragging] = useState(false);
  const [notesPlace, setNotesPlace] = useState<CSSProperties>();
  const moveDock = useCallback((next: { x: number; y: number }) => {
    const d = dockEl.current?.getBoundingClientRect();
    const s = stage.current?.getBoundingClientRect();
    if (!d || !s) return;
    const now = dockAt.current;
    const at = {
      x: Math.round(Math.max(s.left + 8 - (d.left - now.x), Math.min(s.right - 8 - (d.right - now.x), next.x))),
      y: Math.round(Math.max(s.top + 8 - (d.top - now.y), Math.min(s.bottom - 8 - (d.bottom - now.y), next.y))),
    };
    if (at.x === now.x && at.y === now.y) return;
    dockAt.current = at;
    setDock(at);
  }, []);
  // Keep the block inside the screen when the player changes size
  useEffect(() => {
    const keep = () => moveDock(dockAt.current);
    const watch = new ResizeObserver(keep);
    if (stage.current) watch.observe(stage.current);
    if (dockEl.current) watch.observe(dockEl.current);
    return () => watch.disconnect();
  }, [moveDock]);
  // The Description card opens on the side of the block that has room
  useEffect(() => {
    const d = dockEl.current?.getBoundingClientRect();
    const s = stage.current?.getBoundingClientRect();
    const w = wrap.current?.getBoundingClientRect();
    if (!d || !s || !w || (!dock.x && !dock.y)) return setNotesPlace(undefined);
    const toLeft = d.left + d.width / 2 < s.left + s.width / 2;
    const below = d.top + d.height / 2 < s.top + s.height / 2;
    setNotesPlace({
      left: toLeft ? d.left - w.left : "auto",
      right: toLeft ? "auto" : w.right - d.right,
      top: below ? d.bottom - w.top + 8 : "auto",
      bottom: below ? "auto" : w.bottom - d.top + 8,
      maxHeight: (below ? s.bottom - d.bottom : d.top - s.top) - 16,
      transformOrigin: `${below ? "top" : "bottom"} ${toLeft ? "left" : "right"}`,
    });
  }, [dock, full, active, device]);
  const grabDock = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dockGrab.current = { x: e.clientX - dockAt.current.x, y: e.clientY - dockAt.current.y };
    setDockDragging(true);
  };
  const dragDock = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dockGrab.current) moveDock({ x: e.clientX - dockGrab.current.x, y: e.clientY - dockGrab.current.y });
  };
  const dropDock = () => {
    dockGrab.current = null;
    setDockDragging(false);
  };
  const nudgeDock = (e: ReactKeyboardEvent) => {
    const step = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
    if (!step) return;
    e.preventDefault();
    moveDock({ x: dockAt.current.x + step[0], y: dockAt.current.y + step[1] });
  };

  const content = (src: ScreenSource, i: number, s: CaseStep, phone: boolean) =>
    src.url ? (
      seen.has(i) && <LinkFrame url={src.url} title={`Screen ${i + 1}: ${s.title}`} />
    ) : src.embed ? (
      seen.has(i) && <EmbedFrame src={src.embed} title={`Screen ${i + 1}: ${s.title}`} />
    ) : src.prototype ? (
      // a live prototype mounts the first time its screen is shown, then stays (keeps its state)
      seen.has(i) && (
        <PrototypeToolsSlot.Provider value={i === active && phone === (device === "mobile" && !!s.mobile) ? toolsSlot : null}>
          <PrototypeFrame id={src.prototype} label={`Screen ${i + 1}: ${s.title}`} />
        </PrototypeToolsSlot.Provider>
      )
    ) : (
      <Image
        src={src.screen}
        alt={i === active && phone === (device === "mobile" && !!s.mobile) ? `Screen ${i + 1}: ${s.title}` : ""}
        fill
        priority={i === 0 && !phone}
        sizes={phone ? "420px" : full ? "100vw" : "(max-width: 1024px) 100vw, 60vw"}
        className={styles.screen}
      />
    );
  const deviceSwitch = hasMobile && <Segmented size="s" label="Screen layout" options={DEVICES} value={device} onChange={setDevice} />;
  const linkButtons = links.map((l) => (
    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className={`mono-s ${styles.toolBtn}`}>
      {l.label || linkLabel(l.url)}
      <Icon name="arrow-up-right" />
    </a>
  ));

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
        <div ref={wrap} className={styles.stageWrap} data-full={full || undefined} role={full ? "dialog" : undefined} aria-label={full ? `${step.title}, fullscreen` : undefined}>
          {full && (
            <div className={styles.fullBar}>
              <p className="mono-xs">
                {pad(active + 1)} / {pad(steps.length)} · {step.title}
              </p>
              <div className={styles.fullActions}>
                <IconButton size="s" icon="arrow-left" label="Previous step" disabled={active === 0} onClick={() => go(active - 1)} />
                <IconButton size="s" icon="arrow-right" label="Next step" disabled={active === steps.length - 1} onClick={() => go(active + 1)} />
                <IconButton size="s" variant="primary" icon="x" label="Exit fullscreen" onClick={exitFull} />
              </div>
            </div>
          )}
          <div ref={stage} className={styles.stage}>
            {steps.map((s, i) => (
              <div key={i} className={styles.layer} data-active={i === active} aria-hidden={i !== active} inert={i !== active}>
                {isColor(s.backdrop) ? (
                  <div className={styles.backdropColor} style={{ background: s.backdrop }} />
                ) : (
                  s.backdrop && <Image src={s.backdrop} alt="" fill priority={i === 0} sizes="(max-width: 1024px) 100vw, 60vw" className={styles.backdrop} />
                )}
                <div
                  className={styles.screens}
                  data-fill={s.url || s.embed || findPrototype(s.prototype)?.fill ? true : undefined}
                  data-framed={(s.backdrop && !isColor(s.backdrop)) || undefined}
                  data-off={(device === "mobile" && !!s.mobile) || undefined}
                >
                  {content(s, i, s, false)}
                </div>
                {s.mobile && mobileShown && (
                  <div className={styles.phone} data-on={device === "mobile" || undefined}>
                    {content(s.mobile, i, s, true)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            ref={dockEl}
            className={styles.tools}
            data-drag={dockDragging || undefined}
            style={dock.x || dock.y ? { transform: `translate(${dock.x}px, ${dock.y}px)` } : undefined}
          >
            <button
              type="button"
              className={styles.dockGrip}
              aria-label="Move controls. Use arrow keys"
              onPointerDown={grabDock}
              onPointerMove={dragDock}
              onPointerUp={dropDock}
              onPointerCancel={dropDock}
              onKeyDown={nudgeDock}
            >
              <Icon name="grip-vertical" />
            </button>
            <div ref={setToolsSlot} className={styles.toolsSlot} />
            {deviceSwitch}
            {linkButtons}
            {!full && (
              <button type="button" className={`mono-s ${styles.toolBtn}`} onClick={enterFull}>
                <Icon name="maximize" />
                Fullscreen
              </button>
            )}
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
                style={notesPlace}
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
