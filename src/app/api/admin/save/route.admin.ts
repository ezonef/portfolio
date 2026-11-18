import { writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { adminRequestError } from "@/lib/admin/guard";
import { validateContent } from "@/lib/admin/validate";

const CONTENT = path.join(process.cwd(), "src/content");

/** Write to a temp file and rename, so a crash never leaves half-written JSON. */
async function writeJson(file: string, data: unknown) {
  const target = path.join(CONTENT, file);
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, target);
}

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

  await writeJson("cases.json", result.cases);
  await writeJson("projects.json", result.projects);
  return Response.json({ ok: true, projects: result.projects });
}
