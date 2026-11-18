import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { AdminApp } from "@/components/admin/AdminApp";
import { caseTemplate, type CaseStudy } from "@/data/cases";
import type { Project } from "@/data/projects";

export const metadata: Metadata = { title: "Admin — cases", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(process.cwd(), "src/content", file), "utf8")) as T;
}

/** Local-only case editor. Exists only under `npm run admin` (see next.config.ts). */
export default async function AdminPage() {
  if (process.env.NODE_ENV !== "development" || process.env.ADMIN !== "1") notFound();

  // Read from disk on every load so the editor always shows what is saved right now.
  const [projects, cases] = await Promise.all([
    readJson<Project[]>("projects.json"),
    readJson<Record<string, Partial<CaseStudy>>>("cases.json"),
  ]);
  return <AdminApp initialProjects={projects} initialCases={cases} template={caseTemplate} />;
}
