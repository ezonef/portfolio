import { createContext } from "react";

/**
 * Where a prototype may put its own controls, next to the player's Description button.
 * undefined: no player around (admin preview). null: this screen isn't the one showing.
 */
/** How much the player scales this prototype, so a control inside can keep its real size. */
export const PrototypeScale = createContext(1);

export const PrototypeToolsSlot = createContext<HTMLElement | null | undefined>(undefined);
