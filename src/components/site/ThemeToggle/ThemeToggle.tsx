"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/IconButton/IconButton";

type Theme = "light" | "dark";

const systemTheme = (): Theme => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/** Light / dark switch. Starts from the system setting; a click pins the choice (saved in this browser). */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const pinned = document.documentElement.dataset.theme as Theme | undefined;
    setTheme(pinned ?? systemTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode — the choice just isn't remembered */
    }
    setTheme(next);
  };

  // Until mounted we don't know the theme — render the button anyway so the header doesn't jump
  const dark = theme === "dark";
  return (
    <IconButton
      variant="ghost"
      size="s"
      icon={dark ? "sun" : "moon"}
      label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      className={className}
    />
  );
}
