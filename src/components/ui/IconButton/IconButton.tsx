import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import styles from "./IconButton.module.css";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  /** Figma: Type */
  variant?: "primary" | "secondary" | "ghost";
  /** Figma: Size */
  size?: "m" | "s";
  icon: IconName;
  /** Required: icon-only buttons need an accessible name */
  label: string;
};

export function IconButton({ variant = "secondary", size = "m", icon, label, className, ...rest }: IconButtonProps) {
  const cls = [styles.base, styles[size], styles[variant], className].filter(Boolean).join(" ");
  return (
    <button type="button" aria-label={label} title={label} className={cls} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
