/**
 * Where a menu goes. Pure functions, no DOM: give them the anchor, the menu's natural size
 * and the area it must stay inside, get back a position.
 *
 * Rules, in order:
 *   1. Prefer the natural side (a menu drops down; a submenu opens to the right).
 *   2. While a menu is open, keep its side for as long as it still fits: it never jumps under the cursor.
 *   3. If the natural side doesn't fit, flip to the opposite one.
 *   4. If neither fits, take the roomier side and cap the height: the list scrolls inside.
 *   5. Along the other axis, line up with the anchor; slide back in if that would cross the edge.
 */
export type Rect = { x: number; y: number; w: number; h: number };
export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "end" | "shifted";

export type Placement = {
  x: number;
  y: number;
  /** Set when the menu is taller than the room it has: it scrolls */
  maxH?: number;
  side: Side;
  align: Align;
  /** Grows from the corner nearest the anchor */
  origin: string;
  /** Room on each side of the anchor along the flip axis, for the guides */
  room: { before: number; after: number };
  flipped: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** The root menu, under or over its button */
export function placeMenu(anchor: Rect, size: { w: number; h: number }, bound: Rect, keep?: Side, gap = 8): Placement {
  const below = bound.y + bound.h - (anchor.y + anchor.h) - gap;
  const above = anchor.y - bound.y - gap;
  const fitsBelow = size.h <= below;
  const fitsAbove = size.h <= above;

  let side: Side;
  if (keep === "top" && fitsAbove) side = "top";
  else if (keep === "bottom" && fitsBelow) side = "bottom";
  else if (fitsBelow) side = "bottom";
  else if (fitsAbove) side = "top";
  else side = below >= above ? "bottom" : "top";

  const room = side === "bottom" ? below : above;
  const h = Math.min(size.h, room);
  const y = side === "bottom" ? anchor.y + anchor.h + gap : anchor.y - gap - h;

  // line up the left edges; at the right edge line up the right edges; if even that crosses, slide
  const right = bound.x + bound.w;
  let x = anchor.x;
  let align: Align = "start";
  if (x + size.w > right) {
    x = anchor.x + anchor.w - size.w;
    align = "end";
  }
  if (x < bound.x || x + size.w > right) {
    x = clamp(x, bound.x, right - size.w);
    align = "shifted";
  }

  return {
    x,
    y,
    maxH: h < size.h ? h : undefined,
    side,
    align,
    origin: `${align === "end" ? "right" : "left"} ${side === "bottom" ? "top" : "bottom"}`,
    room: { before: above, after: below },
    flipped: side === "top",
  };
}

/**
 * A submenu, beside its parent menu, its first item level with the folder that opened it.
 * `prefer` is the side the parent opened to: a chain keeps going one way instead of zig-zagging.
 */
export function placeSubmenu(
  parent: Rect,
  item: Rect,
  size: { w: number; h: number },
  bound: Rect,
  prefer: "left" | "right" = "right",
  keep?: Side,
  gap = 4,
  inset = 6,
): Placement {
  const rightRoom = bound.x + bound.w - (parent.x + parent.w) - gap;
  const leftRoom = parent.x - bound.x - gap;
  const fits = { right: size.w <= rightRoom, left: size.w <= leftRoom };
  const other = prefer === "right" ? "left" : "right";

  let side: "left" | "right";
  if ((keep === "left" || keep === "right") && fits[keep]) side = keep;
  else if (fits[prefer]) side = prefer;
  else if (fits[other]) side = other;
  else side = rightRoom >= leftRoom ? "right" : "left";

  let x = side === "right" ? parent.x + parent.w + gap : parent.x - gap - size.w;
  // no room either side: it overlaps the parent rather than leaving the screen
  x = clamp(x, bound.x, bound.x + bound.w - size.w);

  const h = Math.min(size.h, bound.h);
  let y = item.y - inset;
  let align: Align = "start";
  if (y + h > bound.y + bound.h) {
    y = bound.y + bound.h - h;
    align = "shifted";
  }
  if (y < bound.y) {
    y = bound.y;
    align = "shifted";
  }

  return {
    x,
    y,
    maxH: h < size.h ? h : undefined,
    side,
    align,
    origin: `${side === "right" ? "left" : "right"} ${align === "start" ? "top" : "center"}`,
    room: { before: leftRoom, after: rightRoom },
    flipped: side !== "right",
  };
}

/** Is point p inside triangle abc — the "safe area" between the pointer and an open submenu */
export function inTriangle(p: [number, number], a: [number, number], b: [number, number], c: [number, number]) {
  const s = (p1: [number, number], p2: [number, number], p3: [number, number]) =>
    (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = s(p, a, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
