"use client";

import { useEffect, useRef, useState } from "react";
import { smoothScrollTo } from "@/lib/smoothScroll";
import styles from "./SectionNav.module.css";

/** `badge` marks a section worth a look with a red dot, until it has been opened once */
type Item = { id: string; label: string; badge?: boolean };

const SEEN = "section-nav-seen";

/**
 * A bar pinned to the bottom of the screen that names the sections of a long page.
 * The section under the middle of the screen is the active chip — one pill slides under it; a click scrolls there.
 * It slides away over the footer, so it never covers the contact links.
 * An item with `badge` carries a red dot until it is clicked once (remembered in localStorage).
 */
export function SectionNav({ items, label = "Sections" }: { items: Item[]; label?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const [hidden, setHidden] = useState(false);
  // null until read from storage, so an already-opened badge never flashes in
  const [seen, setSeen] = useState<string[] | null>(null);

  // which badges were already opened, remembered on this device
  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(SEEN) || "[]"));
    } catch {
      setSeen([]);
    }
  }, []);
  const markSeen = (id: string) => {
    if (!seen || seen.includes(id)) return;
    const next = [...seen, id];
    setSeen(next);
    try {
      localStorage.setItem(SEEN, JSON.stringify(next));
    } catch {}
  };
  const list = useRef<HTMLUListElement>(null);
  // one pill that slides under the active chip
  const [pill, setPill] = useState<{ x: number; w: number; moved: boolean } | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight * 0.5;
      let current = items[0]?.id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= mid) current = it.id;
      }
      setActive(current);
      const footer = document.querySelector("footer");
      setHidden(!!footer && footer.getBoundingClientRect().top < window.innerHeight - 24);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  // move the pill under the active chip (and keep it there when the fonts or the window change size)
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    const place = () => {
      // measure the chip's <li>: it is the box positioned inside the list
      const item = ul.querySelector<HTMLElement>("[aria-current]")?.parentElement;
      if (!item) return;
      setPill((p) => ({ x: item.offsetLeft, w: item.offsetWidth, moved: p !== null }));
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [active]);

  // on a narrow screen the bar scrolls sideways: keep the active chip in view
  useEffect(() => {
    const ul = list.current;
    const chip = ul?.querySelector<HTMLElement>("[aria-current]")?.parentElement;
    if (!ul || !chip) return;
    const left = chip.offsetLeft - (ul.clientWidth - chip.offsetWidth) / 2;
    ul.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  return (
    <nav className={styles.nav} aria-label={label} data-hidden={hidden || undefined}>
      <ul ref={list} className={styles.list}>
        {pill && (
          <li
            aria-hidden
            className={styles.pill}
            data-moved={pill.moved || undefined}
            style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
          />
        )}
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`mono-s ${styles.chip}`}
              aria-current={active === it.id ? "true" : undefined}
              onClick={(e) => {
                const el = document.getElementById(it.id);
                if (!el) return;
                e.preventDefault();
                markSeen(it.id);
                smoothScrollTo(el);
                history.replaceState(null, "", `#${it.id}`);
              }}
            >
              {it.label}
              {it.badge && seen && !seen.includes(it.id) && (
                <span className={styles.badge}>
                  <span className="visually-hidden"> (worth a look)</span>
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
