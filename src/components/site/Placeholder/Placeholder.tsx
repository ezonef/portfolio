import { Button } from "@/components/ui/Button/Button";
import { SiteFooter } from "../SiteFooter/SiteFooter";
import { SiteHeader } from "../SiteHeader/SiteHeader";

type Props = { eyebrow: string; title: string; current?: "projects" | "process" };

/** Temporary page for routes that are designed in Figma but not built yet. */
export function Placeholder({ eyebrow, title, current }: Props) {
  return (
    <>
      <SiteHeader current={current} />
      <main
        className="container"
        style={{ display: "flex", flexDirection: "column", gap: 24, paddingBlock: "112px 128px", color: "var(--color-text-secondary)" }}
      >
        <p className="mono-m">{eyebrow}</p>
        <h1 className="heading-h1" style={{ color: "var(--color-text-primary)", maxWidth: 900 }}>
          {title}
        </h1>
        <p className="body-l">This page is designed in Figma and is being built.</p>
        <div>
          <Button variant="secondary" icon="arrow-left" href="/">
            Back home
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
