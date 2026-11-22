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
];

export const PROTOTYPE_IDS = PROTOTYPES.map((p) => p.id);
export const findPrototype = (id: string | undefined) => PROTOTYPES.find((p) => p.id === id);
