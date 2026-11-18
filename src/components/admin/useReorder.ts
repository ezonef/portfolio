"use client";

import { useState, type DragEvent } from "react";

type Drag = { from: number; over: number; side: "before" | "after" };

/** Where the selected item ends up after moving `from` → `to`. */
export function follow(selected: number, from: number, to: number) {
  if (selected === from) return to;
  if (from < selected && to >= selected) return selected - 1;
  if (from > selected && to <= selected) return selected + 1;
  return selected;
}

/**
 * Drag-to-reorder with native drag and drop. Spread `itemProps(i)` on each item;
 * it gets data-dragging while it moves and data-drop="before|after" on the drop target.
 * `axis` is the list direction: "y" for the case list, "x" for the screen tabs.
 */
export function useReorder(axis: "x" | "y", onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);

  const itemProps = (i: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(i));
      setDrag({ from: i, over: i, side: "before" });
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!drag) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const r = e.currentTarget.getBoundingClientRect();
      const first = axis === "x" ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
      const side = first ? "before" : "after";
      if (drag.over !== i || drag.side !== side) setDrag({ ...drag, over: i, side });
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      if (!drag) return;
      let to = drag.side === "before" ? i : i + 1;
      if (drag.from < to) to--;
      if (to !== drag.from) onMove(drag.from, to);
      setDrag(null);
    },
    onDragEnd: () => setDrag(null),
    "data-dragging": drag?.from === i || undefined,
    "data-drop": drag && drag.over === i && drag.from !== i ? drag.side : undefined,
  });

  return itemProps;
}
