import { AsciiBand } from "@/components/site/AsciiBand/AsciiBand";
import { CipherText } from "@/components/site/CipherText/CipherText";
import { SelectedWork } from "@/components/site/SelectedWork/SelectedWork";
import { SiteFooter } from "@/components/site/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader/SiteHeader";
import { ScrollButton } from "@/components/site/ScrollButton/ScrollButton";
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
            <CipherText lines={["Complex products,", "made simple to use."]} repeat={9000} />
          </h1>
          <p className={`body-l ${styles.lead}`}>
            Design systems, admin panels and iOS apps. I map the flows, build the components and polish every state.
          </p>
          <div className={styles.actions}>
            <ScrollButton icon="arrow-down" to="work">
              See work
            </ScrollButton>
            <Button variant="secondary" href="/cv.pdf">
              Download CV
            </Button>
            <Button variant="ghost" href="/process" icon="arrow-right">
              View my process
            </Button>
          </div>
        </section>

        <AsciiBand art={HERO_ASCII} tone="tertiary" reveal />
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
