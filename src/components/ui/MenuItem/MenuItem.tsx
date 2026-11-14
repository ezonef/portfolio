import { Icon, type IconName } from "../Icon/Icon";
import styles from "./MenuItem.module.css";

type MenuItemProps = {
  href: string;
  icon: IconName;
  title: string;
  /** Figma: Show caption */
  caption?: string;
  /** Figma: Show meta */
  meta?: string;
  /** Figma: State=Selected — the recommended item, at most one per menu */
  selected?: boolean;
  external?: boolean;
  onClick?: () => void;
};

export function MenuItem({ href, icon, title, caption, meta, selected, external, onClick }: MenuItemProps) {
  return (
    <a
      href={href}
      className={[styles.item, selected && styles.selected].filter(Boolean).join(" ")}
      onClick={onClick}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <span className={styles.tile}>
        <Icon name={icon} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {caption && <span className={styles.caption}>{caption}</span>}
      </span>
      {meta && <span className={styles.meta}>{meta}</span>}
    </a>
  );
}
