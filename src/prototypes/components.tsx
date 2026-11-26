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
  "spike-tasks": dynamic(() => import("./spike").then((m) => m.TaskScreen)),
  "spike-buying": dynamic(() => import("./spike").then((m) => m.BuyingScreen)),
  "spike-automation": dynamic(() => import("./spike").then((m) => m.AutomationScreen)),
  "spike-hiring": dynamic(() => import("./spike").then((m) => m.HiringScreen)),
  "spike-docs": dynamic(() => import("./spike").then((m) => m.DocsScreen)),
  "spike-search": dynamic(() => import("./spike").then((m) => m.SearchScreen)),
  "nls-table": dynamic(() => import("./nls").then((m) => m.TableScreen)),
  "nls-table-settings": dynamic(() => import("./nls").then((m) => m.SettingsScreen)),
  "nls-filters": dynamic(() => import("./nls").then((m) => m.FiltersScreen)),
  "nls-onboarding": dynamic(() => import("./nls").then((m) => m.OnboardingScreen)),
  "nls-dashboard": dynamic(() => import("./nls").then((m) => m.DashboardScreen)),
  "nls-agent": dynamic(() => import("./nls").then((m) => m.Agent)),
  "portfolio-pipeline": dynamic(() => import("./portfolio")),
};
