"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Hairline.module.css";

/**
 * A Hairline figure (github.com/lucasmarkes/hairline, MIT) on the site.
 * The engine and the figures are plain scripts in /public/hairline: the engine defines `HL`,
 * each figure ends with `hairline({ … })`. Here `hairline` only files the figure by name, and this
 * component mounts it into its own stage — so several figures can share one page.
 * Colours come from the site's tokens (see the CSS), so both themes follow the header switch.
 */

type Figure = {
  name: string;
  means: string;
  range: [number, number, number];
  tour: ([number, number] | null)[] | null;
  mount: (host: { stage: HTMLElement; svg: SVGSVGElement; read: { textContent: string } }, value: number) => { set: (v: number) => void; destroy: () => void };
};
type HLApi = {
  inject: (root: Document) => void;
  mk: (tag: string, attrs: Record<string, string>, parent: Element) => SVGSVGElement;
  tour: (stage: HTMLElement, stops: ([number, number] | null)[], onStop?: (i: number) => void) => { stop: () => void };
  LAP: ([number, number] | null)[];
};
type HairlineWindow = Window & {
  HL?: HLApi;
  hairline?: (f: Figure) => void;
  __hairlineFigures?: Map<string, Figure>;
  __hairlineWaiters?: Map<string, ((f: Figure) => void)[]>;
};

const loaded = new Map<string, Promise<void>>();
function script(src: string, module = false) {
  if (!loaded.has(src)) {
    loaded.set(
      src,
      new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = src;
        if (module) el.type = "module"; // each figure keeps its own top-level names
        el.onload = () => resolve();
        el.onerror = () => reject(new Error(`Could not load ${src}`));
        document.head.appendChild(el);
      }),
    );
  }
  return loaded.get(src)!;
}

async function figure(name: string): Promise<Figure> {
  const w = window as HairlineWindow;
  w.__hairlineFigures ??= new Map();
  w.__hairlineWaiters ??= new Map();
  w.hairline ??= (f: Figure) => {
    w.__hairlineFigures!.set(f.name, f);
    (w.__hairlineWaiters!.get(f.name) ?? []).forEach((fn) => fn(f));
    w.__hairlineWaiters!.delete(f.name);
  };
  const have = w.__hairlineFigures.get(name);
  if (have) return have;
  const ready = new Promise<Figure>((resolve) => {
    w.__hairlineWaiters!.set(name, [...(w.__hairlineWaiters!.get(name) ?? []), resolve]);
  });
  await script("/hairline/kernel.js");
  await script(`/hairline/${name}.js`, true);
  return ready;
}

type Props = {
  name: "layers" | "deck" | "ripple" | "states";
  /** Plays the figure's tour once, the first time it scrolls into view */
  autoplay?: boolean;
  className?: string;
};

export function Hairline({ name, autoplay = true, className }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState("rest");
  const [label, setLabel] = useState("");

  useEffect(() => {
    let handle: ReturnType<Figure["mount"]> | null = null;
    let lap: { stop: () => void } | null = null;
    let io: IntersectionObserver | null = null;
    let cancelled = false;
    const stage = stageRef.current!;

    figure(name)
      .then((fig) => {
        if (cancelled) return;
        const HL = (window as HairlineWindow).HL!;
        HL.inject(document);
        stage.setAttribute("data-hairline", fig.name);
        setLabel(fig.means);
        const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
        let text = "rest";
        const readOut = {
          get textContent() {
            return text;
          },
          set textContent(v: string) {
            text = v == null ? "" : String(v);
            setRead(text);
          },
        };
        handle = fig.mount({ stage, svg, read: readOut }, fig.range[1]);
        if (autoplay) {
          io = new IntersectionObserver(
            ([e]) => {
              if (!e.isIntersecting) return;
              io?.disconnect();
              lap = HL.tour(stage, fig.tour || HL.LAP);
            },
            { threshold: 0.6 },
          );
          io.observe(stage);
        }
      })
      .catch(() => {
        /* decorative: if it can't load, the box simply stays empty */
      });

    return () => {
      cancelled = true;
      io?.disconnect();
      lap?.stop();
      handle?.destroy();
      stage.replaceChildren();
    };
  }, [name, autoplay]);

  return (
    <figure className={[styles.figure, className].filter(Boolean).join(" ")}>
      <span className={`mono-xs ${styles.read}`} aria-hidden>
        {read}
      </span>
      <div ref={stageRef} className={styles.stage} role="img" aria-label={label} />
    </figure>
  );
}
