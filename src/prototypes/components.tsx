"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * The prototypes themselves, loaded only when a screen shows one (each is its own chunk).
 * Keys match the ids in ./registry.ts.
 */
export const PROTOTYPE_COMPONENTS: Record<string, ComponentType> = {
  "orders-table": dynamic(() => import("./orders-table")),
  "dropdown-flip": dynamic(() => import("./dropdown").then((m) => m.Flip)),
  "dropdown-submenus": dynamic(() => import("./dropdown").then((m) => m.Submenus)),
  "dropdown-tight": dynamic(() => import("./dropdown").then((m) => m.Tight)),
  "spike-files": dynamic(() => import("./spike").then((m) => m.Files)),
  "spike-anatomy": dynamic(() => import("./spike").then((m) => m.Anatomy)),
  "spike-tokens": dynamic(() => import("./spike").then((m) => m.Tokens)),
};
