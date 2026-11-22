import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./NavLink.module.css";

type Common = {
  /** Figma: State=Active (current page or open menu) */
  active?: boolean;
  /** Figma: _nav-link → Show caret */
  caret?: boolean;
  children: ReactNode;
};

type NavLinkProps = Common & { href: string };

export function NavLink({ href, active, caret, children }: NavLinkProps) {
  // a file (CV.pdf) isn't a route: the router can't prefetch or open it
  if (/\.[a-z0-9]+$/i.test(href)) {
    return (
      <a href={href} className={cls(active)}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cls(active)}>
      {children}
      {caret && <Icon name="chevron-down" className={styles.caret} />}
    </Link>
  );
}

/** Same look, but a <button> — for items that open something (modal, menu) instead of navigating. */
export const NavButton = forwardRef<HTMLButtonElement, Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">>(
  function NavButton({ active, caret, children, ...rest }, ref) {
    return (
      <button ref={ref} type="button" className={cls(active)} {...rest}>
        {children}
        {caret && <Icon name="chevron-down" className={styles.caret} />}
      </button>
    );
  },
);

function cls(active?: boolean) {
  return [styles.link, active && styles.active].filter(Boolean).join(" ");
}
