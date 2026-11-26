/**
 * Case study types — no content, so client code (admin, case page) can import them freely.
 * The page layout is fixed (story on the left, screen player on the right); the words are
 * written Notion-style as blocks. Inside a screen's description, [[text]] renders as "↗ text"
 * and shows that screen.
 */
export type CaseTextBlockType = "h1" | "h2" | "h3" | "label" | "text" | "bullet" | "numbered" | "quote";
export type CaseBlock =
  | { id: string; type: CaseTextBlockType; text: string }
  | { id: string; type: "image"; src: string; caption: string }
  | { id: string; type: "divider" };
export type CaseBlockType = CaseBlock["type"];

export const TEXT_BLOCK_TYPES: CaseTextBlockType[] = ["h1", "h2", "h3", "label", "text", "bullet", "numbered", "quote"];
export const BLOCK_TYPES: CaseBlockType[] = [...TEXT_BLOCK_TYPES, "image", "divider"];

/** A link next to a screen, like its Figma file or the live site */
export type CaseLink = { label: string; url: string };
/** What a screen shows: an image, a code prototype, or a page from a link */
export type ScreenSource = { screen: string; prototype?: string; embed?: string; url?: string };

export type CaseStep = {
  title: string;
  /** Screen image shown in the player — sits centred on this step's backdrop */
  screen: string;
  /** A live prototype from src/prototypes (its id). When set, it is shown instead of the image. */
  prototype?: string;
  /** A pasted or uploaded HTML prototype (/prototypes/custom/…/index.html), shown in a sandboxed frame */
  embed?: string;
  /** A Figma file or web page shown live in the player */
  url?: string;
  /** Links shown on the player, for example "Figma" or "Live site" */
  links?: CaseLink[];
  /** The phone layout of this screen; viewers can switch to it when it is set */
  mobile?: ScreenSource;
  /** This screen's own background: an uploaded image path, a colour like "#1b1b19", or "" (plain). */
  backdrop: string;
  /** Right side of the caption under the screen, e.g. "status chips" */
  hint: string;
  /** What's on this screen, Notion-style */
  body: CaseBlock[];
  /** Hidden screens stay in the admin but are left out of the case page */
  hidden?: boolean;
};

export type CaseStudy = {
  headline: string;
  lead: string;
  role: string;
  /** Before the screens: context, problem, constraints… */
  story: CaseBlock[];
  steps: CaseStep[];
  /** After the screens: the result */
  outcome: CaseBlock[];
};

/** A backdrop is either a colour ("#rrggbb", or "#rrggbbaa" with opacity) or an image path */
export const isColor = (v: string) => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v);

export function isWebUrl(v: string) {
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}
const isFigma = (url: string) => /(^|\.)figma\.com$/.test(new URL(url).hostname);
export const linkLabel = (url: string) => {
  if (!isWebUrl(url)) return "Link";
  return isFigma(url) ? "Figma" : new URL(url).hostname.replace(/^www\./, "");
};
/** Figma pages need its embed address to work inside a frame; other sites use their own */
export const frameUrl = (url: string) =>
  isWebUrl(url) && isFigma(url) && !new URL(url).pathname.startsWith("/embed")
    ? `https://www.figma.com/embed?embed_host=portfolio&url=${encodeURIComponent(url)}`
    : url;

let seq = 0;
export const blockId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const textBlocks = (...items: [CaseTextBlockType, string][]): CaseBlock[] =>
  items.filter(([, text]) => text !== undefined).map(([type, text]) => ({ id: blockId(), type, text }));

/**
 * Fills in anything missing and upgrades cases saved before the Notion-style text
 * (problem / outcome / step text used to be plain strings).
 */
export function normalizeCase(base: CaseStudy, saved: Record<string, unknown> = {}): CaseStudy {
  const s = { ...base, ...saved } as Record<string, unknown>;
  const story = Array.isArray(s.story)
    ? (s.story as CaseBlock[])
    : typeof s.problem === "string"
      ? textBlocks(["h2", "Context"], ["label", "Problem"], ["text", s.problem])
      : base.story;
  const outcome = Array.isArray(s.outcome)
    ? (s.outcome as CaseBlock[])
    : typeof s.outcome === "string"
      ? textBlocks(["h2", "Outcome"], ["text", s.outcome])
      : base.outcome;
  const steps = ((s.steps as Record<string, unknown>[]) ?? []).map((st) => ({
    title: String(st.title ?? ""),
    screen: String(st.screen ?? ""),
    backdrop: String(st.backdrop ?? ""),
    ...(st.prototype ? { prototype: String(st.prototype) } : {}),
    ...(st.embed ? { embed: String(st.embed) } : {}),
    ...(st.url ? { url: String(st.url) } : {}),
    ...(Array.isArray(st.links) && st.links.length ? { links: st.links as CaseLink[] } : {}),
    ...(st.mobile ? { mobile: st.mobile as ScreenSource } : {}),
    hint: String(st.hint ?? ""),
    body: Array.isArray(st.body) ? (st.body as CaseBlock[]) : textBlocks(["text", String(st.text ?? "")]),
    ...(st.hidden ? { hidden: true } : {}),
  }));
  return {
    headline: String(s.headline ?? ""),
    lead: String(s.lead ?? ""),
    role: String(s.role ?? ""),
    story,
    steps,
    outcome,
  };
}
