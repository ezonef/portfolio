import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import styles from "./Button.module.css";

export type ButtonType = "primary" | "secondary" | "ghost" | "inverse" | "soft";
export type ButtonSize = "m" | "s";

type Common = {
  /** Figma: Type */
  variant?: ButtonType;
  /** Figma: Size */
  size?: ButtonSize;
  /** Figma: _button → Icon (Show icon = icon is set) */
  icon?: IconName;
  children: ReactNode;
  className?: string;
};

type AsButton = Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className"> & { href?: undefined };
type AsLink = Common & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & { href: string };

export type ButtonProps = AsButton | AsLink;

/**
 * Button — public component. Geometry lives in the private `.base` class (= Figma `_button`),
 * appearance comes from the variant class (= Figma Type) and component tokens.
 * Renders <a> when `href` is passed, otherwise <button>.
 */
export function Button({ variant = "primary", size = "m", icon, children, className, ...rest }: ButtonProps) {
  const cls = [styles.base, styles[size], styles[variant], className].filter(Boolean).join(" ");
  const content = (
    <>
      <span>{children}</span>
      {icon && <Icon name={icon} />}
    </>
  );

  if ("href" in rest && rest.href) {
    return (
      <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
}
