import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import styles from "./Chip.module.css";

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  /** Figma: State=Selected */
  selected?: boolean;
  /** Figma: _chip → Count (Show count = count is set) */
  count?: number;
  /** Figma: _chip → Icon (Show icon = icon is set) */
  icon?: IconName;
  /** outline (default) or soft — filled, borderless (Projects modal) */
  appearance?: "outline" | "soft";
  children: ReactNode;
};

/** Filter chip. In a group exactly one is selected; `aria-pressed` tells screen readers. */
export function Chip({ selected = false, count, icon, appearance = "outline", children, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[styles.chip, appearance === "soft" && styles.soft, selected && styles.selected, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {icon && <Icon name={icon} className={styles.icon} />}
      <span>{children}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </button>
  );
}
