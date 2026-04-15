import { T } from "../theme";

export function Toast({ message }: { message: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        background: "rgba(52,211,153,0.15)",
        border: "1px solid rgba(52,211,153,0.3)",
        color: T.em,
        padding: "14px 24px",
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 600,
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "slideIn 0.4s ease",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{ width: 8, height: 8, borderRadius: "50%", background: T.em }}
      />
      {message}
    </div>
  );
}
