import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import type { CaseBlock } from "@/data/case-types";
import styles from "./CaseBlocks.module.css";

type Props = {
  blocks: CaseBlock[];
  /** When set, [[text]] becomes an "↗ text" button that calls this (shows the screen). */
  onLink?: () => void;
  className?: string;
};

type TextBlock = Extract<CaseBlock, { text: string }>;

/** Notion-style text written in the admin, rendered with the site's type styles. */
export function CaseBlocks({ blocks, onLink, className }: Props) {
  const t = (text: string) => withLinks(text, onLink);
  return (
    <div className={[styles.blocks, className].filter(Boolean).join(" ")}>
      {group(blocks).map((item, i) => {
        if (Array.isArray(item)) {
          const List = item[0].type === "numbered" ? "ol" : "ul";
          return (
            <List key={i} className={`body-m ${styles.list}`} data-kind={item[0].type}>
              {item.map((b) => <li key={b.id}>{t(b.text)}</li>)}
            </List>
          );
        }
        const b = item;
        switch (b.type) {
          case "h1": return <h2 key={b.id} className={`heading-h1 ${styles.h1}`}>{t(b.text)}</h2>;
          case "h2": return <h2 key={b.id} className={`heading-h2 ${styles.h2}`}>{t(b.text)}</h2>;
          case "h3": return <h3 key={b.id} className={`heading-h3 ${styles.h3}`}>{t(b.text)}</h3>;
          case "label": return <p key={b.id} className={`mono-label ${styles.label}`}>{b.text}</p>;
          case "quote": return <blockquote key={b.id} className={`body-m ${styles.quote}`}>{t(b.text)}</blockquote>;
          case "divider": return <hr key={b.id} className={styles.divider} />;
          case "image":
            return (
              <figure key={b.id} className={styles.figure}>
                <div className={styles.stage}>
                  <div className={styles.shot}>
                    <Image src={b.src} alt={b.caption} fill sizes="(max-width: 1024px) 90vw, 560px" className={styles.screen} />
                  </div>
                </div>
                {b.caption && <figcaption className={`mono-xs ${styles.caption}`}>{b.caption}</figcaption>}
              </figure>
            );
          default:
            return b.text ? <p key={b.id} className={`body-m ${styles.text}`}>{t(b.text)}</p> : null;
        }
      })}
    </div>
  );
}

/** Consecutive bullet / numbered blocks become one list. */
function group(blocks: CaseBlock[]): (CaseBlock | TextBlock[])[] {
  const out: (CaseBlock | TextBlock[])[] = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (b.type !== "bullet" && b.type !== "numbered") out.push(b);
    else if (Array.isArray(last) && last[0].type === b.type) last.push(b);
    else out.push([b]);
  }
  return out;
}

/** "[[text]]" → underlined "↗ text" button (or plain text when there is nothing to link to). */
function withLinks(text: string, onLink?: () => void): ReactNode {
  return text.split(/\[\[(.+?)\]\]/g).map((part, i) =>
    i % 2 === 0 ? (
      <Fragment key={i}>{part}</Fragment>
    ) : onLink ? (
      <button key={i} type="button" className={styles.inline} onClick={onLink}>
        ↗ {part}
      </button>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
