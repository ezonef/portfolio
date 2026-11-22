"use client";

import { useSyncExternalStore } from "react";
import { Hairline } from "@/components/site/Hairline/Hairline";
import { Button } from "@/components/ui/Button/Button";
import { site } from "@/data/site";
import styles from "./PhoneGate.module.css";

/** A phone, upright or on its side. Keep in step with the media query in PhoneGate.module.css */
const PHONE = "(hover: none) and (pointer: coarse) and (max-width: 760px), (hover: none) and (pointer: coarse) and (max-height: 500px)";

const subscribe = (cb: () => void) => {
  const m = window.matchMedia(PHONE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const onPhone = () => window.matchMedia(PHONE).matches && document.documentElement.dataset.view !== "desktop";

function openDesktop() {
  const root = document.documentElement;
  try {
    localStorage.setItem("view", "desktop");
    // a fresh load lets every phone browser lay the page out at desktop width
    location.reload();
    return;
  } catch {
    // no storage (private mode): switch for this page only
  }
  root.dataset.view = "desktop";
  document.querySelector('meta[name="viewport"]')?.setAttribute("content", "width=1280");
}

/**
 * The phone layout isn't ready yet: phones get this screen instead of the site,
 * and a button that opens the desktop layout (remembered on this device).
 * The CSS decides what shows, so the site never flashes first.
 */
export function PhoneGate() {
  const phone = useSyncExternalStore(subscribe, onPhone, () => false);

  return (
    <div className={styles.gate} data-phone-gate>
      <p className={`mono-s ${styles.name}`}>{site.name}</p>
      <div className={styles.content}>
        {/* the figure loads only on a phone */}
        <div className={styles.figure}>{phone && <Hairline name="layers" />}</div>
        <p className={`mono-s ${styles.eyebrow}`}>/ still being built</p>
        <h1 className={`heading-h3 ${styles.title}`}>The phone version is under construction.</h1>
        <p className={`body-m ${styles.text}`}>For now the portfolio works on a larger screen. You can still open the desktop layout here.</p>
        <Button icon="monitor" onClick={openDesktop}>
          Open desktop version
        </Button>
      </div>
    </div>
  );
}
