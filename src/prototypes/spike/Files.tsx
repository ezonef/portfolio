"use client";

import { useContext, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Segmented } from "@/components/ui/Segmented/Segmented";
import { PrototypeScale, PrototypeToolsSlot } from "../tools-slot";
import styles from "./spike.module.css";

/** Two films, one per Figma plan: the library chain, then how one change ships on that plan. */
const TREE = [
  { name: "desktop-design-system", v: "-v1.5", note: "Shared desktop tokens and components", text: "The base: every file below inherits it." },
  { name: "platform-design-system", v: "-v1.5", note: "Platform-specific tokens and components", text: "Platform inherits desktop and adds its own layer." },
  { name: "shared-modules-design-system", v: "-v1.42", note: "Components shared across modules", text: "What several modules need lives in one shared library." },
  { name: "local-design-system", v: "-v1.2", note: "Module-specific components", text: "What only one module needs stays local." },
  { name: "module", v: "", note: "Module screens with linked libraries", text: "Screens link the four libraries above and redraw nothing." },
];
const LANES = ["In progress", "Ready for dev", "In production", "Archive"];
const LANE_TONES = ["progress", "ready", "live", "archive"];
const PRO = [
  { title: "Live", text: "The live file sits in a status folder.", lanes: [[], [], ["v1.4"], ["v1.3"]] },
  { title: "Copy", text: "New work starts from a versioned copy in In progress.", lanes: [["v1.5"], [], ["v1.4"], ["v1.3"]] },
  { title: "Ready", text: "The copy moves to Ready for dev. Production stays untouched.", lanes: [[], ["v1.5"], ["v1.4"], ["v1.3"]] },
  { title: "Release", text: "The new version goes live, the old one is archived, the changelog records what changed.", lanes: [[], [], ["v1.5"], ["v1.4", "v1.3"]] },
];
const ORG = [
  { title: "Main", text: "One main file. No copies for each status." },
  { title: "Branch", text: "Work starts in a branch of that file: feature/new-flow." },
  { title: "Ready", text: "The branch is marked ready for dev. The file doesn't move." },
  { title: "Review", text: "Review happens on the branch. Main is still untouched." },
  { title: "Merge", text: "After review, the branch merges into main." },
  { title: "Publish", text: "Libraries publish from main, so everyone gets the same version." },
];

type Plan = "PRO" | "ORG";
type Chapter = "lib" | "pro" | "org";
type Frame = { chapter: Chapter; at: number; text: string; hold: number };
/** A division of the timeline: Libraries is one (its five frames fill it), every other step has its own */
type Segment = { label: string; start: number; end: number };
type Film = { frames: Frame[]; segments: Segment[] };

const HEADS: Record<Chapter, string> = { lib: "Libraries · five layers", pro: "PRO · status folders", org: "ORG · branches" };
const HOLD = 2400;
const HOLD_LIB = 1700;
/** The end of a chapter stays a little longer */
const HOLD_END = 1200;

const chapter = (id: Chapter, items: { text: string }[], hold: number): Frame[] =>
  items.map((f, at) => ({ chapter: id, at, text: f.text, hold: hold + (at === items.length - 1 ? HOLD_END : 0) }));

function film(id: "pro" | "org", steps: { title: string; text: string }[]): Film {
  const lib = TREE.length;
  return {
    frames: [...chapter("lib", TREE, HOLD_LIB), ...chapter(id, steps, HOLD)],
    segments: [{ label: "Libraries", start: 0, end: lib - 1 }, ...steps.map((s, i) => ({ label: s.title, start: lib + i, end: lib + i }))],
  };
}
const FILMS: Record<Plan, Film> = { PRO: film("pro", PRO), ORG: film("org", ORG) };
const segmentOf = (f: Film, frame: number) => f.segments.findIndex((s) => frame >= s.start && frame <= s.end);
const holdBetween = (f: Film, from: number, to: number) => f.frames.slice(from, to).reduce((sum, x) => sum + x.hold, 0);

/** SectionNav's height on the process page */
const PLAN_BAR_HEIGHT = 48;
/** The caption's real sizes, whatever the player's scale */
const CAPTION_SIZE = 14;
const CAPTION_LABEL_SIZE = 11;

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export default function Files() {
  const [plan, setPlan] = useState<Plan>("PRO");
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<HTMLElement>(null);
  // how long the current frame has played: stopping keeps it, so play resumes from the same point
  const clock = useRef(0);
  // null: another screen of the case is showing
  const showing = useContext(PrototypeToolsSlot) !== null;
  // the player scales the prototype; the plan switch cancels that, so it is the same size as the bar on the process page
  const scale = useContext(PrototypeScale);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const playing = choice ?? !reduced;
  const live = showing && inView;
  const current = FILMS[plan];
  const frame = current.frames[index];

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(root.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    clock.current = 0;
    paintProgress(timeline.current, current, index, 0);
  }, [current, index]);

  useEffect(() => {
    if (!playing || !live) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      clock.current += Math.min(now - last, 100);
      last = now;
      if (clock.current >= current.frames[index].hold) {
        setIndex((index + 1) % current.frames.length);
        return;
      }
      paintProgress(timeline.current, current, index, clock.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, live, current, index]);

  // Space stops and resumes, unless the focus is on something else that uses it
  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof Element && !root.current?.contains(t) && t.closest("a, button, input, textarea, select, summary, [contenteditable], [role=menu], [role=dialog]")) return;
      e.preventDefault();
      if (!e.repeat) setChoice(!playing);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, playing]);

  return (
    <div ref={root} className={`${styles.app} ${styles.solo}`}>
      <section className={styles.main}>
        <div className={styles.flow}>
          <div key={`${plan}-${frame.chapter}`} className={styles.scene}>
            {frame.chapter === "lib" && <Chain at={frame.at} plan={plan} />}
            {frame.chapter === "pro" && <Lanes lanes={PRO[frame.at].lanes} />}
            {frame.chapter === "org" && <Branch step={frame.at} />}
          </div>
        </div>

        <div className={styles.foot}>
          <div className={styles.captionBlock}>
            <p className={`mono-xs ${styles.dim}`} style={{ fontSize: CAPTION_LABEL_SIZE / scale }}>
              {HEADS[frame.chapter]}
            </p>
            <p key={`${plan}${index}`} className={styles.caption} style={{ fontSize: CAPTION_SIZE / scale }} aria-live={playing ? "off" : "polite"}>
              {frame.text}
            </p>
          </div>

          <div className={styles.planRow} style={{ height: PLAN_BAR_HEIGHT / scale }}>
            <div className={styles.planBar} style={{ transform: `scale(${1 / scale})` }}>
            <Segmented
              label="Figma plan"
              value={plan}
              options={[
                { value: "PRO", label: "PRO" },
                { value: "ORG", label: "ORG" },
              ]}
              onChange={(p) => {
                // each plan is its own film, from its start
                setPlan(p);
                setIndex(0);
                clock.current = 0;
              }}
            />
            </div>
          </div>

          <div className={styles.dock}>
            <button
              type="button"
              className={styles.playButton}
              aria-label={playing ? "Stop (Space)" : "Play (Space)"}
              aria-pressed={!playing}
              title={playing ? "Stop · Space" : "Play · Space"}
              onClick={(e) => {
                setChoice(!playing);
                if (e.detail > 0) e.currentTarget.blur();
              }}
            >
              <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" aria-hidden>
                {playing ? <path d="M2.5 1.5H5v9H2.5zM7 1.5h2.5v9H7z" /> : <path d="M3 1.3v9.4L10.5 6z" />}
              </svg>
            </button>
            <nav ref={timeline} className={styles.timeline} aria-label="Moments of the animation">
              {current.segments.map((seg, i) => {
                const now = segmentOf(current, index);
                return (
                  <button
                    key={`${plan}-${seg.label}`}
                    type="button"
                    className={styles.segment}
                    style={{ flexGrow: seg.label.length + 2 }}
                    data-state={i < now ? "done" : i === now ? "current" : undefined}
                    aria-label={seg.label}
                    aria-current={i === now ? "step" : undefined}
                    onClick={(e) => {
                      // Libraries holds several frames: the spot you click picks one
                      const r = e.currentTarget.getBoundingClientRect();
                      const count = seg.end - seg.start + 1;
                      const part = e.detail === 0 ? 0 : Math.floor(((e.clientX - r.left) / r.width) * count);
                      setIndex(seg.start + Math.max(0, Math.min(count - 1, part)));
                      // after a mouse click Space shouldn't draw a focus ring here
                      if (e.detail > 0) e.currentTarget.blur();
                    }}
                  >
                    <span className={styles.track}>
                      <span className={styles.fill} />
                    </span>
                    <span className={`mono-xs ${styles.segmentLabel}`}>
                      {seg.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </section>
    </div>
  );
}

/** The current division's fill, written straight to the DOM so playback doesn't re-render every frame */
function paintProgress(el: HTMLElement | null, f: Film, frame: number, played: number) {
  const seg = f.segments[segmentOf(f, frame)];
  const total = holdBetween(f, seg.start, seg.end + 1);
  el?.style.setProperty("--progress", String((holdBetween(f, seg.start, frame) + played) / total));
}

/** Each library arrives under the one it inherits from */
function Chain({ at, plan }: { at: number; plan: Plan }) {
  return (
    <ol className={styles.chain2}>
      {TREE.map((t, i) => (
        <li key={t.name} style={{ marginLeft: i * 44 }} data-on={i <= at || undefined} data-current={i === at || undefined}>
          <span className={`mono-s ${styles.nodeName}`}>{t.name}{plan === "PRO" ? t.v : ""}.figma</span>
          <span className={styles.nodeNote}>{t.note}</span>
        </li>
      ))}
    </ol>
  );
}

/** The cards on the board: the file version is the title, the rest reads like a task */
const FILES = [
  { v: "v1.3", id: "MOD-13", kind: "Bug", priority: 1 },
  { v: "v1.4", id: "MOD-14", kind: "Improvement", priority: 2 },
  { v: "v1.5", id: "MOD-15", kind: "Feature", priority: 3 },
];

/** A status board. Cards are one set that travels between columns; the new version starts hidden behind the live one */
function Lanes({ lanes }: { lanes: string[][] }) {
  return (
    <div className={styles.lanes}>
      {LANES.map((name, i) => (
        <div key={name} className={styles.lane} data-tone={LANE_TONES[i]}>
          <div className={styles.laneHead}>
            <StatusIcon tone={LANE_TONES[i]} />
            <span className={styles.laneName}>{name}</span>
            <span className={styles.laneCount}>{lanes[i].length}</span>
            <span className={styles.laneActions} aria-hidden>
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M8 3v10M3 8h10" />
              </svg>
              <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
                <circle cx="3.5" cy="8" r="1.2" />
                <circle cx="8" cy="8" r="1.2" />
                <circle cx="12.5" cy="8" r="1.2" />
              </svg>
            </span>
          </div>
        </div>
      ))}
      {FILES.map((file) => {
        const lane = lanes.findIndex((l) => l.includes(file.v));
        const style = { "--lane": lane < 0 ? 2 : lane, "--slot": lane < 0 ? 0 : lanes[lane].indexOf(file.v) } as CSSProperties;
        return (
          <span
            key={file.v}
            className={styles.file}
            style={style}
            data-tone={LANE_TONES[lane < 0 ? 2 : lane]}
            data-new={file.v === "v1.5" || undefined}
            data-hidden={lane < 0 || undefined}
          >
            <span className={`mono-xs ${styles.fileId}`}>{file.id}</span>
            <span className={styles.fileTitle}>module-{file.v}</span>
            <span className={styles.fileMeta}>
              <span className={styles.priority} aria-label={`Priority ${file.priority} of 3`} role="img">
                {[1, 2, 3].map((bar) => (
                  <i key={bar} data-on={bar <= file.priority || undefined} />
                ))}
              </span>
              <span className={styles.fileTag}>
                <i aria-hidden />
                {file.kind}
              </span>
            </span>
            <svg className={styles.fileAvatar} viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
              <circle cx="8" cy="8" r="6.8" />
              <circle cx="8" cy="6.4" r="2.2" />
              <path d="M3.9 12.8c.8-1.7 2.3-2.5 4.1-2.500s3.3.8 4.1 2.5" />
            </svg>
          </span>
        );
      })}
    </div>
  );
}

function StatusIcon({ tone }: { tone: string }) {
  return (
    <svg className={styles.statusIcon} viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      {tone === "progress" && (
        <>
          <circle cx="8" cy="8" r="6.2" />
          <path d="M8 4.500a3.5 3.5 0 010 7z" fill="currentColor" stroke="none" />
        </>
      )}
      {tone === "ready" && (
        <>
          <circle cx="8" cy="8" r="6.2" />
          <path d="M8 4.500a3.5 3.5 0 11-3.5 3.500H8z" fill="currentColor" stroke="none" />
        </>
      )}
      {tone === "live" && (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" stroke="none" />
          <path d="M5 8.200l2 2 4-4.3" stroke="var(--color-bg-surface)" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {tone === "archive" && <circle cx="8" cy="8" r="6.2" strokeDasharray="1.6 2.3" strokeLinecap="round" />}
    </svg>
  );
}

function Branch({ step }: { step: number }) {
  const on = (from: number) => (step >= from ? true : undefined);
  return (
    <svg className={styles.git} viewBox="0 0 680 280" role="img" aria-label={`Branch flow, step ${step + 1} of ${ORG.length}`}>
      <text x="36" y="66" className={styles.gitLabel}>main</text>
      <path d="M36 90H644" className={styles.gitMain} />
      <circle cx="96" cy="90" r="7" className={styles.gitDot} />

      <path d="M150 90C205 90 205 200 260 200" pathLength={1} className={styles.gitBranch} data-on={on(1)} />
      <path d="M260 200H340" pathLength={1} className={styles.gitBranch} data-on={on(2)} />
      <path d="M340 200H420" pathLength={1} className={styles.gitBranch} data-on={on(3)} />
      <path d="M420 200C475 200 475 90 530 90" pathLength={1} className={styles.gitBranch} data-on={on(4)} />

      <g className={styles.gitIn} data-on={on(1)}>
        <circle cx="150" cy="90" r="5" className={styles.gitDot} />
        <circle cx="260" cy="200" r="7" className={styles.gitAccent} />
        <text x="260" y="244" textAnchor="middle" className={styles.gitLabel}>feature/new-flow</text>
      </g>
      <g className={styles.gitIn} data-on={on(2)}>
        <circle cx="340" cy="200" r="7" className={styles.gitAccent} />
        <text x="340" y="176" textAnchor="middle" className={styles.gitLabel}>ready</text>
      </g>
      <g className={styles.gitIn} data-on={on(3)}>
        <circle cx="420" cy="200" r="7" className={styles.gitAccent} />
        <text x="420" y="176" textAnchor="middle" className={styles.gitLabel}>review</text>
      </g>
      <g className={styles.gitIn} data-on={on(4)}>
        <circle cx="530" cy="90" r="8" className={styles.gitDot} />
        <text x="530" y="66" textAnchor="middle" className={styles.gitLabel}>merged</text>
      </g>
      <g className={styles.gitIn} data-on={on(5)}>
        <circle cx="612" cy="90" r="8" className={styles.gitAccent} />
        <text x="612" y="126" textAnchor="middle" className={styles.gitLabel}>published</text>
      </g>
    </svg>
  );
}
