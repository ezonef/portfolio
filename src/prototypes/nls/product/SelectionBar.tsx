"use client";

import { Check, ChevronDown, Trash2, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { ChipPicker } from "./ChipPicker";
import { HelpTip, Popover, Toggle } from "./ui";
import styles from "./product.module.css";

/** A list field the bar can change, like buyers or tags. `sets` holds each selected item's current values */
export type BarList = {
  key: string;
  label: string;
  options: string[];
  sets: string[][];
  /** People get an avatar, tags a coloured pill */
  look: "person" | "tag";
  tone?: (v: string) => string | undefined;
};
/** What Apply hands back: per list, value → true (put on every selected item) or false (take off all of them) */
export type BarChanges = Record<string, Record<string, boolean>>;
/** The selected items as a tree for the launch switch: leaves run or not, `locked` ones cannot change */
export type LaunchNode = { id: string; label: string; on?: boolean; locked?: boolean; /** Why a locked item cannot change */ reason?: string; children?: LaunchNode[] };
const leavesOf = (nodes: LaunchNode[]): LaunchNode[] => nodes.flatMap((n) => (n.children?.length ? leavesOf(n.children) : [n]));


/**
 * The bar of actions for selected rows, the same on every table: list fields wait in a draft
 * (a red count shows what is not applied yet) until Apply, then Pause, Delete, the AI and clear.
 * It lives only while something is selected, so clearing the selection drops the draft.
 */
export function SelectionBar({
  count,
  lists = [],
  onApply,
  launch,
  onDelete,
  ai,
  onClear,
}: {
  count: number;
  lists?: BarList[];
  /** Applies the draft: list changes, and which items to launch (true) or pause (false) */
  onApply?: (changes: BarChanges, launch: Record<string, boolean>) => void;
  /** What is selected, as a tree: the Launched switch runs or pauses it all, its popover each part. Waits for Apply like the lists */
  launch?: LaunchNode[];
  onDelete?: () => void;
  /** The AI panel: the orb opens it, and a second click on the orb closes it */
  ai?: { open: boolean; onToggle: () => void };
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<BarChanges>({});
  // Leaving: the bar slides down first, then the selection is cleared (or the rows deleted)
  const [leaving, setLeaving] = useState(false);
  const after = useRef<() => void>(undefined);
  const leave = (then: () => void) => {
    if (leaving) return;
    let done = false;
    after.current = () => {
      if (done) return;
      done = true;
      then();
    };
    setLeaving(true);
    // In case no animation runs (motion off in the browser), it still finishes
    setTimeout(() => after.current?.(), 260);
  };
  // Launch draft: item id → run or not; an item not in it stays as it is
  const [run, setRun] = useState<Record<string, boolean>>({});
  // Where the main switch is in its cycle: off, on, then back to as it is. Editing one item makes it "own"
  const [step, setStep] = useState<"orig" | "off" | "on" | "own">("orig");
  const live = leavesOf(launch ?? []).filter((l) => !l.locked);
  const runs = (l: LaunchNode) => run[l.id] ?? !!l.on;
  const stateOf = (nodes: LaunchNode[]): boolean | "mixed" => {
    const ls = leavesOf(nodes).filter((l) => !l.locked);
    const n = ls.filter(runs).length;
    return n === 0 ? false : n === ls.length ? true : "mixed";
  };
  const launchChanges = live.filter((l) => run[l.id] !== undefined && run[l.id] !== !!l.on).length;
  const setRunFor = (nodes: LaunchNode[], on: boolean) =>
    setRun((d) => {
      const next = { ...d };
      for (const l of leavesOf(nodes).filter((x) => !x.locked)) {
        // Back to what the item already does is no change at all
        if (on === !!l.on) delete next[l.id];
        else next[l.id] = on;
      }
      return next;
    });
  const cycleLaunch = () => {
    if (!launch) return;
    const order = ["off", "on", "orig"] as const;
    const at = step === "own" || step === "orig" ? -1 : order.indexOf(step);
    // A step that shows nothing new (off when everything is already off) is skipped
    for (let i = 1; i <= order.length; i++) {
      const next = order[(at + i) % order.length];
      const before = stateOf(launch);
      if (next === "orig") {
        setRun({});
        setStep("orig");
        return;
      }
      if (before === (next === "on")) continue;
      setRunFor(launch, next === "on");
      setStep(next);
      return;
    }
  };
  // The tree opens on hover, above the bar, and stays while the pointer is in it
  const launchBtn = useRef<HTMLButtonElement>(null);
  const [tree, setTree] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showTree = () => (clearTimeout(hideTimer.current), setTree(true));
  const hideTree = () => (clearTimeout(hideTimer.current), (hideTimer.current = setTimeout(() => setTree(false), 220)));
  const [open, setOpen] = useState<{ el: HTMLElement; key: string } | null>(null);

  const coverage = (l: BarList, v: string) => {
    const n = l.sets.filter((s) => s.includes(v)).length;
    return n === 0 ? "none" : n === l.sets.length ? "all" : "some";
  };
  const isOn = (l: BarList, v: string) => draft[l.key]?.[v] ?? coverage(l, v) === "all";
  const changesOf = (l: BarList) => Object.entries(draft[l.key] ?? {}).filter(([v, on]) => coverage(l, v) !== (on ? "all" : "none")).length;
  const total = lists.reduce((n, l) => n + changesOf(l), 0) + launchChanges;
  const setValue = (l: BarList, v: string, on: boolean) =>
    setDraft((d) => {
      const next = { ...d[l.key] };
      // Back to what the items already have is no change at all
      if (coverage(l, v) === (on ? "all" : "none")) delete next[v];
      else next[v] = on;
      return { ...d, [l.key]: next };
    });
  const apply = () => {
    onApply?.(
      draft,
      Object.fromEntries(Object.entries(run).filter(([id, on]) => live.some((l) => l.id === id && !!l.on !== on))),
    );
    setDraft({});
    setRun({});
    setStep("orig");
    setOpen(null);
    setTree(false);
    leave(onClear);
  };

  const list = open ? lists.find((l) => l.key === open.key) : undefined;

  return (
    <div
      className={styles.bulk}
      role="toolbar"
      aria-label="Actions for selected"
      data-leaving={leaving || undefined}
      onAnimationEnd={(e) => e.target === e.currentTarget && leaving && after.current?.()}
    >
      <span className={styles.bulkCount}>Selected {count}</span>
      {lists.map((l) => {
        const n = changesOf(l);
        return (
          <button key={l.key} type="button" aria-label={n ? `${l.label}, ${n} not applied` : undefined} onClick={(e) => setOpen({ el: e.currentTarget, key: l.key })}>
            {l.label} <ChevronDown size={14} />
            {n > 0 && <b className={styles.bulkBadge} aria-hidden="true">{n}</b>}
          </button>
        );
      })}
      {launch && (() => {
        const state = stateOf(launch);
        return (
          // The whole control is the switch: a click on the word works too
          <button
            ref={launchBtn}
            type="button"
            role="switch"
            aria-checked={state}
            aria-label={state === "mixed" ? "Launched for some" : state ? "Launched" : "Paused"}
            disabled={!live.length}
            className={styles.bulkSwitch}
            onClick={cycleLaunch}
            onPointerEnter={showTree}
            onPointerLeave={hideTree}
            onFocus={showTree}
          >
            Launched
            <Toggle look on={state} label="" disabled={!live.length} />
            {launchChanges > 0 && <b className={styles.bulkBadge} aria-hidden="true">{launchChanges}</b>}
          </button>
        );
      })()}
      {onDelete && (
        <button type="button" className={styles.bulkDanger} onClick={() => leave(onDelete)}>
          <Trash2 size={15} /> Delete
        </button>
      )}
      {(lists.length > 0 || launch) && (
        // Always in place next to Delete, so the bar never shifts; it wakes up once there is something to apply
        <button type="button" className={styles.bulkApply} disabled={!total} aria-label={total ? `Apply ${total} ${total === 1 ? "change" : "changes"}` : "Nothing to apply"} title="Apply" onClick={apply}>
          <Check size={16} strokeWidth={2.25} />
        </button>
      )}
      {ai && (
        <button type="button" className={styles.bulkAi} aria-label="Ask the AI about the selected rows" aria-expanded={ai.open} title={ai.open ? "Close the AI" : "Ask the AI about the selected rows"} onClick={ai.onToggle}>
          <ThinkingOrb state="working" size={20} theme="dark" aria-hidden="true" />
        </button>
      )}
      <button type="button" className={styles.bulkClose} aria-label="Clear selection" onClick={() => leave(onClear)}>
        <X size={15} />
      </button>

      {open && list && (
        <Popover anchor={open.el} onClose={() => setOpen(null)} width={280} className={`${styles.pop} ${styles.popDark}`}>
          <ChipPicker
            options={list.options}
            chosen={list.options.filter((v) => isOn(list, v))}
            onAdd={(v) => setValue(list, v, true)}
            onRemove={(v) => setValue(list, v, false)}
            look={list.look === "person" ? "person" : "plain"}
            tone={list.look === "tag" ? list.tone : undefined}
            partial={(v) => draft[list.key]?.[v] === undefined && coverage(list, v) === "some"}
          />
        </Popover>
      )}
      {launch && tree && launchBtn.current && (
        <Popover anchor={launchBtn.current} onClose={() => setTree(false)} width={320} className={`${styles.pop} ${styles.popDark}`} onPointerEnter={showTree} onPointerLeave={hideTree}>
          <ul className={styles.launchTree} aria-label="Launch each part">
            {(function rows(nodes: LaunchNode[], depth: number): ReactNode {
              return nodes.map((n) => {
                const st = stateOf([n]);
                const locked = !leavesOf([n]).some((l) => !l.locked);
                return (
                  <li key={n.id}>
                    <div className={styles.launchRow} style={{ paddingLeft: 8 + depth * 16 }} data-locked={locked || undefined}>
                      <span title={n.label}>{n.label}</span>
                      {locked && <HelpTip onDark text={n.reason ?? leavesOf([n]).find((l) => l.reason)?.reason ?? "This can't be launched"} />}
                      <Toggle
                        on={st}
                        disabled={locked}
                        label={`${st === true ? "Pause" : "Launch"} ${n.label}`}
                        onChange={() => (setRunFor([n], st !== true), setStep("own"))}
                      />
                    </div>
                    {n.children?.length ? <ul>{rows(n.children, depth + 1)}</ul> : null}
                  </li>
                );
              });
            })(launch, 0)}
          </ul>
        </Popover>
      )}
    </div>
  );
}

/** A row's tags as coloured pills, the way the bar shows them */
export function TagList({ tags, tone }: { tags: string[]; tone?: (v: string) => string | undefined }) {
  if (!tags.length) return <>—</>;
  return (
    <span className={styles.tagList}>
      {tags.map((t) => <span key={t} className={styles.status} data-tone={tone?.(t) ?? "muted"}>{t}</span>)}
    </span>
  );
}

/** Applies a bar's changes to one list of values */
export function applyChanges(list: string[], changes: Record<string, boolean> | undefined): string[] {
  return Object.entries(changes ?? {}).reduce((acc, [v, on]) => (on ? (acc.includes(v) ? acc : [...acc, v]) : acc.filter((x) => x !== v)), list);
}

