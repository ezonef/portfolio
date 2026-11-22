"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Segmented } from "@/components/ui/Segmented/Segmented";
import { Step } from "@/components/ui/Step/Step";
import { EmbedFrame } from "@/components/site/PrototypeFrame/EmbedFrame";
import { PrototypeFrame } from "@/components/site/PrototypeFrame/PrototypeFrame";
import { isColor } from "@/data/case-types";
import { findPrototype, PROTOTYPES } from "@/prototypes/registry";
import { adminFetch } from "./adminFetch";
import { CodeEditor } from "./CodeEditor";
import { ImageDrop } from "./ImageDrop";
import drop from "./ImageDrop.module.css";
import { TagPicker } from "./TagPicker";
import styles from "./ScreenField.module.css";

type Patch = { screen?: string; prototype?: string | undefined; embed?: string | undefined };
type Props = {
  slug: string;
  /** Uploaded image path */
  screen: string;
  /** Prototype id from the library */
  prototype?: string;
  /** Pasted or uploaded prototype */
  embed?: string;
  backdrop: string;
  onChange: (patch: Patch) => void;
};
type Source = "library" | "code" | "folder";

const STARTER = `<style>
  body { margin: 0; display: grid; place-items: center; height: 100vh; font-family: system-ui; }
</style>

<button onclick="this.textContent = 'Clicked'">Prototype</button>

<script>
  // your code
</script>
`;
const SOURCES: { value: Source; label: string }[] = [
  { value: "library", label: "Library" },
  { value: "code", label: "Code" },
  { value: "folder", label: "Folder" },
];
const PROTOTYPE_LABELS = Object.fromEntries(PROTOTYPES.map((p) => [p.id, p.title]));
type Upload = { file: File; path: string };

/** Everything inside a dropped folder, with its path */
async function readDropped(entry: FileSystemEntry): Promise<Upload[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((ok, no) => (entry as FileSystemFileEntry).file(ok, no));
    return [{ file, path: entry.fullPath.replace(/^\//, "") }];
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const all: FileSystemEntry[] = [];
  // the browser hands the list over in batches
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((ok, no) => reader.readEntries(ok, no));
    if (!batch.length) break;
    all.push(...batch);
  }
  return (await Promise.all(all.map(readDropped))).flat();
}

const isCodeEmbed = (e?: string) => !!e && /\/code-[a-z0-9]+\/index\.html$/.test(e);
const folderName = (e?: string) => e?.split("/").at(-2)?.replace(/-[a-z0-9]+$/, "") ?? "";

/**
 * A screen is an Image (upload) or Code: a prototype from the library, code pasted here, or a built folder.
 * Switching keeps what was there, so flipping back and forth loses nothing.
 */
export function ScreenField({ slug, screen, prototype, embed, backdrop, onChange }: Props) {
  const [mode, setMode] = useState<"image" | "code">(prototype || embed ? "code" : "image");
  const [source, setSource] = useState<Source>(embed ? (isCodeEmbed(embed) ? "code" : "folder") : "library");
  const last = useRef({ library: prototype, code: isCodeEmbed(embed) ? embed : undefined, folder: embed && !isCodeEmbed(embed) ? embed : undefined });

  const [code, setCode] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const folderInput = useRef<HTMLInputElement>(null);

  const remember = () => {
    if (prototype) last.current.library = prototype;
    if (embed) last.current[isCodeEmbed(embed) ? "code" : "folder"] = embed;
  };
  // a source with nothing in it yet changes nothing: the screen keeps what it shows until code is applied or a folder uploaded
  const apply = (s: Source) => {
    if (s === "library") {
      if (!prototype || embed) onChange({ prototype: last.current.library ?? PROTOTYPES[0]?.id, embed: undefined });
    }
    else if (last.current[s]) onChange({ prototype: undefined, embed: last.current[s] });
    else if (!prototype && !embed) onChange({ prototype: last.current.library ?? PROTOTYPES[0]?.id, embed: undefined });
  };

  const pickMode = (m: "image" | "code") => {
    if (m === mode) return;
    setMode(m);
    if (m === "image") {
      remember();
      onChange({ prototype: undefined, embed: undefined });
    } else apply(source);
  };
  const pickSource = (s: Source) => {
    remember();
    setSource(s);
    setError("");
    apply(s);
  };

  // open saved code in the editor; a new one starts from a small example
  const editing = mode === "code" && source === "code";
  useEffect(() => {
    if (!editing || code !== null) return;
    const src = last.current.code;
    if (!src) {
      setCode(STARTER);
      return;
    }
    let off = false;
    fetch(src, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => {
        if (off) return;
        setCode(t);
        setSaved(t);
      })
      .catch(() => !off && setCode(STARTER));
    return () => {
      off = true;
    };
  }, [editing, code]);

  // the preview follows typing, a moment later
  useEffect(() => {
    if (!editing || code === null) return;
    const t = setTimeout(() => setPreview(code), 350);
    return () => clearTimeout(t);
  }, [editing, code]);

  const send = async (form: FormData) => {
    setBusy(true);
    setError("");
    form.set("slug", slug);
    try {
      const res = await adminFetch("/api/admin/prototype", { method: "POST", body: form });
      const data = (await res.json()) as { src?: string; error?: string };
      if (!res.ok || !data.src) throw new Error(data.error ?? "Upload failed");
      return data.src;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const applyCode = async () => {
    if (code === null) return;
    const form = new FormData();
    form.set("code", code);
    const id = isCodeEmbed(embed) ? embed!.split("/").at(-2) : undefined;
    if (id) form.set("id", id);
    const src = await send(form);
    if (!src) return;
    last.current.code = src;
    setSaved(code);
    onChange({ prototype: undefined, embed: src });
  };

  const uploadFolder = async (list: Upload[]) => {
    // dependencies and hidden files are never part of a prototype
    const files = list.filter((f) => !f.path.split("/").some((p) => p === "node_modules" || p.startsWith(".")));
    if (!files.length) return;
    const form = new FormData();
    for (const f of files) {
      form.append("file", f.file);
      form.append("path", f.path);
    }
    const src = await send(form);
    if (!src) return;
    last.current.folder = src;
    onChange({ prototype: undefined, embed: src });
  };
  const chooseFolder = (e: ChangeEvent<HTMLInputElement>) => {
    const list = [...(e.target.files ?? [])].map((file) => ({ file, path: file.webkitRelativePath }));
    e.target.value = "";
    void uploadFolder(list);
  };
  const dropFolder = async (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const entry = e.dataTransfer.items[0]?.webkitGetAsEntry();
    if (!entry?.isDirectory) {
      setError("Drop a folder, not a file");
      return;
    }
    void uploadFolder(await readDropped(entry));
  };

  const meta = findPrototype(prototype);
  const folderEmbed = embed && !isCodeEmbed(embed) ? embed : undefined;
  const dirty = code !== null && code !== saved;

  return (
    <div className={styles.field}>
      <div className={styles.modes} role="group" aria-label="Screen type">
        <Step number="01" title="Image" active={mode === "image"} onClick={() => pickMode("image")} />
        <Step number="02" title="Code" active={mode === "code"} onClick={() => pickMode("code")} />
      </div>

      {mode === "image" ? (
        <ImageDrop slug={slug} value={screen} backdrop={backdrop} framed onChange={(src) => onChange({ screen: src })} />
      ) : (
        <>
          <Segmented className={styles.source} label="Prototype source" options={SOURCES} value={source} onChange={pickSource} />

          {source === "folder" && !folderEmbed ? (
            <button
              type="button"
              className={drop.drop}
              data-over={over || undefined}
              data-busy={busy || undefined}
              disabled={busy}
              onClick={() => folderInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={dropFolder}
            >
              <span className={`mono-s ${drop.overlay}`}>
                <Icon name="upload" />
                {busy ? "Uploading…" : "Drop a folder or click"}
              </span>
            </button>
          ) : (
            <div className={styles.preview}>
              {isColor(backdrop) ? (
                <span className={styles.backdrop} style={{ background: backdrop }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local admin preview
                backdrop && <img src={backdrop} alt="" className={styles.backdrop} />
              )}
              <div className={styles.inset} data-fill={source !== "library" || undefined}>
                {source === "library" && prototype && <PrototypeFrame key={prototype} id={prototype} />}
                {source === "code" && <iframe title="Code preview" sandbox="allow-scripts" srcDoc={preview} className={styles.frame} />}
                {source === "folder" && folderEmbed && <EmbedFrame key={folderEmbed} src={folderEmbed} title="Folder preview" />}
              </div>
            </div>
          )}

          {source === "library" && (
            <>
              <TagPicker
                label="Prototype"
                multiple={false}
                value={prototype ? [prototype] : []}
                options={PROTOTYPES.map((p) => p.id)}
                labels={PROTOTYPE_LABELS}
                placeholder="Choose a prototype"
                onChange={([id]) => onChange({ prototype: id, embed: undefined })}
              />
              {meta && <p className={`mono-xs ${styles.help}`}>{meta.description}</p>}
            </>
          )}

          {source === "code" && (
            <div className={styles.editor}>
              {code !== null && <CodeEditor value={code} label="Prototype code: HTML, CSS and JavaScript" onChange={setCode} onSave={() => void applyCode()} />}
              <div className={styles.editorFoot}>
                <span className={`mono-xs ${styles.help}`}>HTML, CSS and JS in one file · ⌘S applies</span>
                <Button variant="primary" size="s" disabled={busy || !dirty || !code?.trim()} onClick={applyCode}>
                  {busy ? "Applying…" : dirty ? "Apply code" : "Applied"}
                </Button>
              </div>
            </div>
          )}

          {source === "folder" && (
            <div className={drop.foot}>
              <p className={`mono-xs ${drop.path}`}>{folderEmbed ? folderName(folderEmbed) : "A built folder with index.html, like dist"}</p>
              {folderEmbed && (
                <button type="button" className={`mono-xs ${drop.clear}`} disabled={busy} onClick={() => folderInput.current?.click()}>
                  {busy ? "Uploading…" : "Replace"}
                </button>
              )}
            </div>
          )}
          <input
            ref={(el) => {
              folderInput.current = el;
              el?.setAttribute("webkitdirectory", "");
            }}
            type="file"
            hidden
            multiple
            onChange={chooseFolder}
          />

          {error && (
            <p className={`mono-xs ${styles.error}`} role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
