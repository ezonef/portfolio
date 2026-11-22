/** Primitive colours: values live here, meaning lives in the semantic tokens that point at them. */
export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Step = (typeof STEPS)[number];
export type PaletteName = "Blue" | "Neutral" | "Forest" | "Clay";

const ramp = (hex: string[]) => Object.fromEntries(STEPS.map((s, i) => [s, hex[i]])) as Record<Step, string>;

export const PALETTES: Record<PaletteName, Record<Step, string>> = {
  Blue: ramp(["#F3F7FF", "#E6EEFF", "#CCDCFF", "#A5C1FF", "#7099FB", "#4478F2", "#1F5EE8", "#1A4CC2", "#173F9C", "#15347A", "#0D1F4A"]),
  Neutral: ramp(["#FAFAF9", "#F2F2F0", "#E4E4E1", "#CFCFCB", "#A6A6A1", "#7B7B76", "#5A5A56", "#454542", "#353535", "#262624", "#171716"]),
  Forest: ramp(["#F5F8F4", "#E8F0E6", "#D2E1CE", "#B0CBA9", "#86AE7D", "#5F8F56", "#477341", "#385B34", "#2D492B", "#233A22", "#142313"]),
  Clay: ramp(["#FBF7F3", "#F5EBE1", "#EAD6C3", "#DCBA9B", "#C9946B", "#B5764A", "#975D39", "#794A2F", "#5F3B27", "#4A2F20", "#2B1A11"]),
};
