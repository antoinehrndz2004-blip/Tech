import { T } from "../theme";
import type { PageId } from "../types";

const TITLES: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Financial overview" },
  transactions: { title: "Transactions", subtitle: "All entries" },
  upload: { title: "Upload", subtitle: "Scan invoices" },
  reports: { title: "Reports", subtitle: "Statements" },
  settings: { title: "Settings", subtitle: "Configuration" },
};

interface Props {
  page: PageId;
  onNewInvoice: () => void;
}

export function Header({ page, onNewInvoice }: Props) {
  const { title, subtitle } = TITLES[page];
  return (
    <div
      style={{
        padding: "18px 32px",
        borderBottom: "1px solid " + T.gb,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(10,14,22,0.6)",
        backdropFilter: "blur(20px)",
        flexShrink: 0,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            margin: 0,
            letterSpacing: -0.5,
            color: T.text,
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 12, color: T.td, margin: 0, marginTop: 3 }}>{subtitle}</p>
      </div>
      <button
        onClick={onNewInvoice}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 22px",
          borderRadius: 12,
          border: "none",
          background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
          color: T.bg,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 20px " + T.gg,
        }}
      >
        + New Invoice
      </button>
    </div>
  );
}
