"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { MenuItem } from "@/components/ui/MenuItem/MenuItem";
import { contactLook, contactWrite, site } from "@/data/site";
import styles from "./MobileMenu.module.css";

/** Mobile navigation: menu button → full-screen sheet (native <dialog>). Shown only below 760px. */
export function MobileMenu() {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();

    // Lock the page behind the sheet: a modal <dialog> doesn't stop the page from scrolling
    // (notably on iOS). Keep the scrollbar's space so the layout doesn't jump on desktop.
    const root = document.documentElement;
    if (open) {
      root.style.setProperty("--scrollbar-gap", `${window.innerWidth - root.clientWidth}px`);
      root.classList.add("scroll-locked");
    } else {
      root.classList.remove("scroll-locked");
    }
    return () => root.classList.remove("scroll-locked");
  }, [open]);

  return (
    <div className={styles.root}>
      <IconButton icon="menu" size="s" variant="ghost" label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} />

      <dialog ref={ref} className={styles.sheet} aria-label="Menu" onClose={() => setOpen(false)}>
        <div className={styles.top}>
          <span className={`mono-m-strong ${styles.logo}`}>{site.name}</span>
          <IconButton icon="x" size="s" variant="ghost" label="Close menu" onClick={() => setOpen(false)} />
        </div>

        <nav aria-label="Main" className={styles.nav}>
          <Link href="/projects" className="heading-h2" onClick={() => setOpen(false)}>
            Projects
          </Link>
          <Link href="/process" className="heading-h2" onClick={() => setOpen(false)}>
            My design process
          </Link>
          <Link href="/changelog" className="heading-h2" onClick={() => setOpen(false)}>
            Changelog
          </Link>
          <a href="/cv.pdf" className="heading-h2">
            CV.pdf
          </a>
        </nav>

        <div className={styles.contacts}>
          <p className="mono-label">Get in touch</p>
          {[...contactWrite, ...contactLook].map((item) => (
            <MenuItem key={item.title} {...item} />
          ))}
        </div>
      </dialog>
    </div>
  );
}
