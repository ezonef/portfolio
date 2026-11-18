/** Project types — no content, so the admin's client code can import it without bundling the JSON. */
export type Project = {
  slug: string;
  number: string;
  title: string;
  description: string;
  recent: boolean;
  cover: string;
  /** Tags drive the filter chips. The first one is shown on the card and in the case eyebrow. */
  tags: string[];
  /** Hidden cases stay in the admin but don't appear on the site (no card, no page). */
  hidden?: boolean;
  /** Drafts were never published: they live only in the admin until you press Publish. */
  draft?: boolean;
};
