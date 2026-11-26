"use client";

import { useState } from "react";
import styles from "../nls/nls.module.css";

const STAGES = [
  {
    name: "Figma",
    note: "Variables and components",
    title: "The system starts as a design file",
    text: "Colours, spacing and type are variables. Every component has a private primitive and a public API.",
    code: "stone/950  →  color/bg/inverse\n          →  component/button/primary/bg\n\nButton { Type, Size, State }",
  },
  {
    name: "Code",
    note: "Same names, same API",
    title: "Tokens keep their names in code",
    text: "The Figma structure maps to CSS variables and React props, so a change has one obvious place to go.",
    code: "--component-button-primary-bg-default:\n  var(--color-bg-action-primary-default);\n\n<Button variant=\"primary\" size=\"m\" />",
  },
  {
    name: "Admin",
    note: "Local case editor",
    title: "Cases are edited like a product",
    text: "A local admin edits blocks, screens, backdrops and prototypes. It is not part of the public build.",
    code: "npm run admin\n\nScreen source:\n  Library · Code · Folder\nBackdrop: colour + opacity",
  },
  {
    name: "Production",
    note: "Commit to deploy",
    title: "Saving a case publishes it",
    text: "Content is versioned in Git. A push builds the static site, and visitor stats stay cookieless.",
    code: "src/content/cases.json\n  → git push\n  → next build\n  → Vercel",
  },
];

const DECISIONS = [
  ["AI used native selects in the admin", "Replaced them with design system components and made that a rule for every new control."],
  ["AI shrank a player control to fit", "Restored the size of the existing Design process bar: consistency over a local fix."],
  ["Two servers shared one build folder", "Found through stale admin styles. Split the site and admin builds."],
  ["Google Fonts failed a production build", "Moved fonts into the project, so a deploy no longer depends on a third party."],
];

export default function Pipeline() {
  const [at, setAt] = useState(0);
  const stage = STAGES[at];
  return (
    <div className={styles.app}>
      <div className={styles.stages} role="group" aria-label="Pipeline stage">
        {STAGES.map((s, i) => (
          <button key={s.name} type="button" className={styles.stage} aria-pressed={i === at} onClick={() => setAt(i)}>
            <span className="mono-xs">0{i + 1} / {s.name}</span>
            <span>{s.note}</span>
          </button>
        ))}
      </div>
      <div className={styles.split}>
        <div className={styles.chat}>
          <h3 className="heading-h4">{stage.title}</h3>
          <p className={styles.secondary}>{stage.text}</p>
          <pre className={styles.code}>{stage.code}</pre>
        </div>
        <aside className={styles.side}>
          <p className={styles.label}>Where AI was wrong, and what I decided</p>
          {DECISIONS.map(([wrong, fixed]) => (
            <div key={wrong} className={styles.decision}>
              <strong style={{ fontWeight: 500 }}>{wrong}</strong>
              <span className={styles.secondary}>{fixed}</span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
