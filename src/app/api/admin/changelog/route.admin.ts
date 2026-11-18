import { validateChangelog } from "@/lib/admin/changelog";
import { writeJson } from "@/lib/admin/files";
import { commitContent } from "@/lib/admin/git";
import { adminRequestError } from "@/lib/admin/guard";

/** Approve / edit / dismiss changelog lines — the whole list is sent and written at once. */
export async function POST(req: Request) {
  const denied = adminRequestError(req);
  if (denied) return Response.json({ error: denied }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body is not JSON" }, { status: 400 });
  }
  const result = validateChangelog(body);
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
  await writeJson("changelog.json", result.entries);
  const git = await commitContent("Content: update changelog");
  return Response.json({ ok: true, entries: result.entries, git });
}
