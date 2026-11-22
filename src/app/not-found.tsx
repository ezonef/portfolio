import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { AsciiBand } from "@/components/site/AsciiBand/AsciiBand";
import { CipherText } from "@/components/site/CipherText/CipherText";
import { SiteFooter } from "@/components/site/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader/SiteHeader";
import { Button } from "@/components/ui/Button/Button";
import { HERO_ASCII } from "@/data/ascii";
import { ASCII_404 } from "@/data/ascii-404";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Page not found — Mykyta Sharapaniuk" };

const COLS = Math.max(...ASCII_404.split("\n").map((l) => l.length));

/** Figma: 404 · 1440 — the big ASCII 404, a short line, the way back, then the ASCII band and footer */
export default function NotFound() {
  return (
    <>
      <SiteHeader current="home" />
      <main className={styles.page}>
        <section className={styles.content}>
          <pre className={styles.art} style={{ "--cols": COLS } as CSSProperties} aria-hidden>
            {ASCII_404}
          </pre>
          <h1 className={`heading-h2 ${styles.title}`}>
            <span className="visually-hidden">404 — </span>
            <CipherText lines={["This page drifted off the grid."]} />
          </h1>
          <p className={`mono-m ${styles.text}`}>The link is old or mistyped. The work is still here.</p>
          <div className={styles.actions}>
            <Button href="/" icon="arrow-left">
              Back home
            </Button>
            <Button variant="secondary" href="/projects">
              See work
            </Button>
          </div>
        </section>
        <AsciiBand art={HERO_ASCII} tone="tertiary" />
      </main>
      <SiteFooter />
    </>
  );
}
