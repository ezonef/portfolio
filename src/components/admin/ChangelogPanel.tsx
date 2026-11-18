"use client";

import { useState } from "react";
import { CaseBlocks } from "@/components/site/CaseBlocks/CaseBlocks";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Tag } from "@/components/ui/Tag/Tag";
import { CHANGELOG_BLOCKS, type ChangelogEntry } from "@/data/changelog-types";
import { AutoTextarea } from "./AutoTextarea";
import { BlockEditor } from "./BlockEditor";
import { adminFetch } from "./adminFetch";
import styles from "./ChangelogPanel.module.css";

type Props = {
  entries: ChangelogEntry[];
  onChange: (entries: ChangelogEntry[]) => void;
};

const today = () => new Date().toISOString().slice(0, 10);
const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nice = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Changelog in the admin. Saving a live case proposes a line here (pending);
 * you edit it and Approve — only approved lines appear on /changelog. Every action is written right away.
 */
export function ChangelogPanel({ entries, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const persist = async (next: ChangelogEntry[]) => {
    const before = entries;
    onChange(next);
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/changelog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the changelog");
      onChange(data.entries);
      if (data.git?.error) setError(`Saved, but the site won't update — ${data.git.error}`);
    } catch (e) {
      onChange(before);
      setError(e instanceof Error ? e.message : "Could not save the changelog");
    } finally {
      setBusy(false);
    }
  };

  /** Text edits stay local until you approve or save the line */
  const edit = (id: string, patch: Partial<ChangelogEntry>) => onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const setStatus = (id: string, status: ChangelogEntry["status"]) =>
    persist(entries.map((e) => (e.id === id ? { ...e, status, ...(status === "approved" ? { date: e.date || today() } : {}) } : e)));
  const remove = (id: string) => persist(entries.filter((e) => e.id !== id));
  const addNote = () =>
    onChange([{ id: newId(), date: today(), title: "", body: [], status: "pending", kind: "note" }, ...entries]);

  const pending = entries.filter((e) => e.status === "pending");
  const approved = entries.filter((e) => e.status === "approved").sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <p className={`mono-m ${styles.eyebrow}`}>/ changelog</p>
          <h1 className="heading-h2">What changed on the site</h1>
          <p className={`body-m ${styles.lead}`}>
            When you save a live case, a line shows up here. Edit it and approve — only approved lines appear on{" "}
            <a href="/changelog" target="_blank" rel="noreferrer" className={styles.link}>/changelog</a>.
          </p>
        </div>
        <Button variant="secondary" size="s" icon="plus" onClick={addNote}>
          New entry
        </Button>
      </div>

      {error && <p className={`mono-s ${styles.error}`}>✕ {error}</p>}

      <section className={styles.section}>
        <h2 className="mono-label">/ Waiting for approval <span className={styles.count}>({String(pending.length).padStart(2, "0")})</span></h2>
        {pending.length === 0 ? (
          <p className={`body-s ${styles.empty}`}>Nothing to approve. Save a published case and its change appears here.</p>
        ) : (
          <ul className={styles.list}>
            {pending.map((e) => (
              <li key={e.id} className={styles.entry}>
                <div className={styles.meta}>
                  {/* Date picker: a chip that opens the calendar */}
                  <label className={`mono-s ${styles.datePick}`}>
                    <Icon name="calendar" size={14} />
                    <span>{nice(e.date)}</span>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={e.date}
                      aria-label="Date"
                      onClick={(ev) => {
                        try {
                          ev.currentTarget.showPicker();
                        } catch {
                          /* older browsers open it on their own */
                        }
                      }}
                      onChange={(ev) => edit(e.id, { date: ev.target.value || today() })}
                    />
                  </label>
                  <Tag tone="muted">{e.kind === "published" ? "New case" : e.kind === "updated" ? "Update" : "Note"}</Tag>
                  {e.slug && <span className={`mono-xs ${styles.slug}`}>/projects/{e.slug}</span>}
                </div>
                <AutoTextarea
                  className={`heading-h4 ${styles.title}`}
                  value={e.title}
                  placeholder="What changed"
                  aria-label="Title"
                  onChange={(ev) => edit(e.id, { title: ev.target.value.replace(/\n/g, " ") })}
                />
                <div className={styles.blocks}>
                  <BlockEditor
                    key={e.id}
                    blocks={e.body}
                    slug="changelog"
                    allow={CHANGELOG_BLOCKS}
                    emptyText="A line or two for visitors — type / for lists, labels, quotes"
                    onChange={(body) => edit(e.id, { body })}
                  />
                </div>
                <div className={styles.actions}>
                  <Button variant="ghost" size="s" onClick={() => remove(e.id)} disabled={busy}>
                    Dismiss
                  </Button>
                  <Button size="s" icon="check" onClick={() => setStatus(e.id, "approved")} disabled={busy || !e.title.trim()}>
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className="mono-label">/ On the site <span className={styles.count}>({String(approved.length).padStart(2, "0")})</span></h2>
        {approved.length === 0 ? (
          <p className={`body-s ${styles.empty}`}>No approved lines yet.</p>
        ) : (
          <ul className={styles.list}>
            {approved.map((e) => (
              <li key={e.id} className={`${styles.entry} ${styles.approved}`}>
                <div className={styles.meta}>
                  <span className={`mono-s ${styles.dateText}`}>{nice(e.date)}</span>
                </div>
                <p className="heading-h4">{e.title}</p>
                {e.body.length > 0 && <CaseBlocks blocks={e.body} />}
                <div className={styles.actions}>
                  <Button variant="ghost" size="s" onClick={() => setStatus(e.id, "pending")} disabled={busy}>
                    Take off the site
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
