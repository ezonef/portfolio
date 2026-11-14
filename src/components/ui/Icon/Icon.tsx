import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Copy,
  FileText,
  LayoutGrid,
  Link,
  List,
  Mail,
  Menu,
  Monitor,
  Search,
  Send,
  Smartphone,
  X,
  type LucideProps,
} from "lucide-react";

// Same names as the Figma icon components (Icon/arrow-right → "arrow-right").
const icons = {
  "arrow-down": ArrowDown,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  calendar: Calendar,
  "chevron-down": ChevronDown,
  copy: Copy,
  "file-text": FileText,
  "layout-grid": LayoutGrid,
  link: Link,
  list: List,
  mail: Mail,
  menu: Menu,
  monitor: Monitor,
  search: Search,
  send: Send,
  smartphone: Smartphone,
  x: X,
};

export type IconName = keyof typeof icons;

type IconProps = Omit<LucideProps, "ref"> & { name: IconName };

/** 16px stroke icon. Colour comes from `currentColor`, so the parent decides it. */
export function Icon({ name, size = 16, strokeWidth = 1.5, ...rest }: IconProps) {
  const Glyph = icons[name];
  return <Glyph size={size} strokeWidth={strokeWidth} aria-hidden focusable={false} {...rest} />;
}
