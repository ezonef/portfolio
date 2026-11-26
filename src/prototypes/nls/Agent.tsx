"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented/Segmented";
import styles from "./nls.module.css";

type Phase = "ask" | "proposed" | "applied" | "rejected" | "undone";
type Access = "edit" | "read";

const ACCESS = [
  { value: "edit" as const, label: "Can edit" },
  { value: "read" as const, label: "Read only" },
];
const BEFORE = { a: 400, b: 300 };
const AFTER = { a: 250, b: 450 };

export default function Agent() {
  const [phase, setPhase] = useState<Phase>("ask");
  const [access, setAccess] = useState<Access>("edit");
  const budget = phase === "applied" ? AFTER : BEFORE;
  const log =
    phase === "applied"
      ? ["AI proposed a budget move", "You approved it", "Previous budgets saved"]
      : phase === "undone"
        ? ["AI proposed a budget move", "You approved it", "You restored the previous budgets"]
        : phase === "rejected"
          ? ["AI proposed a budget move", "You rejected it. Nothing changed"]
          : phase === "proposed"
            ? ["AI proposed a budget move"]
            : [];

  return (
    <div className={styles.app}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden>N</span>
          AI agent
          <span className={`mono-xs ${styles.muted}`}>test data</span>
        </div>
        <Segmented size="s" label="Your permission on this flow" options={ACCESS} value={access} onChange={setAccess} />
      </div>
      <div className={styles.split}>
        <div className={styles.chat} aria-live="polite">
          <p className={styles.msg} data-from="user">Why did ROI drop on Spring launch?</p>
          {phase === "ask" ? (
            <div className={styles.actions}>
              <button type="button" className={styles.action} data-primary onClick={() => setPhase("proposed")}>Ask the agent</button>
            </div>
          ) : (
            <>
              <div className={styles.msg}>
                <p>ROI fell because Product page A converts worse since Tuesday: CR went from 12% to 7% after 200 clicks. Ad frequency also rose to 4.2.</p>
                <div className={styles.sources}>
                  <span className={styles.source}>tracker · landing CR</span>
                  <span className={styles.source}>ads · frequency</span>
                  <span className={styles.source}>confirmed revenue</span>
                </div>
              </div>
              <div className={styles.card}>
                <div className={styles.row}>
                  <span className={styles.label}>Proposed change</span>
                  <span className="mono-xs">{phase === "proposed" ? "waiting for you" : phase}</span>
                </div>
                <div className={styles.diff}>
                  <span>Product page A</span><span className={styles.muted}>$400</span><span>→</span><strong>$250</strong>
                  <span>Product page B</span><span className={styles.muted}>$300</span><span>→</span><strong>$450</strong>
                </div>
                <p className={styles.secondary}>Total daily budget stays at $700. Estimate: +$120 a day if the trend holds.</p>
                {phase === "proposed" && access === "read" && (
                  <p className={styles.bad}>You can read this flow, so the agent cannot change it for you. Ask an editor to approve.</p>
                )}
                <div className={styles.actions}>
                  {phase === "proposed" && (
                    <>
                      <button type="button" className={styles.action} data-primary disabled={access === "read"} onClick={() => setPhase("applied")}>Approve</button>
                      <button type="button" className={styles.action} onClick={() => setPhase("rejected")}>Reject</button>
                    </>
                  )}
                  {phase === "applied" && (
                    <button type="button" className={styles.action} onClick={() => setPhase("undone")}>Undo</button>
                  )}
                  {(phase === "rejected" || phase === "undone") && (
                    <button type="button" className={styles.action} onClick={() => setPhase("ask")}>Start again</button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <aside className={styles.side}>
          <p className={styles.label}>Live budgets</p>
          <div className={styles.row}><span>Product page A</span><strong>${budget.a}</strong></div>
          <div className={styles.row}><span>Product page B</span><strong>${budget.b}</strong></div>
          <p className={styles.label} style={{ marginTop: 10 }}>Audit log</p>
          {log.length ? (
            <ul className={styles.log}>
              {log.map((l) => <li key={l}>{l}</li>)}
            </ul>
          ) : (
            <p className={styles.muted}>Nothing has happened yet.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
