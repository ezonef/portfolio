"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Chip } from "@/components/ui/Chip/Chip";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import type { CaseStudy } from "@/data/cases";
import { categoryLabel, categoryLong, type Project, type ProjectCategory, type ProjectTopic } from "@/data/projects";
import { ImageDrop } from "./ImageDrop";
import { adminFetch } from "./adminFetch";
import styles from "./AdminApp.module.css";

type Props = {
  initialProjects: Project[];
  initialCases: Record<string, Partial<CaseStudy>>;
  template: CaseStudy;
};

type Status = { kind: "idle" | "dirty" | "saving" | "saved" | "error"; text?: string };

const CATEGORIES: ProjectCategory[] = ["admin", "ds", "mobile"];
const TOPICS: { id: ProjectTopic; label: string }[] = [
  { id: "onboarding", label: "Onboarding" },
  { id: "drawer", label: "Drawer" },
];

const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").slice(0, 80);

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function AdminApp({ initialProjects, initialCases, template }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  // Every project gets a full case: saved fields on top of the template.
  const [cases, setCases] = useState<Record<string, CaseStudy>>(() =>
    Object.fromEntries(initialProjects.map((p) => [p.slug, { ...clone(template), ...initialCases[p.slug] }])),
  );
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const project = projects[selected];
  const study = project ? cases[project.slug] : undefined;
  const dirty = status.kind === "dirty" || status.kind === "error";

  const touch = () => setStatus({ kind: "dirty" });

  const updateProject = (patch: Partial<Project>) => {
    setProjects((list) => list.map((p, i) => (i === selected ? { ...p, ...patch } : p)));
    touch();
  };

  const updateCase = (patch: Partial<CaseStudy>) => {
    if (!project) return;
    setCases((all) => ({ ...all, [project.slug]: { ...all[project.slug], ...patch } }));
    touch();
  };

  const renameSlug = (raw: string) => {
    const slug = toSlug(raw);
    if (!project || slug === project.slug) return;
    const old = project.slug;
    setCases((all) => {
      const { [old]: c, ...rest } = all;
      return { ...rest, [slug]: c };
    });
    updateProject({ slug });
  };

  const addProject = () => {
    const taken = new Set(projects.map((p) => p.slug));
    let n = projects.length + 1;
    while (taken.has(`new-case-${n}`)) n++;
    const slug = `new-case-${n}`;
    const fresh: Project = {
      slug,
      number: String(projects.length + 1).padStart(2, "0"),
      title: "New case",
      description: "",
      company: "",
      years: String(new Date().getFullYear()),
      category: "admin",
      recent: false,
      cover: "/images/cover-photo.jpg",
      topics: [],
      tags: [],
    };
    setProjects((list) => [...list, fresh]);
    setCases((all) => ({ ...all, [slug]: clone(template) }));
    setSelected(projects.length);
    touch();
  };

  const removeProject = () => {
    if (!project) return;
    if (!window.confirm(`Delete “${project.title}”? It disappears from the site after you save.`)) return;
    setProjects((list) => list.filter((_, i) => i !== selected));
    setCases((all) => Object.fromEntries(Object.entries(all).filter(([slug]) => slug !== project.slug)));
    setSelected((i) => Math.max(0, i - 1));
    touch();
  };

  const reorder = (dir: -1 | 1) => {
    const to = selected + dir;
    if (to < 0 || to >= projects.length) return;
    setProjects((list) => move(list, selected, to));
    setSelected(to);
    touch();
  };

  const save = useCallback(async () => {
    setStatus({ kind: "saving" });
    try {
      const res = await adminFetch("/api/admin/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projects, cases }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setProjects(data.projects);
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setStatus({ kind: "saved", text: `Saved ${time}` });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Save failed" });
    }
  }, [projects, cases]);

  // ⌘S / Ctrl+S saves
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const statusText = useMemo(() => {
    switch (status.kind) {
      case "dirty": return "Unsaved changes";
      case "saving": return "Saving…";
      case "saved":
      case "error": return status.text;
      default: return "All saved";
    }
  }, [status]);

  return (
    <div className={styles.app}>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <p className={`mono-m ${styles.brand}`}>
            <span className={styles.dot} aria-hidden /> / admin — local only
          </p>
          <div className={styles.barActions}>
            <p className={`mono-s ${styles.status}`} data-kind={status.kind} role="status">
              {statusText}
            </p>
            {project && (
              <Button variant="secondary" size="s" icon="arrow-up-right" href={`/projects/${project.slug}`} target="_blank" rel="noreferrer">
                View case
              </Button>
            )}
            <Button size="s" icon="check" onClick={save} disabled={status.kind === "saving"}>
              Save <kbd className={styles.kbd}>⌘S</kbd>
            </Button>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={`mono-label ${styles.sideTitle}`}>
            Cases <span>({String(projects.length).padStart(2, "0")})</span>
          </p>
          <ul className={styles.list}>
            {projects.map((p, i) => (
              <li key={p.slug + i}>
                <button
                  type="button"
                  className={styles.row}
                  aria-current={i === selected}
                  onClick={() => setSelected(i)}
                >
                  <span className="mono-s">{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{p.title || "Untitled"}</span>
                    <span className="mono-xs">{categoryLabel[p.category]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="s" icon="plus" onClick={addProject} className={styles.add}>
            New case
          </Button>
        </aside>

        {project && study ? (
          <main className={styles.editor}>
            <div className={styles.editorHead}>
              <div>
                <p className={`mono-m ${styles.eyebrow}`}>
                  / case {String(selected + 1).padStart(2, "0")} — {categoryLong[project.category]}
                </p>
                <h1 className="heading-h2">{project.title || "Untitled"}</h1>
              </div>
              <div className={styles.headActions}>
                <IconButton variant="ghost" size="s" icon="arrow-up" label="Move up" onClick={() => reorder(-1)} disabled={selected === 0} />
                <IconButton variant="ghost" size="s" icon="arrow-down" label="Move down" onClick={() => reorder(1)} disabled={selected === projects.length - 1} />
                <IconButton variant="ghost" size="s" icon="trash-2" label="Delete case" onClick={removeProject} />
              </div>
            </div>

            <Section title="Card" note="What the project card on Home and All projects shows.">
              <div className={styles.grid}>
                <Field label="Title" wide>
                  <input className={styles.input} value={project.title} onChange={(e) => updateProject({ title: e.target.value })} />
                </Field>
                <Field label="Slug" hint={`URL: /projects/${project.slug}`}>
                  <input className={styles.input} value={project.slug} onChange={(e) => renameSlug(e.target.value)} spellCheck={false} />
                </Field>
                <Field label="Years">
                  <input className={styles.input} value={project.years} placeholder="2025–26" onChange={(e) => updateProject({ years: e.target.value })} />
                </Field>
                <Field label="Company">
                  <input className={styles.input} value={project.company} onChange={(e) => updateProject({ company: e.target.value })} />
                </Field>
                <Field label="Tags" hint="Comma separated">
                  <TagsInput key={selected} value={project.tags} onChange={(tags) => updateProject({ tags })} />
                </Field>
                <Field label="Description" wide>
                  <input className={styles.input} value={project.description} onChange={(e) => updateProject({ description: e.target.value })} />
                </Field>
                <Field label="Category" wide>
                  <div className={styles.chips}>
                    {CATEGORIES.map((c) => (
                      <Chip key={c} selected={project.category === c} onClick={() => updateProject({ category: c })}>
                        {categoryLabel[c]}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Topics & flags" wide>
                  <div className={styles.chips}>
                    {TOPICS.map((t) => {
                      const on = project.topics.includes(t.id);
                      return (
                        <Chip
                          key={t.id}
                          selected={on}
                          onClick={() => updateProject({ topics: on ? project.topics.filter((x) => x !== t.id) : [...project.topics, t.id] })}
                        >
                          {t.label}
                        </Chip>
                      );
                    })}
                    <Chip selected={project.recent} onClick={() => updateProject({ recent: !project.recent })}>
                      Recent
                    </Chip>
                  </div>
                </Field>
                <Field label="Cover" wide>
                  <ImageDrop slug={project.slug} value={project.cover} onChange={(cover) => updateProject({ cover })} />
                </Field>
              </div>
            </Section>

            <Section title="Intro" note="Top of the case page.">
              <div className={styles.grid}>
                <Field label="Headline" wide>
                  <textarea className={styles.textarea} rows={2} value={study.headline} onChange={(e) => updateCase({ headline: e.target.value })} />
                </Field>
                <Field label="Lead" wide>
                  <textarea className={styles.textarea} rows={3} value={study.lead} onChange={(e) => updateCase({ lead: e.target.value })} />
                </Field>
                <Field label="Role">
                  <input className={styles.input} value={study.role} onChange={(e) => updateCase({ role: e.target.value })} />
                </Field>
                <Field label="Flow name">
                  <input className={styles.input} value={study.flowName} onChange={(e) => updateCase({ flowName: e.target.value })} />
                </Field>
                <Field label="Problem" wide>
                  <textarea className={styles.textarea} rows={3} value={study.problem} onChange={(e) => updateCase({ problem: e.target.value })} />
                </Field>
              </div>
            </Section>

            <Section title={`Steps (${String(study.steps.length).padStart(2, "0")})`} note="Wrap words in [[double brackets]] to make them an inline link to the step’s screen.">
              <ol className={styles.steps}>
                {study.steps.map((step, i) => {
                  const setStep = (patch: Partial<typeof step>) =>
                    updateCase({ steps: study.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
                  return (
                    <li key={i} className={styles.step}>
                      <div className={styles.stepHead}>
                        <span className="mono-m">{String(i + 1).padStart(2, "0")}</span>
                        <div className={styles.headActions}>
                          <IconButton variant="ghost" size="s" icon="arrow-up" label="Move step up" disabled={i === 0} onClick={() => updateCase({ steps: move(study.steps, i, i - 1) })} />
                          <IconButton variant="ghost" size="s" icon="arrow-down" label="Move step down" disabled={i === study.steps.length - 1} onClick={() => updateCase({ steps: move(study.steps, i, i + 1) })} />
                          <IconButton variant="ghost" size="s" icon="trash-2" label="Delete step" onClick={() => updateCase({ steps: study.steps.filter((_, j) => j !== i) })} />
                        </div>
                      </div>
                      <div className={styles.stepBody}>
                        <div className={styles.stepFields}>
                          <Field label="Title">
                            <input className={styles.input} value={step.title} onChange={(e) => setStep({ title: e.target.value })} />
                          </Field>
                          <Field label="Caption" hint="Right side under the screen">
                            <input className={styles.input} value={step.hint} onChange={(e) => setStep({ hint: e.target.value })} />
                          </Field>
                          <Field label="Text" wide>
                            <textarea className={styles.textarea} rows={4} value={step.text} onChange={(e) => setStep({ text: e.target.value })} />
                          </Field>
                        </div>
                        <Field label="Screen">
                          <ImageDrop slug={project.slug} value={step.screen} onChange={(screen) => setStep({ screen })} compact />
                        </Field>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Button
                variant="secondary"
                size="s"
                icon="plus"
                onClick={() => updateCase({ steps: [...study.steps, { title: "", text: "", hint: "", screen: project.cover }] })}
              >
                Add step
              </Button>
            </Section>

            <Section title="Decisions" note="What you chose and what you rejected.">
              <ul className={styles.decisions}>
                {study.decisions.map((d, i) => {
                  const setDecision = (patch: Partial<typeof d>) =>
                    updateCase({ decisions: study.decisions.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                  return (
                    <li key={i} className={styles.decision}>
                      <Field label="Chose">
                        <input className={styles.input} value={d.chose} onChange={(e) => setDecision({ chose: e.target.value })} />
                      </Field>
                      <Field label="Rejected">
                        <input className={styles.input} value={d.rejected} onChange={(e) => setDecision({ rejected: e.target.value })} />
                      </Field>
                      <IconButton variant="ghost" size="s" icon="trash-2" label="Delete decision" className={styles.decisionDelete} onClick={() => updateCase({ decisions: study.decisions.filter((_, j) => j !== i) })} />
                    </li>
                  );
                })}
              </ul>
              <Button variant="secondary" size="s" icon="plus" onClick={() => updateCase({ decisions: [...study.decisions, { chose: "", rejected: "" }] })}>
                Add decision
              </Button>
            </Section>

            <Section title="Outcome" note="Real result only.">
              <Field label="Outcome" wide>
                <textarea className={styles.textarea} rows={3} value={study.outcome} onChange={(e) => updateCase({ outcome: e.target.value })} />
              </Field>
            </Section>
          </main>
        ) : (
          <main className={styles.empty}>
            <p className="body-l">No cases yet.</p>
            <Button icon="plus" onClick={addProject}>New case</Button>
          </main>
        )}
      </div>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className="mono-label">/ {title}</h2>
        {note && <p className={`body-s ${styles.note}`}>{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={[styles.field, wide && styles.wide].filter(Boolean).join(" ")}>
      <span className={`mono-xs ${styles.label}`}>
        {label}
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Keeps the raw text while typing so commas and spaces don't jump around. Remount (key) per case. */
function TagsInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <input
      className={styles.input}
      value={text}
      placeholder="Tables, Filters, Roles"
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(",").map((t) => t.trim()).filter(Boolean));
      }}
    />
  );
}
