import { T } from "../theme";

/** Soft ambient light blobs behind the whole app. Purely decorative. */
export function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.gg} 0%, transparent 70%)`,
          top: "-10%",
          right: "-5%",
          filter: "blur(80px)",
          animation: "pulse1 8s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.bg2} 0%, transparent 70%)`,
          bottom: "-10%",
          left: "10%",
          filter: "blur(80px)",
          animation: "pulse2 10s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.pg} 0%, transparent 70%)`,
          top: "40%",
          left: "50%",
          filter: "blur(80px)",
          animation: "pulse3 12s ease-in-out infinite",
        }}
      />
    </div>
  );
}
