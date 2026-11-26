"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const THRESHOLD = 4;

/**
 * Reorder table columns by dragging their headers. Columns swap live, so it
 * needs no ghost element and stays correct inside a scaled prototype frame.
 */
export function useColumnDrag<K extends string>(setOrder: (update: (order: K[]) => K[]) => void) {
  const [dragging, setDragging] = useState<K | null>(null);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);

  const start = (e: ReactPointerEvent<HTMLTableCellElement>, key: K) => {
    if (e.button !== 0 || e.pointerType === "touch") return;
    const row = e.currentTarget.parentElement;
    if (!row) return;
    const startX = e.clientX;
    const pointerId = e.pointerId;
    let active = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!active) {
        if (Math.abs(ev.clientX - startX) < THRESHOLD) return;
        active = true;
        setDragging(key);
      }
      const heads = [...row.querySelectorAll<HTMLElement>("th[data-col-key]")];
      const from = heads.findIndex((h) => h.dataset.colKey === key);
      const to = heads.findIndex((h) => {
        const r = h.getBoundingClientRect();
        return ev.clientX >= r.left && ev.clientX <= r.right;
      });
      if (from < 0 || to < 0 || from === to) return;
      // Swap only once the pointer would still be inside the column afterwards, so uneven widths don't flicker.
      const width = heads[from].getBoundingClientRect().width;
      const hit = heads[to].getBoundingClientRect();
      if (to > from ? ev.clientX < hit.right - width : ev.clientX > hit.left + width) return;
      const target = heads[to].dataset.colKey as K;
      setOrder((order) => {
        const next = order.filter((k) => k !== key);
        const at = order.indexOf(target);
        if (at < 0 || !order.includes(key)) return order;
        next.splice(at, 0, key);
        return next;
      });
    };
    const finish = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      stop.current?.();
      if (!active) return;
      // The click that ends a drag must not sort or open the column menu.
      const swallow = (c: MouseEvent) => { c.stopPropagation(); c.preventDefault(); };
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    };

    stop.current?.();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    stop.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      stop.current = null;
      setDragging(null);
    };
  };

  return {
    head: (key: K) => ({
      "data-col-key": key,
      "data-col-drag": dragging === key || undefined,
      onPointerDown: (e: ReactPointerEvent<HTMLTableCellElement>) => start(e, key),
    }),
    cell: (key: K) => ({ "data-col-drag": dragging === key || undefined }),
  };
}
