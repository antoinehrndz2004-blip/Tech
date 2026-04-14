import { T } from "../theme";
import type { PageId } from "../types";

interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "transactions", label: "Transactions", icon: "◎" },
  { id: "upload", label: "Upload", icon: "△" },
  { id: "reports", label: "Reports", icon: "▤" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

interface Props {
  page: PageId;
  onNavigate: (p: PageId) => void;
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ page, onNavigate, open, onToggle }: Props) {
  return (
    <div
      style={{
        width: open ? 230 : 72,
        background: "rgba(10,14,22,0.8)",
        borderRight: "1px solid " + T.gb,
        backdropFilter: "blur(40px)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: open ? "24px 20px" : "24px 16px",
          borderBottom: "1px solid " + T.gb,
          display: "flex",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
            boxShadow: "0 4px 20px " + T.gg,
            color: T.bg,
          }}
        >
          ◈
        </div>
        {open && (
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: -0.5,
                background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              LedgerAI
            </div>
            <div
              style={{
                fontSize: 9,
                color: T.td,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginTop: 1,
              }}
            >
              Smart Accounting
            </div>
          </div>
        )}
      </div>

      <nav
        style={{
          flex: 1,
          padding: "16px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {NAV.map((n) => {
          const active = page === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onNavigate(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background: active ? T.gg : "transparent",
                color: active ? T.gold : T.td,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                width: "100%",
                textAlign: "left",
                borderLeft: active ? "2px solid " + T.gold : "2px solid transparent",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: "center" }}>
                {n.icon}
              </span>
              {open ? n.label : null}
            </button>
          );
        })}
      </nav>

      {open && (
        <div
          style={{
            padding: "16px 14px",
            borderTop: "1px solid " + T.gb,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${T.gold}, ${T.em})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
              color: T.bg,
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Antoine</div>
            <div style={{ fontSize: 10, color: T.td }}>PRO PLAN</div>
          </div>
        </div>
      )}
    </div>
  );
}

export { NAV };
