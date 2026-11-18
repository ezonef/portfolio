"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { adminFetch } from "./adminFetch";
import styles from "./ImageDrop.module.css";

type Props = {
  slug: string;
  value: string;
  onChange: (src: string) => void;
  compact?: boolean;
};

/** Drop, paste or pick an image — it's copied to public/images/cases/<slug>/ and the path is set. */
export function ImageDrop({ slug, value, onChange, compact }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("slug", slug);
      const res = await adminFetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.src);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={[styles.drop, compact && styles.compact].filter(Boolean).join(" ")}
        data-over={over || undefined}
        data-busy={busy || undefined}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void upload(e.dataTransfer.files[0]);
        }}
        onPaste={(e) => void upload(e.clipboardData.files[0])}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a just-uploaded file */}
        {value && <img src={value} alt="" className={styles.preview} />}
        <span className={`mono-s ${styles.overlay}`}>
          <Icon name="upload" />
          {busy ? "Uploading…" : "Drop, paste or click"}
        </span>
      </button>
      <p className={`mono-xs ${styles.path}`} data-error={error ? true : undefined}>
        {error ?? value}
      </p>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
