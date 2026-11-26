/**
 * Code prototypes that a case screen can show instead of an image.
 * Only names and sizes live here (no components), so the admin's server-side validation can import it.
 *
 * To add one:
 *   1. Make a folder src/prototypes/<id>/ with an index.tsx whose default export is the prototype.
 *   2. Add it below (id, title, the size it was designed at).
 *   3. Add its import to src/prototypes/components.tsx.
 * It then appears in the admin: Screen → Code.
 */
export type PrototypeMeta = {
  id: string;
  title: string;
  description: string;
  /** The size it is designed at; the case page scales it down to fit the player, keeping the layout */
  width: number;
  height: number;
  /** Fills the whole screen box edge to edge and reflows to its shape (width sets the scale of the text) */
  fill?: boolean;
};

export const PROTOTYPES: PrototypeMeta[] = [
  {
    id: "orders-table",
    title: "Orders table (example)",
    description: "Search, status filters, row selection and an empty state, on test data",
    width: 1280,
    height: 800,
  },
  {
    id: "dropdown-flip",
    title: "Dropdown · flips to fit",
    description: "A draggable dropdown on a photo: opens down, up near the bottom, lines up to the right edge, with room guides",
    width: 1116,
    height: 752,
    fill: true,
  },
  {
    id: "dropdown-submenus",
    title: "Dropdown · nested submenus",
    description: "Folders open popovers beside the menu; the chain turns back at the edge; the safe triangle is drawn",
    width: 1116,
    height: 752,
    fill: true,
  },
  {
    id: "dropdown-tight",
    title: "Dropdown · no room",
    description: "Corner, long list, long names: lists cap their height and scroll, labels truncate",
    width: 1116,
    height: 752,
    fill: true,
  },
  {
    id: "spike-files",
    title: "Spike · file architecture",
    description: "The library chain and one change shipped through status folders (PRO) or branches (ORG)",
    width: 960,
    height: 647,
    fill: true,
  },
  {
    id: "spike-anatomy",
    title: "Spike · button anatomy",
    description: "A private primitive with slots, a public Button with Type, Size and State, geometry drawn on top",
    width: 960,
    height: 647,
    fill: true,
  },
  {
    id: "spike-tokens",
    title: "Spike · tokens",
    description: "Rebind a semantic token or swap the palette and the Spike campaign screen updates",
    width: 960,
    height: 647,
    fill: true,
  },
  {
    id: "spike-tasks",
    title: "Spike · task manager",
    description: "A launch task linked to buying, automation, hiring and documents",
    width: 1120,
    height: 755,
    fill: true,
  },
  {
    id: "spike-buying",
    title: "Spike · buying",
    description: "Delivery table with live totals, sorting, filters and linked work",
    width: 1120,
    height: 755,
    fill: true,
  },
  {
    id: "spike-automation",
    title: "Spike · automation",
    description: "A node canvas: drag cards, pan, zoom and edit each step",
    width: 1120,
    height: 755,
    fill: true,
  },
  {
    id: "spike-hiring",
    title: "Spike · hiring",
    description: "Drag candidates through a pipeline and open their details",
    width: 1120,
    height: 755,
    fill: true,
  },
  {
    id: "spike-docs",
    title: "Spike · documents",
    description: "Side-by-side documents with links into every product",
    width: 1120,
    height: 755,
    fill: true,
  },
  {
    id: "spike-search",
    title: "Spike · global search",
    description: "A Ctrl+K modal that searches all five products with preview and keyboard control",
    width: 1120,
    height: 755,
    fill: true,
  },
  {
    id: "nls-table",
    title: "NLS · operations table",
    description: "Accounts, bundles, campaigns, ad sets and ads in one tree, with row selection and bulk actions",
    width: 1728,
    height: 1117,
    fill: true,
  },
  {
    id: "nls-table-settings",
    title: "NLS · column settings",
    description: "Sort, group, move, automate or hide any column from its header",
    width: 1728,
    height: 1117,
    fill: true,
  },
  {
    id: "nls-filters",
    title: "NLS · filter builder",
    description: "Rule builder with search, saved filters and a text prompt that updates the table",
    width: 1728,
    height: 1117,
    fill: true,
  },
  {
    id: "nls-onboarding",
    title: "NLS · onboarding",
    description: "Task list and spotlight tour that walks through the real interface",
    width: 1728,
    height: 1117,
    fill: true,
  },
  {
    id: "nls-dashboard",
    title: "NLS · custom dashboard",
    description: "Move widgets live by the grip, resize by any edge, duplicate, delete and add",
    width: 1728,
    height: 1117,
    fill: true,
  },
  {
    id: "nls-agent",
    title: "NLS · AI action",
    description: "An answer with sources, a proposed change, approval, undo, permissions and an audit log",
    width: 960,
    height: 647,
    fill: true,
  },
  {
    id: "portfolio-pipeline",
    title: "Portfolio · Figma to production",
    description: "The path from variables to a published case, with the decisions made over AI output",
    width: 960,
    height: 647,
    fill: true,
  },
];

export const PROTOTYPE_IDS = PROTOTYPES.map((p) => p.id);
export const findPrototype = (id: string | undefined) => PROTOTYPES.find((p) => p.id === id);
