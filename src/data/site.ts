import type { IconName } from "@/components/ui/Icon/Icon";

// Replace the [PLACEHOLDERS] with real values — everything on the site reads from here.
export const site = {
  name: "Sharapaniuk Mykyta",
  fullName: "Mykyta Sharapaniuk",
  role: "Product designer",
  location: "Warsaw, PL",
  timezone: "UTC+1",
  status: "Open to work · Warsaw",
  email: "sarapanuknikita66@gmail.com",
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
  { title: "Telegram", caption: "@amaterasugrenada", meta: "copy", icon: "send", href: "https://t.me/amaterasugrenada", external: true },
  { title: "LinkedIn", caption: "Message or connect", meta: "↗", icon: "link", href: "https://www.linkedin.com/in/mykyta-sharapaniuk-1080a0339/", external: true },
];

export const contactLook: ContactLink[] = [
  { title: "CV.pdf", caption: "3 pages · updated 11.2026", meta: "PDF", icon: "file-text", href: "/cv.pdf", external: true },
  { title: "Behance", caption: "Full case studies", meta: "↗", icon: "link", href: "https://www.behance.net/nikitasarapamuk", external: true },
  { title: "GitHub", caption: "github.com/ezonef", meta: "↗", icon: "link", href: "https://github.com/ezonef", external: true },
];
