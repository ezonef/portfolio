"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { NavButton } from "@/components/ui/NavLink/NavLink";
import { Step } from "@/components/ui/Step/Step";
import { Tag } from "@/components/ui/Tag/Tag";
import { normalizeCase, type CaseBlockType, type CaseStep, type CaseStudy } from "@/data/case-types";
import type { ChangelogEntry } from "@/data/changelog-types";
import type { Project } from "@/data/project-meta";
import { AutoTextarea } from "./AutoTextarea";
import { BlockEditor } from "./BlockEditor";
import { ImageDrop } from "./ImageDrop";
import { TagPicker } from "./TagPicker";
import { ChangelogPanel } from "./ChangelogPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { UndoToast } from "./UndoToast";
import { follow, useReorder } from "./useReorder";
import { adminFetch } from "./adminFetch";
import styles from "./AdminApp.module.css";

type Props = {
  initialProjects: Project[];
  initialCases: Record<string, Record<string, unknown>>;
  initialChangelog: ChangelogEntry[];
  template: CaseStudy;
};

type Status = { kind: "idle" | "dirty" | "saving" | "saved" | "warn" | "error"; text?: string };
/** What the editor shows: the project card, or the case page (intro, one screen, or the outcome). */
type View = "card" | "case";
type CaseTab = "intro" | number;

/** Blocks for a screen's description — no page headings or images (the screen is the image). */
const SCREEN_BLOCKS: CaseBlockType[] = ["h3", "label", "text", "bullet", "numbered", "quote"];

const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").slice(0, 80);

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const pad = (n: number) => String(n).padStart(2, "0");

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** What the bar says after a save: the files are on disk either way; git tells whether the site will update. */
function gitStatus(git: { committed: boolean; pushed: boolean; error?: string } | undefined, time: string): Status {
  if (!git) return { kind: "saved", text: `Saved ${time}` };
  if (git.error) return { kind: "warn", text: `Saved ${time}, but the site won't update — ${git.error}` };
  if (git.committed) return { kind: "saved", text: `Saved ${time} · pushed, the site updates in about a minute` };
  return { kind: "saved", text: `Saved ${time} · nothing new to push` };
}

export function AdminApp({ initialProjects, initialCases, initialChangelog, template }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  // Every project gets a full case: saved fields on top of the template.
  const [cases, setCases] = useState<Record<string, CaseStudy>>(() =>
    Object.fromEntries(initialProjects.map((p) => [p.slug, normalizeCase(clone(template), initialCases[p.slug])])),
  );
  const [selected, setSelectedRaw] = useState(0);
  /** Top-level admin section, picked in the header */
  const [section, setSection] = useState<"cases" | "changelog">("cases");
  const [changelog, setChangelog] = useState<ChangelogEntry[]>(initialChangelog);
  const pendingCount = changelog.filter((e) => e.status === "pending").length;
  const [view, setView] = useState<View>("card");
  const [tab, setTab] = useState<CaseTab>("intro");
  const setSelected: typeof setSelectedRaw = (v) => {
    setSelectedRaw(v);
    setTab("intro");
  };
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  /** What is on disk right now — Cancel goes back to it. */
  const saved = useRef<{ projects: Project[]; cases: Record<string, CaseStudy> } | null>(null);
  if (!saved.current) saved.current = clone({ projects: initialProjects, cases });
  const [confirmCancel, setConfirmCancel] = useState(false);

  const project = projects[selected];
  const study = project ? cases[project.slug] : undefined;
  const dirty = status.kind === "dirty" || status.kind === "error";

  /** Every tag used anywhere — the options of the Tags picker. */
  const allTags = useMemo(() => [...new Set(projects.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b)), [projects]);

  // Every edit bumps `version`. A delete remembers the state before it; Undo puts it back.
  // Any later edit closes the toast, so Undo never throws away newer work.
  const [version, setVersion] = useState(0);
  const touch = () => {
    setStatus({ kind: "dirty" });
    setVersion((v) => v + 1);
  };
  type Snapshot = { projects: Project[]; cases: Record<string, CaseStudy>; selected: number; tab: CaseTab };
  const [toast, setToast] = useState<{ id: number; text: string; icon?: ReactNode; before: Snapshot; at: number } | null>(null);
  /** Call right before a delete — the delete's own edit is the one `at` expects. */
  const offerUndo = (text: string, icon?: ReactNode) =>
    setToast({ id: Date.now(), text, icon, before: { projects, cases, selected, tab }, at: version + 1 });
  useEffect(() => {
    if (toast && version > toast.at) setToast(null);
  }, [version, toast]);
  const undo = () => {
    if (!toast) return;
    const { before } = toast;
    setProjects(before.projects);
    setCases(before.cases);
    setSelectedRaw(before.selected);
    setTab(before.tab);
    setStatus({ kind: "dirty" });
    setToast(null);
  };

  const patchProject = (index: number, patch: Partial<Project>) => {
    setProjects((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    touch();
  };
  const updateProject = (patch: Partial<Project>) => patchProject(selected, patch);

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

  const setSteps = (steps: CaseStep[]) => updateCase({ steps });
  const addScreen = () => {
    if (!study) return;
    setSteps([...study.steps, { title: "", screen: "", backdrop: "", hint: "", body: [] }]);
    setTab(study.steps.length);
  };
  const moveScreen = (from: number, to: number) => {
    if (!study) return;
    setSteps(move(study.steps, from, to));
    setTab((t) => (typeof t === "number" ? follow(t, from, to) : t));
  };
  const toggleScreen = (i: number) => {
    if (!study) return;
    setSteps(study.steps.map((x, j) => (j === i ? { ...x, hidden: !x.hidden || undefined } : x)));
  };
  const removeScreen = (i: number) => {
    if (!study) return;
    const s = study.steps[i];
    offerUndo(`Screen ${pad(i + 1)}${s.title ? ` “${s.title}”` : ""} deleted`, <Icon name="monitor" />);
    setSteps(study.steps.filter((_, j) => j !== i));
    setTab(study.steps.length > 1 ? Math.max(0, i - 1) : "intro");
  };

  const addProject = () => {
    const taken = new Set(projects.map((p) => p.slug));
    let n = projects.length + 1;
    while (taken.has(`new-case-${n}`)) n++;
    const slug = `new-case-${n}`;
    const fresh: Project = {
      slug,
      number: pad(projects.length + 1),
      title: "New case",
      description: "",
      recent: false,
      cover: "/images/cover-photo.jpg",
      tags: [],
      draft: true,
    };
    setProjects((list) => [...list, fresh]);
    setCases((all) => ({ ...all, [slug]: clone(template) }));
    setSelected(projects.length);
    touch();
  };

  const removeProject = (index: number) => {
    const p = projects[index];
    if (!p) return;
    offerUndo(`Case “${p.title || "Untitled"}” deleted`, <Icon name="file-text" />);
    setProjects((list) => list.filter((_, i) => i !== index));
    setCases((all) => Object.fromEntries(Object.entries(all).filter(([slug]) => slug !== p.slug)));
    setSelected((i) => (index < i || i === projects.length - 1 ? Math.max(0, i - 1) : i));
    touch();
  };

  const moveProject = (from: number, to: number) => {
    setProjects((list) => move(list, from, to));
    setSelectedRaw((sel) => follow(sel, from, to));
    touch();
  };
  const caseDrag = useReorder("y", moveProject);
  const screenDrag = useReorder("x", moveScreen);

  const save = useCallback(
    async (list: Project[] = projects) => {
      setStatus({ kind: "saving" });
      try {
        const res = await adminFetch("/api/admin/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projects: list, cases }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        setProjects(data.projects);
        if (data.changelog) setChangelog(data.changelog);
        saved.current = clone({ projects: data.projects, cases });
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setStatus(gitStatus(data.git, time));
      } catch (e) {
        setStatus({ kind: "error", text: e instanceof Error ? e.message : "Save failed" });
      }
    },
    [projects, cases],
  );

  /** Publish = take the draft mark off and save, so it goes live. */
  const publish = () => {
    const list = projects.map((p, i) => (i === selected ? { ...p, draft: undefined } : p));
    setProjects(list);
    void save(list);
  };

  /** Cancel = back to what is saved on disk. */
  const discard = () => {
    const back = clone(saved.current!);
    setProjects(back.projects);
    setCases(back.cases);
    setSelectedRaw((i) => Math.min(i, Math.max(0, back.projects.length - 1)));
    setTab("intro");
    setToast(null);
    setStatus({ kind: "idle" });
    setConfirmCancel(false);
  };

  // "Saved" shows for a moment, then the bar goes away
  useEffect(() => {
    if (status.kind !== "saved") return;
    const t = setTimeout(() => setStatus((s) => (s.kind === "saved" ? { kind: "idle" } : s)), 4000);
    return () => clearTimeout(t);
  }, [status]);

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
      case "dirty": return project?.draft ? "Draft — unsaved changes" : "Unsaved changes";
      case "saving": return "Saving…";
      case "saved":
      case "warn":
      case "error": return status.text;
      default: return project?.draft ? "Draft — not on the site yet" : "All saved";
    }
  }, [status, project?.draft]);
  const showBar = dirty || status.kind === "saving" || status.kind === "saved" || status.kind === "warn" || !!project?.draft;

  return (
    <div className={styles.app} data-bar={showBar || undefined}>
      <header className={styles.bar} data-admin-top>
        <div className={styles.barInner}>
          <p className={`mono-m ${styles.brand}`}>
            <span className={styles.dot} aria-hidden /> / admin — local only
          </p>
          <nav className={styles.nav} aria-label="Admin sections">
            <NavButton active={section === "cases"} aria-current={section === "cases" ? "page" : undefined} onClick={() => setSection("cases")}>
              Cases
            </NavButton>
            <NavButton active={section === "changelog"} aria-current={section === "changelog" ? "page" : undefined} onClick={() => setSection("changelog")}>
              Changelog{pendingCount > 0 && <span className={styles.navCount}>({pendingCount})</span>}
            </NavButton>
          </nav>
        </div>
      </header>

      {section === "changelog" ? (
        <div className={styles.single}>
          <ChangelogPanel entries={changelog} onChange={setChangelog} />
        </div>
      ) : (
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={`mono-label ${styles.sideTitle}`}>
            Cases <span>({pad(projects.length)})</span>
          </p>
          <ul className={styles.list}>
            {projects.map((p, i) => (
              <li
                key={p.slug + i}
                className={styles.item}
                // The selected row always looks selected, so it never gets the gray "hidden" style
                data-hidden={(p.hidden && i !== selected) || undefined}
                data-current={i === selected || undefined}
                title="Drag to reorder"
                {...caseDrag(i)}
              >
                <button type="button" className={styles.row} aria-current={i === selected} onClick={() => setSelected(i)}>
                  <span className="mono-s">{pad(i + 1)}</span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{p.title || "Untitled"}</span>
                    <span className={`mono-xs ${styles.rowMeta}`}>
                      {p.draft && <span className={styles.draftMark}>Draft</span>}
                      {p.hidden && <Icon name="eye-off" size={12} />}
                      <span className={styles.rowMetaText}>
                        {p.hidden ? "Hidden · " : ""}
                        {p.tags.length ? p.tags.join(" · ") : "No tags"}
                      </span>
                    </span>
                  </span>
                </button>
                {/* Hover actions — icons only, labels for screen readers and tooltips */}
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.rowAction}
                    aria-label={p.hidden ? `Show “${p.title}” on the site` : `Hide “${p.title}” from the site`}
                    title={p.hidden ? "Show on site" : "Hide from site"}
                    onClick={() => patchProject(i, { hidden: !p.hidden })}
                  >
                    <Icon name={p.hidden ? "eye" : "eye-off"} />
                  </button>
                  <button
                    type="button"
                    className={styles.rowAction}
                    aria-label={`Delete “${p.title}”`}
                    title="Delete"
                    onClick={() => removeProject(i)}
                  >
                    <Icon name="trash-2" />
                  </button>
                </div>
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
                  / case {pad(selected + 1)}
                  {project.tags[0] ? ` — ${project.tags[0].toLowerCase()}` : ""}
                  {project.draft && <Tag tone="outline">Draft</Tag>}
                </p>
                {/* The title is edited right here, in place */}
                <h1 className={styles.titleWrap}>
                  <AutoTextarea
                    className={`heading-h2 ${styles.titleInput}`}
                    value={project.title}
                    placeholder="Untitled"
                    aria-label="Case title"
                    spellCheck={false}
                    onChange={(e) => updateProject({ title: e.target.value.replace(/\n/g, " ") })}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  />
                </h1>
                {project.hidden && (
                  <p className={`mono-s ${styles.hiddenNote}`}>
                    <Icon name="eye-off" size={14} /> Hidden — not on the site after you save. Everything stays here.
                  </p>
                )}
              </div>
              <div className={styles.headActions}>
                {!project.draft && (
                  <Button variant="ghost" size="s" icon="arrow-up-right" href={`/projects/${project.slug}`} target="_blank" rel="noreferrer">
                    View case
                  </Button>
                )}
              </div>
            </div>

            {/* 1 — what you're editing */}
            <div className={styles.viewSwitch} role="group" aria-label="What you are editing">
              <Step size="m" number="01" title="Card on the landing" active={view === "card"} onClick={() => setView("card")} />
              <Step size="m" number="02" title="Case page" active={view === "case"} onClick={() => setView("case")} />
            </div>

            {view === "card" ? (
              <Section title="Card" note="What the project card on Home and All projects shows.">
                <div className={styles.grid}>
                  <Field label="Card short description" wide>
                    <AutoTextarea className={styles.textarea} value={project.description} placeholder="One line about the product" onChange={(e) => updateProject({ description: e.target.value })} />
                  </Field>
                  <Field label="Slug" hint={`/projects/${project.slug}`} wide>
                    <input className={styles.input} value={project.slug} onChange={(e) => renameSlug(e.target.value)} spellCheck={false} />
                  </Field>
                  <Field label="Tags" hint="Filters on the site · first one shows on the card" wide as="div">
                    <TagPicker
                      label="Tags"
                      creatable
                      value={project.tags}
                      options={allTags}
                      placeholder="Tables, Filters, Roles…"
                      onChange={(tags) => updateProject({ tags })}
                    />
                  </Field>
                  <Field label="Flags" wide as="div">
                    <label className={styles.switch}>
                      <input type="checkbox" role="switch" checked={project.recent} onChange={(e) => updateProject({ recent: e.target.checked })} />
                      <span className={styles.track} aria-hidden>
                        <span className={styles.thumb} />
                      </span>
                      <span className="body-m">Set as recent</span>
                    </label>
                  </Field>
                  <Field label="Cover" hint="Only on the card — screens have their own backgrounds" wide as="div">
                    <ImageDrop slug={project.slug} value={project.cover} onChange={(cover) => updateProject({ cover })} />
                  </Field>
                </div>
              </Section>
            ) : (
              <>
                {/* 2 — the text around the screens | the screens themselves */}
                <div className={styles.caseTabs} role="group" aria-label="Case page parts">
                  <div className={styles.tabGroup}>
                  <Step number="—" title="Intro & outcome" active={tab === "intro"} onClick={() => setTab("intro")} />
                  </div>
                  <span className={styles.tabsDivider} role="separator" aria-orientation="vertical" />
                  <div className={styles.tabGroup}>
                  {study.steps.map((st, i) => (
                    <div key={i} className={styles.tabItem} data-hidden={st.hidden || undefined} title="Drag to reorder" {...screenDrag(i)}>
                      <Step number={st.hidden ? `${pad(i + 1)} · hidden` : pad(i + 1)} title={st.title || "Untitled"} active={tab === i} onClick={() => setTab(i)} />
                      {/* Hover menu under the tab */}
                      <div className={styles.tabMenu}>
                        <button
                          type="button"
                          className={styles.tabMenuBtn}
                          aria-label={st.hidden ? `Show screen ${pad(i + 1)} on the site` : `Hide screen ${pad(i + 1)} from the site`}
                          title={st.hidden ? "Show on site" : "Hide from site"}
                          onClick={() => toggleScreen(i)}
                        >
                          <Icon name={st.hidden ? "eye" : "eye-off"} size={14} />
                        </button>
                        <button type="button" className={styles.tabMenuBtn} aria-label={`Delete screen ${pad(i + 1)}`} title="Delete" onClick={() => removeScreen(i)}>
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className={styles.addTab} onClick={addScreen} aria-label="Add screen" title="Add screen">
                    <Icon name="plus" />
                  </button>
                  </div>
                </div>

                {tab === "intro" && (
                  <>
                    <Section title="Intro" note="Top of the case page.">
                      <div className={styles.grid}>
                        <Field label="Headline" wide>
                          <AutoTextarea className={styles.textarea} value={study.headline} onChange={(e) => updateCase({ headline: e.target.value })} />
                        </Field>
                        <Field label="Case description" wide>
                          <AutoTextarea className={styles.textarea} value={study.lead} onChange={(e) => updateCase({ lead: e.target.value })} />
                        </Field>
                        <Field label="Role">
                          <input className={styles.input} value={study.role} onChange={(e) => updateCase({ role: e.target.value })} />
                        </Field>
                      </div>
                    </Section>
                    <Section title="Story" note="Context, problem, constraints — before the screens. Type / for blocks: /h2 Context, /label Problem.">
                      <BlockEditor key={`${project.slug}-story`} blocks={study.story} slug={project.slug} onDelete={offerUndo} onChange={(story) => updateCase({ story })} />
                    </Section>
                    <Section title="Outcome" note="After the screens. Real result only.">
                      <BlockEditor key={`${project.slug}-outcome`} blocks={study.outcome} slug={project.slug} onDelete={offerUndo} onChange={(outcome) => updateCase({ outcome })} />
                    </Section>
                  </>
                )}

                {typeof tab === "number" && study.steps[tab] && (() => {
                  const i = tab;
                  const st = study.steps[i];
                  const setStep = (patch: Partial<CaseStep>) => setSteps(study.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <>
                      <section className={styles.section}>
                        <div className={styles.sectionHead}>
                          <h2 className="mono-label">/ Screen {pad(i + 1)}</h2>
                          {st.hidden && (
                            <p className={`mono-xs ${styles.hint}`}>
                              <Icon name="eye-off" size={12} /> Hidden from the case page
                            </p>
                          )}
                        </div>
                        <Field label="Screen" hint="Shown on this screen's background" as="div">
                          <ImageDrop key={`${project.slug}-shot-${i}`} slug={project.slug} value={st.screen} backdrop={st.backdrop} framed onChange={(screen) => setStep({ screen })} />
                        </Field>
                        <div className={styles.grid}>
                          <Field label="Background" hint="Only for this screen" as="div">
                            <ImageDrop
                              key={`${project.slug}-bg-${i}`}
                              compact
                              slug={project.slug}
                              value={st.backdrop}
                              emptyText="Add a background"
                              onClear={() => setStep({ backdrop: "" })}
                              onChange={(backdrop) => setStep({ backdrop })}
                            />
                          </Field>
                          <div className={styles.stack}>
                            <Field label="Title" hint="Tab in the player">
                              <input className={styles.input} value={st.title} placeholder="Find" onChange={(e) => setStep({ title: e.target.value })} />
                            </Field>
                            <Field label="Caption" hint="Under the screen">
                              <input className={styles.input} value={st.hint} placeholder="status chips" onChange={(e) => setStep({ hint: e.target.value })} />
                            </Field>
                          </div>
                        </div>
                      </section>
                      <Section title="What's on the screen" note="Describe it like in Notion. [[words]] become ↗ links that show this screen.">
                        <BlockEditor
                          key={`${project.slug}-screen-${i}`}
                          blocks={st.body}
                          slug={project.slug}
                          allow={SCREEN_BLOCKS}
                          emptyText="Click to describe this screen — type / for lists, labels, quotes"
                          onDelete={offerUndo}
                          onChange={(body) => setStep({ body })}
                        />
                      </Section>
                    </>
                  );
                })()}

              </>
            )}
          </main>
        ) : (
          <main className={styles.empty}>
            <p className="body-l">No cases yet.</p>
            <Button icon="plus" onClick={addProject}>New case</Button>
          </main>
        )}
      </div>
      )}
      {/* Save bar — bottom of the screen, the usual place for it */}
      {showBar && (
        <div className={styles.saveBar} data-admin-bar>
          <div className={styles.saveInner}>
            <p className={`mono-s ${styles.status}`} data-kind={status.kind} role="status">
              {statusText}
            </p>
            <div className={styles.saveActions}>
              {dirty && (
                <Button variant="ghost" size="s" onClick={() => setConfirmCancel(true)}>
                  Cancel
                </Button>
              )}
              {project?.draft ? (
                <>
                  <Button variant="secondary" size="s" onClick={() => void save()} disabled={!dirty || status.kind === "saving"}>
                    Save draft
                  </Button>
                  <Button size="s" icon="arrow-up-right" onClick={publish} disabled={status.kind === "saving"}>
                    Publish
                  </Button>
                </>
              ) : (
                <Button size="s" icon="check" onClick={() => void save()} disabled={!dirty || status.kind === "saving"}>
                  Save <kbd className={styles.kbd}>⌘S</kbd>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && <UndoToast id={toast.id} icon={toast.icon} text={toast.text} onUndo={undo} onDone={() => setToast(null)} />}
      {confirmCancel && (
        <ConfirmDialog
          title="Discard changes?"
          text="Everything you changed since the last save goes back to how it was. This can’t be undone."
          cancel="Keep editing"
          confirm="Discard changes"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={discard}
        />
      )}
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

/** `as="div"` for fields whose control isn't a single input (pickers, image drop) — a <label> would steal clicks. */
function Field({ label, hint, wide, as = "label", children }: { label: string; hint?: string; wide?: boolean; as?: "label" | "div"; children: ReactNode }) {
  const Tag = as;
  return (
    <Tag className={[styles.field, wide && styles.wide].filter(Boolean).join(" ")}>
      <span className={`mono-xs ${styles.label}`}>
        {label}
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      {children}
    </Tag>
  );
}
