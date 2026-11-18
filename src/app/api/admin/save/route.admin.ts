import type { CaseStudy } from "@/data/case-types";
import { normalizeCase } from "@/data/case-types";
import { caseTemplate } from "@/data/cases";
import type { ChangelogEntry } from "@/data/changelog-types";
import type { Project } from "@/data/project-meta";
import { proposeEntries } from "@/lib/admin/changelog";
import { readJson, writeJson } from "@/lib/admin/files";
import { commitContent } from "@/lib/admin/git";
import { adminRequestError } from "@/lib/admin/guard";
import { validateContent } from "@/lib/admin/validate";

export async function POST(req: Request) {
  const denied = adminRequestError(req);
  if (denied) return Response.json({ error: denied }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body is not JSON" }, { status: 400 });
  }
  const result = validateContent(body);
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });

  // What was live before this save — to propose changelog lines for what changed
  const [oldProjects, oldCasesRaw, entries] = await Promise.all([
    readJson<Project[]>("projects.json", []),
    readJson<Record<string, Record<string, unknown>>>("cases.json", {}),
    readJson<ChangelogEntry[]>("changelog.json", []),
  ]);
  const oldCases: Record<string, CaseStudy> = Object.fromEntries(
    Object.entries(oldCasesRaw).map(([slug, c]) => [slug, normalizeCase(caseTemplate, c)]),
  );
  const newCases: Record<string, CaseStudy> = Object.fromEntries(
    Object.entries(result.cases).map(([slug, c]) => [slug, normalizeCase(caseTemplate, c as unknown as Record<string, unknown>)]),
  );
  const changelog = proposeEntries({ projects: oldProjects, cases: oldCases }, { projects: result.projects, cases: newCases }, entries);

  await writeJson("cases.json", result.cases);
  await writeJson("projects.json", result.projects);
  if (changelog.length !== entries.length || JSON.stringify(changelog) !== JSON.stringify(entries)) await writeJson("changelog.json", changelog);
  const git = await commitContent(commitMessage(oldProjects, oldCasesRaw, result.projects, result.cases));
  return Response.json({ ok: true, projects: result.projects, changelog, git });
}

/** "Publish case “Arena”", "Update cases “Arena”, “Pulse”", "Delete case “Old”"… */
function commitMessage(oldList: Project[], oldCases: Record<string, unknown>, newList: Project[], newCases: Record<string, unknown>) {
  const before = new Map(oldList.map((p) => [p.slug, p]));
  const after = new Set(newList.map((p) => p.slug));
  const parts: string[] = [];
  const add = (verb: string, names: string[]) => {
    if (names.length) parts.push(`${verb} case${names.length > 1 ? "s" : ""} ${names.map((n) => `“${n}”`).join(", ")}`);
  };
  const published: string[] = [];
  const created: string[] = [];
  const updated: string[] = [];
  for (const p of newList) {
    const old = before.get(p.slug);
    if (!old) created.push(p.title);
    else if (old.draft && !p.draft) published.push(p.title);
    else if (JSON.stringify(old) !== JSON.stringify(p) || JSON.stringify(oldCases[p.slug]) !== JSON.stringify(newCases[p.slug])) updated.push(p.title);
  }
  add("Publish", published);
  add("Add", created);
  add("Update", updated);
  add("Delete", oldList.filter((p) => !after.has(p.slug)).map((p) => p.title));
  if (!parts.length && oldList.map((p) => p.slug).join() !== newList.map((p) => p.slug).join()) parts.push("Reorder cases");
  return `Content: ${parts.join("; ") || "update cases"}`;
}
