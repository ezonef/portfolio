/** Changelog types — no content, so the admin's client code can import them without the JSON. */
import type { CaseBlock, CaseBlockType } from "./case-types";

export type ChangelogStatus = "pending" | "approved";
export type ChangelogKind = "published" | "updated" | "note";

export type ChangelogEntry = {
  id: string;
  /** yyyy-mm-dd */
  date: string;
  title: string;
  /** Written Notion-style, like the case texts */
  body: CaseBlock[];
  /** pending = proposed by the admin, waiting for you; approved = shown on /changelog */
  status: ChangelogStatus;
  kind: ChangelogKind;
  /** The case it is about, if any — the site links to it */
  slug?: string;
};

/** Blocks a changelog line can use — text only, no page headings or images. */
export const CHANGELOG_BLOCKS: CaseBlockType[] = ["h3", "label", "text", "bullet", "numbered", "quote"];

/** Older lines stored plain `text` — turn it into one text block. */
export function normalizeEntry(e: ChangelogEntry & { text?: string }): ChangelogEntry {
  const { text, ...rest } = e;
  const body = Array.isArray(e.body) ? e.body : text ? [{ id: `${e.id}-t`, type: "text" as const, text }] : [];
  return { ...rest, body };
}
