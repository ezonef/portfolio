"use client";

import { DropdownLab } from "./DropdownLab";

/** Three starting points of the same lab, one per case screen (ids in ../registry.ts) */

/** Closed, low on the screen: open it and it goes up. Drag it anywhere. */
export function Flip() {
  return <DropdownLab preset={{ name: "flip", at: { x: 0.5, y: 0.86 }, guides: true }} />;
}

/** Top-right, two folders deep: the chain turns left at the edge, the safe triangle is drawn. */
export function Submenus() {
  return <DropdownLab preset={{ name: "submenus", at: { x: 1, y: 0.1 }, open: true, chain: ["move", "field"], safe: true }} />;
}

/** Bottom-right corner (just above the player’s Description button), a long list with long names: lists cap their height and scroll. */
export function Tight() {
  return (
    <DropdownLab preset={{ name: "tight", at: { x: 1, y: 0.88 }, open: true, chain: ["move"], guides: true, longList: true, longNames: true }} />
  );
}
