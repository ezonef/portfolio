import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { adminRequestError, SLUG_RE } from "@/lib/admin/guard";

const MAX_BYTES = 15 * 1024 * 1024;
/** Raster images only. SVG is left out on purpose: it can carry scripts. */
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Check the file's first bytes too — the browser-sent type alone can lie. */
function looksLike(ext: string, b: Buffer) {
  const hex = b.subarray(0, 12).toString("hex");
  if (ext === "png") return hex.startsWith("89504e47");
  if (ext === "jpg") return hex.startsWith("ffd8ff");
  if (ext === "gif") return hex.startsWith("47494638");
  if (ext === "webp") return hex.startsWith("52494646") && b.subarray(8, 12).toString() === "WEBP";
  if (ext === "avif") return b.subarray(4, 12).toString().startsWith("ftyp");
  return false;
}

export async function POST(req: Request) {
  const denied = adminRequestError(req);
  if (denied) return Response.json({ error: denied }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const slug = form?.get("slug");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) return Response.json({ error: "Set a valid slug first" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return Response.json({ error: "Use PNG, JPG, WebP, GIF or AVIF" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File is larger than 15 MB" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLike(ext, bytes)) return Response.json({ error: "File content does not match its type" }, { status: 400 });

  // Name comes from us, never from the uploaded file name.
  const base = path.parse(file.name).name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const name = `${base}-${Date.now().toString(36)}.${ext}`;
  const dir = path.join(process.cwd(), "public/images/cases", slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return Response.json({ src: `/images/cases/${slug}/${name}` });
}
