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

export type CaseStep = {
  title: string;
  /** Screen shown in the player — sits centred on this step's backdrop */
  screen: string;
  /** This screen's own background image ("" = plain). Not shared with the card cover or other screens. */
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
