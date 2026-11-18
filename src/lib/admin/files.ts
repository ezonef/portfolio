import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const CONTENT = path.join(process.cwd(), "src/content");

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(CONTENT, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Write to a temp file and rename, so a crash never leaves half-written JSON. */
export async function writeJson(file: string, data: unknown) {
  const target = path.join(CONTENT, file);
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, target);
}
