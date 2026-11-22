/** The menu of a photo in a field journal. Folders open submenus; leaves do something. */
export type IconName = "open" | "rename" | "copy" | "folder" | "share" | "link" | "user" | "download" | "archive" | "trash" | "star";

export type MenuItem = {
  id: string;
  label: string;
  icon?: IconName;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  /** A line above this item */
  separated?: boolean;
  children?: MenuItem[];
};

const folder = (id: string, label: string, children?: MenuItem[], extra: Partial<MenuItem> = {}): MenuItem => ({
  id,
  label,
  icon: "folder",
  children,
  ...extra,
});

const LONG = "Maximilian’s shared folder for the spring field shoot — selects only";

/** The tree, with the worst-case toggles applied */
export function buildMenu({ longList, longNames }: { longList: boolean; longNames: boolean }): MenuItem[] {
  const name = (short: string) => (longNames ? `${short} · ${LONG}` : short);

  const moodboards = folder("moodboards", "Moodboards", [
    folder("mb-flowers", name("Flowers")),
    folder("mb-light", "Light"),
    folder("mb-texture", "Texture"),
    folder("mb-motion", "Motion blur"),
  ]);
  const field = folder("field", name("Field notes"), [
    folder("fn-spring", "Spring 2026"),
    folder("fn-summer", "Summer 2026"),
    folder("fn-archive", "Archive", [folder("ar-2025", "2025"), folder("ar-2024", "2024"), folder("ar-2023", "2023", undefined, { disabled: true })]),
  ]);
  const extra = longList
    ? Array.from({ length: 28 }, (_, i) => folder(`roll-${i + 1}`, name(`Roll ${String(i + 1).padStart(2, "0")}`)))
    : [];

  return [
    { id: "open", label: "Open", icon: "open", shortcut: "⌘O" },
    { id: "rename", label: "Rename", icon: "rename", shortcut: "⌘R" },
    { id: "duplicate", label: "Duplicate", icon: "copy", shortcut: "⌘D" },
    {
      id: "move",
      label: "Move to",
      icon: "folder",
      separated: true,
      children: [folder("inbox", "Inbox"), field, moodboards, folder("team", name("Shared with team")), ...extra],
    },
    {
      id: "share",
      label: "Share",
      icon: "share",
      children: [
        { id: "link", label: "Copy link", icon: "link", shortcut: "⌘L" },
        { id: "invite", label: "Invite people…", icon: "user" },
        {
          id: "export",
          label: "Export as",
          icon: "download",
          children: [
            { id: "png", label: "PNG" },
            { id: "jpg", label: "JPG · 80%" },
            { id: "pdf", label: "PDF contact sheet" },
          ],
        },
      ],
    },
    { id: "favourite", label: "Add to favourites", icon: "star", disabled: true },
    { id: "archive", label: "Archive", icon: "archive", separated: true },
    { id: "delete", label: "Delete", icon: "trash", shortcut: "⌫", danger: true },
  ];
}

/** Items of the level opened by `chain` (chain[0] is the folder opened from the root, …) */
export function levelsOf(root: MenuItem[], chain: string[]): MenuItem[][] {
  const levels = [root];
  for (const id of chain) {
    const next = levels[levels.length - 1].find((i) => i.id === id)?.children;
    if (!next) break;
    levels.push(next);
  }
  return levels;
}

/** Folder ids from the root down to an item — for the "Moved to …" message */
export function trail(root: MenuItem[], chain: string[], id: string): string[] {
  const levels = levelsOf(root, chain);
  const names = chain.slice(0, levels.length - 1).map((c, i) => levels[i].find((x) => x.id === c)!.label);
  const last = levels[levels.length - 1].find((x) => x.id === id);
  return last ? [...names, last.label] : names;
}
