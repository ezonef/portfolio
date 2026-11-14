import { SelectedWork } from "@/components/site/SelectedWork/SelectedWork";
import { SiteFooter } from "@/components/site/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader/SiteHeader";
import { Button } from "@/components/ui/Button/Button";
import { HERO_ASCII } from "@/data/ascii";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <SiteHeader current="home" />

      <main>
        <section className={`container ${styles.hero}`}>
          <p className="mono-m">/ product designer — 2023 → now</p>
          <h1 className="display-l">
            Complex products,
            <br />
            made simple to use.
          </h1>
          <p className={`body-l ${styles.lead}`}>
            Design systems, admin panels and iOS apps. I map the flows, build the components and polish every state.
          </p>
          <div className={styles.actions}>
            <Button icon="arrow-down" href="#work">
              See work
            </Button>
            <Button variant="secondary" href="/cv.pdf">
              Download CV
            </Button>
            <Button variant="ghost" icon="arrow-right" href="/process">
              Read my process
            </Button>
          </div>
        </section>

        <div className={styles.band} aria-hidden>
          <pre className={`mono-ascii ${styles.ascii}`}>{HERO_ASCII}</pre>
        </div>
        <div className={`container mono-xs ${styles.coords}`}>
          <span>52.2297° N · 21.0122° E</span>
          <span>scroll ↓</span>
          <span>v.2026</span>
        </div>

        <SelectedWork />
      </main>

      <SiteFooter />
    </>
  );
}
