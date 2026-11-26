"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { Segmented } from "@/components/ui/Segmented/Segmented";
import { isWebUrl, linkLabel, type CaseLink, type CaseStep, type ScreenSource } from "@/data/case-types";
import { ScreenField } from "./ScreenField";
import admin from "./AdminApp.module.css";
import styles from "./ScreenLayouts.module.css";

type Layout = "desktop" | "mobile";
const LAYOUTS: { value: Layout; label: string }[] = [
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
];
const isEmpty = (s: ScreenSource) => !s.screen && !s.prototype && !s.embed && !s.url;

/** One screen's content for each layout. The site offers Mobile only once it has something to show. */
export function ScreenLayouts({ slug, index, step, onChange }: { slug: string; index: number; step: CaseStep; onChange: (patch: Partial<CaseStep>) => void }) {
  const [layout, setLayout] = useState<Layout>("desktop");
  const mobile = step.mobile ?? { screen: "" };
  const changeMobile = (patch: Partial<ScreenSource>) => {
    const next = { ...mobile, ...patch };
    onChange({ mobile: isEmpty(next) ? undefined : next });
  };
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <Segmented size="s" label="Screen layout" options={LAYOUTS} value={layout} onChange={setLayout} />
        {layout === "mobile" && step.mobile && (
          <Button variant="ghost" size="s" icon="trash-2" onClick={() => onChange({ mobile: undefined })}>
            Remove mobile
          </Button>
        )}
      </div>
      {layout === "desktop" ? (
        <ScreenField key={`${slug}-${index}-desktop`} slug={slug} screen={step.screen} prototype={step.prototype} embed={step.embed} url={step.url} backdrop={step.backdrop} onChange={onChange} />
      ) : (
        <ScreenField
          key={`${slug}-${index}-mobile-${step.mobile ? "set" : "empty"}`}
          slug={slug}
          screen={mobile.screen}
          prototype={mobile.prototype}
          embed={mobile.embed}
          url={mobile.url}
          backdrop={step.backdrop}
          onChange={changeMobile}
        />
      )}
    </div>
  );
}

/** Buttons on the player: a Figma file, the live site, any https page */
export function LinksField({ links, onChange }: { links: CaseLink[]; onChange: (links: CaseLink[]) => void }) {
  const patch = (i: number, p: Partial<CaseLink>) => onChange(links.map((l, j) => (j === i ? { ...l, ...p } : l)));
  return (
    <div className={styles.links}>
      {links.map((l, i) => {
        const bad = !!l.url.trim() && !isWebUrl(l.url.trim());
        return (
          <div key={i} className={styles.linkRow}>
            <input className={admin.input} value={l.label} maxLength={40} placeholder={l.url ? linkLabel(l.url) : "Label"} aria-label={`Link ${i + 1} label`} onChange={(e) => patch(i, { label: e.target.value })} />
            <input
              className={admin.input}
              value={l.url}
              type="url"
              inputMode="url"
              spellCheck={false}
              placeholder="https://figma.com/design/…"
              aria-label={`Link ${i + 1} address`}
              aria-invalid={bad || undefined}
              onChange={(e) => patch(i, { url: e.target.value, label: !l.label || l.label === linkLabel(l.url) ? (isWebUrl(e.target.value.trim()) ? linkLabel(e.target.value.trim()) : "") : l.label })}
            />
            <IconButton icon="trash-2" variant="ghost" label={`Remove link ${i + 1}`} onClick={() => onChange(links.filter((_, j) => j !== i))} />
            {bad && <p className={`mono-xs ${styles.error}`} role="alert">The address must start with https://</p>}
          </div>
        );
      })}
      {links.length < 6 && (
        <Button variant="secondary" size="s" icon="plus" onClick={() => onChange([...links, { label: "", url: "" }])}>
          Add link
        </Button>
      )}
    </div>
  );
}
