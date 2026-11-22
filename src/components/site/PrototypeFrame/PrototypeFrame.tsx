"use client";

import { useEffect, useRef, useState } from "react";
import { findPrototype } from "@/prototypes/registry";
import { PROTOTYPE_COMPONENTS } from "@/prototypes/components";
import { PrototypeScale } from "@/prototypes/tools-slot";
import styles from "./PrototypeFrame.module.css";

/**
 * A live code prototype inside a screen box. It renders at the size it was designed at
 * and is scaled down to fit (like an image with object-fit: contain), so its layout never reflows.
 * Clicks, typing and scrolling inside it work as in the real thing.
 */
export function PrototypeFrame({ id, label }: { id: string; label?: string }) {
  const meta = findPrototype(id);
  const Proto = PROTOTYPE_COMPONENTS[id];
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0, w: 0, h: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el || !meta) return;
    const measure = () => {
      if (meta.fill) {
        // edge to edge: scaled by width, and as tall as the box at that scale
        const scale = el.clientWidth / meta.width;
        setFit({ scale, w: meta.width, h: el.clientHeight / scale });
      } else setFit({ scale: Math.min(el.clientWidth / meta.width, el.clientHeight / meta.height), w: meta.width, h: meta.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [meta]);

  if (!meta || !Proto) return <div className={`mono-xs ${styles.missing}`}>Unknown prototype “{id}”</div>;

  return (
    <div ref={box} className={styles.box}>
      <div
        className={styles.device}
        data-fill={meta.fill || undefined}
        role="group"
        aria-label={label ?? meta.title}
        style={{
          width: fit.w || meta.width,
          height: fit.h || meta.height,
          transform: `translate(-50%, -50%) scale(${fit.scale})`,
          opacity: fit.scale ? 1 : 0,
        }}
      >
        <PrototypeScale.Provider value={fit.scale || 1}>
          <Proto />
        </PrototypeScale.Provider>
      </div>
    </div>
  );
}
