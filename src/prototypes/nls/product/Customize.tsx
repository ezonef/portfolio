"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Checkbox, Layer, dragPanel } from "./ui";
import styles from "./product.module.css";

export type Theme = "light" | "dark" | "auto";

// The theme is one choice for every NLS screen on the page, and it is remembered in this browser
const THEME_KEY = "nls-theme";
let sharedTheme: Theme | null = null;
const listeners = new Set<(t: Theme) => void>();
const readTheme = (): Theme => {
  if (sharedTheme) return sharedTheme;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "auto") return (sharedTheme = saved);
  } catch {}
  return "light";
};
/** The product theme, shared by every screen that uses it */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setLocal] = useState<Theme>("light");
  useEffect(() => {
    setLocal(readTheme());
    listeners.add(setLocal);
    return () => void listeners.delete(setLocal);
  }, []);
  const set = (t: Theme) => {
    sharedTheme = t;
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
    listeners.forEach((l) => l(t));
  };
  return [theme, set];
}
export type MenuItem = { id: string; label: string; icon: ReactNode };

/** Small drawing of the app in a theme: a rail, a panel and a few lines */
function ThemeArt({ tone }: { tone: "light" | "dark" }) {
  return (
    <span className={styles.themeArt} data-tone={tone}>
      <i />
      <i />
      <i />
      <b>
        <em />
        <em />
        <em />
      </b>
    </span>
  );
}

/**
 * "More" in the rail opens this: which sections the rail shows and the theme of the whole product.
 */
export function Customize({
  items,
  hidden,
  setHidden,
  theme,
  setTheme,
  onClose,
}: {
  items: MenuItem[];
  hidden: Set<string>;
  setHidden: (next: Set<string>) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHidden(next);
  };

  return (
    <Layer onClose={onClose}>
      <section className={styles.customize} role="dialog" aria-label="Customize menu" data-drag-panel>
        <header className={styles.customizeHead} onPointerDown={dragPanel}>
          <div>
            <h3>Customize menu</h3>
            <p>Choose menu sections and theme</p>
          </div>
          <button type="button" className={styles.iconBtn} aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className={styles.customizeBody}>
          <ul className={styles.customizeList}>
            {items.map((it, i) => {
              // The first section always stays: the rail can't be emptied
              const locked = i === 0;
              return (
                <li key={it.id}>
                  <label data-locked={locked || undefined}>
                    <Checkbox state={locked || !hidden.has(it.id)} label={it.label} onChange={() => !locked && toggle(it.id)} />
                    {it.icon}
                    <span>{it.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <p className={styles.customizeLabel}>Theme</p>
          <div className={styles.choiceRow}>
            {(["light", "dark", "auto"] as const).map((t) => (
              <button key={t} type="button" className={styles.choice} aria-pressed={theme === t} onClick={() => setTheme(t)}>
                {t === "auto" ? (
                  <span className={styles.themeSplit}>
                    <ThemeArt tone="light" />
                    <ThemeArt tone="dark" />
                  </span>
                ) : (
                  <ThemeArt tone={t} />
                )}
                {t === "light" ? "Light" : t === "dark" ? "Dark" : "System"}
              </button>
            ))}
          </div>
        </div>
      </section>
    </Layer>
  );
}
