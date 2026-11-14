"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { MenuItem } from "@/components/ui/MenuItem/MenuItem";
import { contactLook, contactWrite, site } from "@/data/site";
import styles from "./MobileMenu.module.css";

/** Mobile navigation: menu button → full-screen sheet (native <dialog>). Shown only below 760px. */
export function MobileMenu({ onOpenProjects }: { onOpenProjects: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <div className={styles.root}>
      <IconButton icon="menu" size="s" label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} />

      <dialog ref={ref} className={styles.sheet} aria-label="Menu" onClose={() => setOpen(false)}>
        <div className={styles.top}>
          <span className="mono-m-strong">
            {site.name}
            <span className={styles.accent}>_</span>
          </span>
          <IconButton icon="x" size="s" variant="ghost" label="Close menu" onClick={() => setOpen(false)} />
        </div>

        <nav aria-label="Main" className={styles.nav}>
          <button
            type="button"
            className="heading-h2"
            onClick={() => {
              setOpen(false);
              onOpenProjects();
            }}
          >
            Projects
          </button>
          <Link href="/process" className="heading-h2" onClick={() => setOpen(false)}>
            My design process
          </Link>
          <a href="/cv.pdf" className="heading-h2">
            CV.pdf
          </a>
        </nav>

        <div className={styles.contacts}>
          <p className="mono-label">Get in touch</p>
          {[...contactWrite, ...contactLook].map((item, i) => (
            <MenuItem key={item.title} {...item} selected={i === 0} />
          ))}
        </div>
      </dialog>
    </div>
  );
}
