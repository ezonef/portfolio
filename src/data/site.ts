import type { IconName } from "@/components/ui/Icon/Icon";

// Replace the [PLACEHOLDERS] with real values — everything on the site reads from here.
export const site = {
  name: "[NAME]",
  role: "Product designer",
  location: "Warsaw, PL",
  timezone: "UTC+1",
  status: "Open to work · Warsaw",
  email: "[EMAIL]",
  languages: "EN · PL · UA · RU",
};

export type ContactLink = {
  title: string;
  caption?: string;
  meta?: string;
  icon: IconName;
  href: string;
  external?: boolean;
};

export const contactWrite: ContactLink[] = [
  { title: "Email", caption: site.email, meta: "copy", icon: "mail", href: `mailto:${site.email}` },
  { title: "Telegram", caption: "@[handle]", meta: "fast", icon: "send", href: "https://t.me/[handle]", external: true },
  { title: "LinkedIn", caption: "Message or connect", meta: "↗", icon: "link", href: "https://linkedin.com/in/[handle]", external: true },
  { title: "Book a call", caption: "30 min · Google Meet", meta: "30′", icon: "calendar", href: "https://cal.com/[handle]", external: true },
];

export const contactLook: ContactLink[] = [
  { title: "CV.pdf", caption: "2 pages · updated 11.2026", meta: "PDF", icon: "file-text", href: "/cv.pdf", external: true },
  { title: "Behance", caption: "Full case studies", meta: "↗", icon: "link", href: "https://behance.net/[handle]", external: true },
];
