"use client";

import type { MouseEvent } from "react";
import { Button, type ButtonSize, type ButtonType } from "@/components/ui/Button/Button";
import type { IconName } from "@/components/ui/Icon/Icon";
import { smoothScrollTo } from "@/lib/smoothScroll";

type Props = { to: string; children: React.ReactNode; icon?: IconName; variant?: ButtonType; size?: ButtonSize };

/** Button that glides to a section on this page (still a real #link without JS). */
export function ScrollButton({ to, ...rest }: Props) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(to);
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    smoothScrollTo(el);
    history.replaceState(null, "", `#${to}`);
  };
  return <Button href={`#${to}`} onClick={onClick} {...rest} />;
}
