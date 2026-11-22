import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { adminRequestError, SLUG_RE } from "@/lib/admin/guard";

const MAX_FILES = 300;
const MAX_FILE = 15 * 1024 * 1024;
const MAX_TOTAL = 40 * 1024 * 1024;
/** What a built web prototype is made of. Anything else in the folder is refused. */
const ALLOWED = new Set(["html", "css", "js", "mjs", "json", "map", "txt", "png", "jpg", "jpeg", "webp", "gif", "avif", "svg", "ico", "woff", "woff2", "ttf", "otf", "mp4", "webm"]);
const ID_RE = /^code-[a-z0-9]+$/;

const fail = (error: string, status = 400) => Response.json({ error }, { status });
const short = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "prototype";

/** A full page, even when only a fragment was pasted */
const asPage = (code: string) => (/<!doctype/i.test(code) ? code : `<!doctype html>\n<meta charset="utf-8">\n${code}`);
/** Root-absolute links ("/assets/a.js") would point at the portfolio itself: make them relative */
const relativeLinks = (html: string) => html.replace(/(\b(?:src|href)=["'])\/(?!\/)/g, "$1./");

/** "my-build/assets/a.js" → ["assets", "a.js"]; null when any part is unsafe */
function safeParts(relative: string) {
  const parts = relative.split("/").slice(1);
  if (!parts.length || parts.some((p) => !/^[\w@~+-][\w@~+.-]*$/.test(p))) return null;
  return parts;
}

export async function POST(req: Request) {
  const denied = adminRequestError(req);
  if (denied) return fail(denied, 403);

  const form = await req.formData().catch(() => null);
  const slug = form?.get("slug");
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) return fail("Set a valid slug first");
  const root = path.join(process.cwd(), "public/prototypes/custom", slug);

  // pasted code: one file, the same folder on every update
  const code = form?.get("code");
  if (typeof code === "string") {
    if (!code.trim()) return fail("The code is empty");
    if (Buffer.byteLength(code) > MAX_FILE) return fail("The code is larger than 15 MB");
    const sent = form?.get("id");
    const id = typeof sent === "string" && ID_RE.test(sent) ? sent : `code-${Date.now().toString(36)}`;
    await mkdir(path.join(root, id), { recursive: true });
    await writeFile(path.join(root, id, "index.html"), asPage(code));
    return Response.json({ src: `/prototypes/custom/${slug}/${id}/index.html` });
  }

  // a chosen folder: check everything first, write only when all of it is fine
  const files = form?.getAll("file") ?? [];
  const paths = form?.getAll("path") ?? [];
  if (!files.length || files.length !== paths.length) return fail("The folder is empty");
  if (files.length > MAX_FILES) return fail(`Too many files (max ${MAX_FILES}). Choose the built folder, like dist`);

  let total = 0;
  const queue: { parts: string[]; file: File }[] = [];
  for (const [i, file] of files.entries()) {
    const rel = paths[i];
    if (!(file instanceof File) || typeof rel !== "string") return fail("Bad upload");
    const parts = safeParts(rel);
    if (!parts) return fail(`Unsafe file name: ${rel}`);
    const ext = parts[parts.length - 1].split(".").pop()!.toLowerCase();
    if (!ALLOWED.has(ext)) return fail(`This file type can't be published: ${rel}`);
    if (file.size > MAX_FILE) return fail(`Larger than 15 MB: ${rel}`);
    total += file.size;
    queue.push({ parts, file });
  }
  if (total > MAX_TOTAL) return fail("The folder is larger than 40 MB");
  if (!queue.some((q) => q.parts.length === 1 && q.parts[0] === "index.html")) return fail("No index.html at the top of this folder. Choose the built folder, like dist");

  const base = String(paths[0]).split("/")[0];
  const id = `${short(base)}-${Date.now().toString(36)}`;
  const dir = path.join(root, id);
  for (const { parts, file } of queue) {
    const target = path.join(dir, ...parts);
    if (!target.startsWith(dir + path.sep)) return fail("Unsafe file name");
    await mkdir(path.dirname(target), { recursive: true });
    const isIndex = parts.length === 1 && parts[0] === "index.html";
    await writeFile(target, isIndex ? relativeLinks(await file.text()) : Buffer.from(await file.arrayBuffer()));
  }
  return Response.json({ src: `/prototypes/custom/${slug}/${id}/index.html`, name: base });
}
