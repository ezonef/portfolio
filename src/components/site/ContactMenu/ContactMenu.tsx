"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { MenuItem } from "@/components/ui/MenuItem/MenuItem";
import { NavButton } from "@/components/ui/NavLink/NavLink";
import { contactLook, contactWrite, site } from "@/data/site";
import styles from "./ContactMenu.module.css";

/**
 * "Contact ▾" in the header — disclosure pattern: a button that shows/hides a panel of links.
 * Opens on hover (desktop) and on click / Enter (keyboard, touch).
 * Closes on mouse leave, Esc, or a click outside.
 */
export function ContactMenu() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // small delay so the pointer can travel from the trigger into the panel
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };

  return (
    <div ref={rootRef} className={styles.root} onMouseEnter={show} onMouseLeave={hide}>
      <NavButton
        ref={triggerRef}
        caret
        aria-expanded={open}
        aria-controls={menuId}
        // Keyboard (Enter/Space → event.detail === 0) toggles. Mouse/touch only opens:
        // hover has usually opened it already, and a click must not close it again.
        onClick={(e) => (e.detail === 0 ? setOpen((v) => !v) : show())}
      >
        Contact
      </NavButton>

      <div id={menuId} className={styles.panel} hidden={!open}>
        <div className={styles.head}>
          <span className="mono-label">
            Get in touch <span className={styles.count}>07</span>
          </span>
          <span className={styles.status}>
            <span className={styles.dot} aria-hidden />
            Replies within a day
          </span>
        </div>

        <div className={styles.columns}>
          <div className={styles.column}>
            <p className={`mono-label ${styles.group}`}>Write</p>
            {contactWrite.map((item, i) => (
              <MenuItem key={item.title} {...item} selected={i === 0} />
            ))}
          </div>
          <div className={styles.column}>
            <p className={`mono-label ${styles.group}`}>Look around</p>
            {contactLook.map((item) => (
              <MenuItem key={item.title} {...item} />
            ))}
          </div>
        </div>

        <div className={styles.foot}>
          <span className="mono-s">
            {site.location} · {site.timezone} · {site.languages}
          </span>
          <Button size="s" icon="copy" onClick={copyEmail}>
            {copied ? "Copied" : "Copy email"}
          </Button>
        </div>
      </div>
    </div>
  );
}
