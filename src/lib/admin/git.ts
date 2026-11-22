import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Only what the admin writes: case texts, uploaded images and pasted/uploaded prototypes. Site code is never committed from here. */
const PATHS = ["src/content", "public/images/cases", "public/prototypes/custom"];

export type GitResult = { committed: boolean; pushed: boolean; error?: string };

async function git(args: string[], timeout = 15_000) {
  // GIT_TERMINAL_PROMPT=0: if git ever needs a password it fails right away instead of hanging the save
  return run("git", args, { cwd: process.cwd(), timeout, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
}

/** One commit at a time, so two quick saves never race each other. */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Commit the content files and push, so Vercel rebuilds the site.
 * Only the content paths go into the commit — anything else you have staged or changed is left alone.
 */
export function commitContent(message: string): Promise<GitResult> {
  const job = queue.then(async (): Promise<GitResult> => {
    let committed = false;
    try {
      const paths = PATHS.filter((p) => existsSync(p)); // the images folder appears after the first upload
      await git(["add", "--", ...paths]);
      // Commit exactly the staged content files (an empty images folder would make git fail on a folder pathspec)
      const { stdout } = await git(["diff", "--cached", "--name-only", "-z", "--", ...paths]);
      const files = stdout.split("\0").filter(Boolean);
      if (files.length) await git(["commit", "-m", message, "--", ...files]);
      committed = files.length > 0;
    } catch (e) {
      return { committed: false, pushed: false, error: `Commit failed: ${short(e)}` };
    }
    // Push even when nothing new was committed: it also sends an earlier commit whose push failed
    try {
      await git(["push", "origin", "HEAD"], 60_000);
      return { committed, pushed: true };
    } catch (e) {
      return { committed, pushed: false, error: `Push failed: ${short(e)}` };
    }
  });
  queue = job;
  return job;
}

function short(e: unknown) {
  const err = e as { stderr?: string; message?: string };
  const lines = (err.stderr || err.message || "").trim().split("\n").filter(Boolean);
  const line = lines.find((l) => /^(fatal|error|remote): /.test(l)) ?? lines[0] ?? "unknown error";
  return line.replace(/^(fatal|error): /, "").slice(0, 160);
}
