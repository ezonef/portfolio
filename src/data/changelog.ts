import changelogData from "@/content/changelog.json";
import { normalizeEntry, type ChangelogEntry } from "./changelog-types";

export * from "./changelog-types";

/** Only what you approved in the admin, newest first. */
export const changelog: ChangelogEntry[] = (changelogData as unknown as ChangelogEntry[])
  .map(normalizeEntry)
  .filter((e) => e.status === "approved")
  .sort((a, b) => b.date.localeCompare(a.date));
