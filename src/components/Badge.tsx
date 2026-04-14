import type { ReactNode } from "react";
import { T } from "../theme";

export type BadgeColor = "gold" | "green" | "red" | "blue" | "amber" | "purple";

const MAP: Record<BadgeColor, { bg: string; c: string; b: string }> = {
  gold: { bg: T.gg, c: T.gold, b: T.gbd },
  green: { bg: T.eg, c: T.em, b: "rgba(52,211,153,0.25)" },
  red: { bg: T.rg, c: T.ro, b: "rgba(244,63,94,0.25)" },
  blue: { bg: T.bg2, c: T.bl, b: "rgba(59,130,246,0.25)" },
  amber: { bg: "rgba(251,191,36,0.1)", c: T.am, b: "rgba(251,191,36,0.25)" },
  purple: { bg: T.pg, c: T.pu, b: "rgba(167,139,250,0.25)" },
};

export function Badge({
  children,
  color = "gold",
}: {
  children: ReactNode;
  color?: BadgeColor;
}) {
  const s = MAP[color];
  return (
    <span
      style={{
        background: s.bg,
        color: s.c,
        border: "1px solid " + s.b,
        padding: "3px 10px",
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.8,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}
