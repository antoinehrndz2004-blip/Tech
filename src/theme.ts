/**
 * Design tokens for LedgerAI.
 * Dark, premium, finance-oriented palette with a Luxembourg-gold accent.
 */
export const T = {
  bg: "#06080C",
  surface: "rgba(14,20,33,0.72)",
  gb: "rgba(255,255,255,0.06)", // glass border
  gh: "rgba(255,255,255,0.06)", // glass hover
  text: "#F0F2F5",
  ts: "#A0ABBE", // text subtle
  td: "#566378", // text dim

  gold: "#D4A853",
  gl: "#E8C97A",
  gg: "rgba(212,168,83,0.12)",
  gbd: "rgba(212,168,83,0.2)",

  em: "#34D399", // emerald
  eg: "rgba(52,211,153,0.1)",
  ro: "#F43F5E", // rose
  rg: "rgba(244,63,94,0.1)",
  bl: "#3B82F6", // blue
  bg2: "rgba(59,130,246,0.1)",
  pu: "#A78BFA", // purple
  pg: "rgba(167,139,250,0.1)",
  am: "#FBBF24", // amber
} as const;

/** Palette for pie slices and category swatches. */
export const PC = [
  T.gold,
  T.em,
  T.bl,
  T.pu,
  T.ro,
  T.am,
  "#06B6D4",
  "#EC4899",
] as const;

export const CATEGORIES = [
  "Rent",
  "Food & Dining",
  "Transport",
  "Office Supplies",
  "Software",
  "Marketing",
  "Utilities",
  "Insurance",
  "Professional Services",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number] | "Revenue";
