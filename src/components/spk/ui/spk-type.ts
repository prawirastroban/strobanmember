// SPK responsive typography scale (presentation only).
// Fluid sizes via clamp() so titles/labels/values never clip or shrink
// below a readable floor on 320px devices.
export const spkType = {
  /** Document / page title */
  title: "text-[clamp(1.05rem,3.2vw,1.6rem)] leading-tight",
  /** Card / section heading */
  heading: "text-[clamp(0.85rem,2.6vw,1rem)] leading-snug",
  /** Uppercase meta labels */
  label: "text-[clamp(0.66rem,1.9vw,0.75rem)] leading-snug",
  /** Field values / body copy */
  value: "text-[clamp(0.8rem,2.4vw,0.95rem)] leading-snug",
  /** Monospace codes (SPK number, plate, links) */
  mono: "font-mono text-[clamp(0.7rem,2.2vw,0.85rem)] leading-snug",
  /** Small helper text */
  meta: "text-[clamp(0.66rem,1.8vw,0.75rem)] leading-snug",
} as const;

/** Always-wrapping text helpers. */
export const spkWrap = "min-w-0 break-words [overflow-wrap:anywhere]";
export const spkWrapCode = "min-w-0 break-all";