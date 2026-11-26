"use client";

import { ArrowLeft, Check, ChevronsRight, CircleHelp, ListChecks } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import styles from "./product.module.css";

export type View = "table" | "accounts" | "dashboard";
export type StepRun = "accounts" | "addAccount" | "dashboards" | "newDashboard" | "openTemplate" | "openDashFilter" | "table" | "filter";
/** A step that waits for the person to do something themselves */
export type StepWait = "dashAccount" | "tableFilter";
/** While a step waits, hints walk the person through it: the deepest one on screen is shown */
type Guide = { spot: string; hint: string };
type Step = { spot: string; title: string; hint: string; head: string; view?: View; run?: StepRun; wait?: StepWait; waitHint?: string; guide?: Guide[] };
type Task = { id: string; title: string; steps: Step[] };

const TASKS: Task[] = [
  {
    id: "stats",
    title: "View a Facebook account's stats",
    steps: [
      { spot: "rail-accounts", head: "Navigation", title: "Go to the accounts page", hint: "All ad accounts are here", run: "accounts" },
      { spot: "add-account", head: "Accounts", title: "Add an account", hint: "Click “Add account” and the account shows up in the table right away", view: "accounts", run: "addAccount" },
      { spot: "rail-dash", head: "Navigation", title: "Go to dashboards", hint: "Stats live in dashboards", run: "dashboards" },
      { spot: "dash-new", head: "Dashboards", title: "Create dashboard", hint: "A new dashboard starts from a template", view: "dashboard", run: "newDashboard" },
      { spot: "dash-template", head: "Templates", title: "Pick a template", hint: "“Account statistics” brings together spend, ROI and creatives", view: "dashboard", run: "openTemplate" },
      { spot: "dash-account", head: "Dashboard", title: "Pick an account in the filter", hint: "Open the filter and pick the account to see stats for", view: "dashboard", run: "openDashFilter", wait: "dashAccount", waitHint: "Pick an account in the filter to see its stats",
        guide: [
          { spot: "dash-account", hint: "Open the dashboard filters" },
          { spot: "filter-value-account", hint: "Click the value next to “Account”" },
          { spot: "filter-values-account", hint: "Pick the account to see stats for" },
        ],
      },
    ],
  },
  {
    id: "filter",
    title: "Set up your first filter",
    steps: [
      { spot: "btn-filter", head: "Table", title: "Open filters", hint: "Keep only what matters right now in the table", view: "table", run: "filter", wait: "tableFilter", waitHint: "Pick at least one value in the filter" },
    ],
  },
  { id: "team", title: "Invite your team", steps: [{ spot: "rail-invite", head: "Team", title: "Open invitations", hint: "Invite buyers and give them roles" }] },
  { id: "logs", title: "Check the logs", steps: [{ spot: "rail-logs", head: "Logs", title: "Open logs", hint: "Every change is visible: who did what and when" }] },
];
const GUIDES: Task[] = [
  { id: "g-filter", title: "Where to find filters", steps: [{ spot: "btn-filter", head: "Guide", title: "Filters button", hint: "Build conditions by hand or from text", view: "table", run: "filter" }] },
  { id: "g-ai", title: "What the AI can do", steps: [{ spot: "ai-button", head: "Guide", title: "AI assistant", hint: "Answers questions about your data in a side panel" }] },
];

type Rect = { x: number; y: number; w: number; h: number };

export function Onboarding({
  root,
  view,
  setView,
  run,
  onClose,
  autoStart = false,
  ready = {},
}: {
  root: HTMLElement | null;
  view: View;
  setView: (v: View) => void;
  run: (r: StepRun) => void;
  onClose: () => void;
  /** On the onboarding screen the first task is already running */
  autoStart?: boolean;
  /** Which waiting steps the person has already done themselves */
  ready?: Partial<Record<StepWait, boolean>>;
}) {
  const [tab, setTab] = useState<"guides" | "tasks">("tasks");
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [task, setTask] = useState<Task | null>(autoStart ? TASKS[0] : null);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(autoStart);
  const [rect, setRect] = useState<Rect | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [toast, setToast] = useState("");
  const current = task && playing ? task.steps[at] : null;
  // While a step waits for the person, the spotlight steps aside so they can use the screen
  const step = waiting ? null : current;

  const measure = useCallback(() => {
    if (!root || !step) return setRect(null);
    const el = root.querySelector<HTMLElement>(`[data-spot="${step.spot}"]`);
    if (!el) return setRect(null);
    const r = root.getBoundingClientRect();
    const s = r.width / root.offsetWidth || 1;
    const a = el.getBoundingClientRect();
    setRect({ x: (a.left - r.left) / s - 3, y: (a.top - r.top) / s - 3, w: a.width / s + 6, h: a.height / s + 6 });
  }, [root, step]);

  useLayoutEffect(() => {
    if (step?.view && step.view !== view) setView(step.view);
  }, [step, view, setView]);
  useLayoutEffect(() => {
    measure();
    if (!root) return;
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure, view, root]);

  const start = (t: Task) => {
    setTask(t);
    setAt(0);
    setPlaying(true);
  };
  const next = useCallback(() => {
    if (!task) return;
    setWaiting(false);
    setToast("");
    if (at + 1 < task.steps.length) setAt(at + 1);
    else {
      setDone((d) => new Set(d).add(task.id));
      setPlaying(false);
      setTask(null);
      setAt(0);
    }
  }, [task, at]);
  const advance = () => {
    if (!task || !step) return;
    if (step.run) run(step.run);
    if (step.wait) setWaiting(true);
    else next();
  };
  useEffect(() => {
    if (waiting && current?.wait && ready[current.wait]) next();
  }, [waiting, current, ready, next]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  const finishWaiting = () => {
    if (current?.wait && ready[current.wait]) next();
    else setToast(current?.waitHint ?? "Do this step first");
  };
  const back = () => {
    setWaiting(false);
    setPlaying(false);
    setTask(null);
    setAt(0);
  };

  // Hints for a waiting step follow the screen as the person opens things
  const [guide, setGuide] = useState<{ rect: Rect; hint: string } | null>(null);
  useEffect(() => {
    const list = waiting ? current?.guide : undefined;
    if (!root || !list) return setGuide(null);
    const find = () => {
      const r = root.getBoundingClientRect();
      const s = r.width / root.offsetWidth || 1;
      for (const g of [...list].reverse()) {
        const el = root.querySelector<HTMLElement>(`[data-spot="${g.spot}"]`);
        if (!el) continue;
        const a = el.getBoundingClientRect();
        const rect = { x: (a.left - r.left) / s - 3, y: (a.top - r.top) / s - 3, w: a.width / s + 6, h: a.height / s + 6 };
        setGuide((prev) => (prev && prev.hint === g.hint && Math.abs(prev.rect.x - rect.x) + Math.abs(prev.rect.y - rect.y) + Math.abs(prev.rect.w - rect.w) < 1 ? prev : { rect, hint: g.hint }));
        return;
      }
      setGuide(null);
    };
    find();
    const t = setInterval(find, 150);
    return () => clearInterval(t);
  }, [waiting, current, root]);

  const W = root?.offsetWidth ?? 1280;
  const H = root?.offsetHeight ?? 860;
  const tipW = 264;
  const tip = rect
    ? rect.x + rect.w + tipW + 20 < W - (rect.y > H - 380 ? 400 : 0)
      ? { left: rect.x + rect.w + 12, top: Math.min(H - 110, Math.max(8, rect.y)) }
      : rect.y + rect.h + 110 < H
        ? { left: Math.max(8, Math.min(W - tipW - 8, rect.x + rect.w - tipW)), top: rect.y + rect.h + 10 }
        : { left: Math.max(8, Math.min(W - tipW - 8, rect.x)), top: rect.y - 96 }
    : null;

  const list = tab === "tasks" ? TASKS : GUIDES;

  return (
    <>
      {step && (
        <div className={styles.tourLayer} data-overlay>
          {rect ? (
            <button type="button" className={styles.spot} style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} aria-label={step.title} onClick={advance} />
          ) : (
            <div className={styles.tourDim} />
          )}
          {tip && (
            <div className={styles.tip} style={{ ...tip, width: tipW }} role="status">
              <strong>
                {step.head} <span>{at + 1}/{task!.steps.length}</span>
              </strong>
              <p>{step.hint}</p>
            </div>
          )}
        </div>
      )}

      {/* The step can finish before the hint is cleared: show it only while that step still waits */}
      {guide && waiting && current && (
        <div className={styles.guideLayer} aria-live="polite">
          <div className={styles.guideRing} style={{ left: guide.rect.x, top: guide.rect.y, width: guide.rect.w, height: guide.rect.h }} />
          <div
            className={styles.tip}
            style={{ width: tipW, left: Math.max(8, Math.min(W - tipW - 8, guide.rect.x + guide.rect.w + 12 + tipW < W ? guide.rect.x + guide.rect.w + 12 : guide.rect.x - tipW - 12)), top: Math.min(H - 90, Math.max(8, guide.rect.y)) }}
          >
            <strong>{current.head} <span>hint</span></strong>
            <p>{guide.hint}</p>
          </div>
        </div>
      )}
      {toast && <div className={styles.toast} data-tone="bad" role="alert">{toast}</div>}
      <aside className={styles.onboard} aria-label="Onboarding" data-overlay>
        {task ? (
          <>
            <header className={styles.onboardHead}>
              <button type="button" className={styles.backBtn} aria-label="Back to tasks" onClick={back}>
                <ArrowLeft size={16} />
              </button>
              <ChevronsRight size={16} className={styles.stepBlue} />
              <strong>{task.title}</strong>
            </header>
            <ol className={styles.subSteps}>
              {task.steps.map((s, i) => (
                <li key={s.title} data-current={i === at || undefined} data-done={i < at || undefined}>
                  <span className={styles.ring}>{i < at ? <Check size={11} strokeWidth={3} /> : i === at ? <ChevronsRight size={12} /> : null}</span>
                  {s.title}
                </li>
              ))}
            </ol>
            {waiting && (
              <footer className={styles.onboardFoot}>
                <span>{current?.waitHint}</span>
                <button type="button" className={styles.primaryBtn} onClick={finishWaiting}>Done</button>
              </footer>
            )}
          </>
        ) : (
          <>
            <div className={styles.onboardTabs} role="tablist">
              <button type="button" role="tab" aria-selected={tab === "guides"} onClick={() => setTab("guides")}>
                <CircleHelp size={15} /> Guides
              </button>
              <button type="button" role="tab" aria-selected={tab === "tasks"} onClick={() => setTab("tasks")}>
                <ListChecks size={15} /> Onboarding
              </button>
            </div>
            <ul className={styles.taskList}>
              {list.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => start(t)} data-done={done.has(t.id) || undefined}>
                    <span className={styles.ring} data-filled={done.has(t.id) || undefined}>{done.has(t.id) && <Check size={11} strokeWidth={3} />}</span>
                    <span className={styles.taskName}>{t.title}</span>
                    <small>{done.has(t.id) ? "Done" : "Start"}</small>
                  </button>
                </li>
              ))}
            </ul>
            <footer className={styles.onboardFoot}>
              {tab === "tasks" && <span>{TASKS.filter((t) => done.has(t.id)).length} of {TASKS.length}</span>}
              <button type="button" className={styles.primaryBtn} onClick={onClose}>Finish onboarding</button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
