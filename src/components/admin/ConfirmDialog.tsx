"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import styles from "./ConfirmDialog.module.css";

type Props = {
  title: string;
  text: string;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Small modal for a destructive choice. Esc or the scrim keeps editing; focus starts on the safe button. */
export function ConfirmDialog({ title, text, confirm, cancel, onConfirm, onCancel }: Props) {
  const safe = useRef<HTMLDivElement>(null);
  useEffect(() => {
    safe.current?.querySelector("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className={styles.scrim} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text">
        <h2 id="confirm-title" className="heading-h4">{title}</h2>
        <p id="confirm-text" className={`body-s ${styles.text}`}>{text}</p>
        <div className={styles.actions}>
          <div ref={safe}>
            <Button variant="secondary" size="s" onClick={onCancel}>{cancel}</Button>
          </div>
          <Button size="s" onClick={onConfirm}>{confirm}</Button>
        </div>
      </div>
    </div>
  );
}
