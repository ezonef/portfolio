"use client";

import { useRef, useState } from "react";
import { Step } from "@/components/ui/Step/Step";
import { isColor } from "@/data/case-types";
import { ColorPicker } from "./ColorPicker";
import { ImageDrop } from "./ImageDrop";
import styles from "./BackdropField.module.css";

/** Neutral picks from the site palette — anything else comes from the picker */
const PRESETS = ["#eeede8", "#e2e0d8", "#cfcdc5", "#9a9a94", "#4a4a46", "#242422", "#111111"];
const DEFAULT_COLOR = "#e2e0d8";

type Props = {
  slug: string;
  /** Image path, "#rrggbb", or "" */
  value: string;
  onChange: (value: string) => void;
};

/**
 * A screen's background: Image (upload, like before) or Color (picker + hex + presets).
 * The switch is the same Step tabs as the rest of the editor. Flipping back and forth loses nothing.
 */
export function BackdropField({ slug, value, onChange }: Props) {
  const [mode, setMode] = useState<"image" | "color">(isColor(value) ? "color" : "image");
  const last = useRef({ image: isColor(value) ? "" : value, color: isColor(value) ? value : DEFAULT_COLOR });
  const color = isColor(value) ? value : last.current.color;
  const [hex, setHex] = useState(color);

  const pick = (m: "image" | "color") => {
    if (m === mode) return;
    if (mode === "image") last.current.image = value;
    else last.current.color = value || last.current.color;
    setMode(m);
    if (m === "color") setHex(last.current.color);
    onChange(m === "color" ? last.current.color : last.current.image);
  };

  const setColor = (c: string) => {
    setHex(c);
    if (isColor(c)) onChange(c.toLowerCase());
  };

  return (
    <div className={styles.field}>
      <div className={styles.modes} role="group" aria-label="Background type">
        <Step number="01" title="Image" active={mode === "image"} onClick={() => pick("image")} />
        <Step number="02" title="Color" active={mode === "color"} onClick={() => pick("color")} />
      </div>

      {mode === "image" ? (
        <ImageDrop compact slug={slug} value={value} emptyText="Add a background" onClear={() => onChange("")} onChange={onChange} />
      ) : (
        <>
          <ColorPicker value={color} onChange={setColor} />
          <div className={styles.row}>
            <span className={styles.chip} style={{ background: color }} aria-hidden />
            <input
              className={`mono-s ${styles.hex}`}
              value={hex}
              maxLength={7}
              spellCheck={false}
              aria-label="Hex colour"
              data-invalid={!isColor(hex) || undefined}
              onChange={(e) => setColor(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
              onBlur={() => setHex(color)}
            />
            <div className={styles.presets}>
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={styles.preset}
                  style={{ background: c }}
                  aria-label={c}
                  aria-pressed={color.toLowerCase() === c}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
