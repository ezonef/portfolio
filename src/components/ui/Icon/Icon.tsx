import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  LayoutGrid,
  Link,
  List,
  Mail,
  Menu,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Search,
  Send,
  Smartphone,
  Sun,
  Trash2,
  Image,
  Palette,
  Upload,
  X,
  type LucideProps,
} from "lucide-react";

// Same names as the Figma icon components (Icon/arrow-right → "arrow-right").
const icons = {
  "arrow-down": ArrowDown,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-up-right": ArrowUpRight,
  calendar: Calendar,
  check: Check,
  "chevron-down": ChevronDown,
  "circle-help": CircleHelp,
  copy: Copy,
  eye: Eye,
  "eye-off": EyeOff,
  "file-text": FileText,
  image: Image,
  "layout-grid": LayoutGrid,
  link: Link,
  list: List,
  mail: Mail,
  menu: Menu,
  monitor: Monitor,
  moon: Moon,
  palette: Palette,
  pencil: Pencil,
  plus: Plus,
  search: Search,
  send: Send,
  smartphone: Smartphone,
  sun: Sun,
  "trash-2": Trash2,
  upload: Upload,
  x: X,
};

export type IconName = keyof typeof icons;

type IconProps = Omit<LucideProps, "ref"> & { name: IconName };

/** 16px stroke icon. Colour comes from `currentColor`, so the parent decides it. */
export function Icon({ name, size = 16, strokeWidth = 1.5, ...rest }: IconProps) {
  const Glyph = icons[name];
  return <Glyph size={size} strokeWidth={strokeWidth} aria-hidden focusable={false} {...rest} />;
}
