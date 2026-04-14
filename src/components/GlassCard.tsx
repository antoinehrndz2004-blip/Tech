import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { T } from "../theme";

interface Props {
  children: ReactNode;
  style?: CSSProperties;
  hover?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

/** Frosted-glass card. Core surface used across the app. */
export function GlassCard({ children, style, hover, onClick }: Props) {
  const base: CSSProperties = {
    background: T.surface,
    border: "1px solid " + T.gb,
    borderRadius: 20,
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    transition: "all 0.3s",
    position: "relative",
    overflow: "hidden",
  };
  return (
    <div
      style={{ ...base, ...style }}
      onClick={onClick}
      onMouseEnter={
        hover
          ? (e) => {
              e.currentTarget.style.borderColor = T.gbd;
              e.currentTarget.style.background = T.gh;
            }
          : undefined
      }
      onMouseLeave={
        hover
          ? (e) => {
              e.currentTarget.style.borderColor = T.gb;
              e.currentTarget.style.background = T.surface;
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
