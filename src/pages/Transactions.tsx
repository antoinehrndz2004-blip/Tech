import { useCallback, useMemo, useState } from "react";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { CATEGORIES, T } from "../theme";
import type { Transaction, TxType } from "../types";
import { signedEuro } from "../lib/format";
import { downloadCsv, toCsv } from "../lib/csv";
import { getInvoiceSignedUrl } from "../lib/supabase";

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onVerify: (id: string) => void;
}

type TypeFilter = "all" | TxType;
type StatusFilter = "all" | "pending" | "verified";

export function Transactions({ transactions, onDelete, onVerify }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const pendingCount = useMemo(
    () => transactions.filter((t) => t.status === "pending").length,
    [transactions],
  );

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        if (search && !t.company.toLowerCase().includes(search.toLowerCase())) return false;
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        return true;
      }),
    [transactions, search, typeFilter, categoryFilter, statusFilter],
  );

  const openAttachment = useCallback(async (path: string) => {
    const url = await getInvoiceSignedUrl(path);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // eslint-disable-next-line no-alert
      alert("Could not open file. It may have been removed.");
    }
  }, []);

  const exportCsv = () => {
    const header = [
      "Date",
      "Counterparty",
      "Type",
      "Category",
      "Debit account",
      "Credit account",
      "Amount (EUR)",
      "VAT (EUR)",
      "Status",
    ];
    const rows = filtered.map((t) => [
      t.date,
      t.company,
      t.type,
      t.category,
      t.debit,
      t.credit,
      t.total.toFixed(2),
      t.vat.toFixed(2),
      t.status,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`ledgerai-transactions-${stamp}.csv`, toCsv([header, ...rows]));
  };

  const inputBase = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid " + T.gb,
    borderRadius: 12,
    padding: "10px 16px",
    color: T.text,
    fontSize: 13,
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <GlassCard
        style={{
          padding: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 12,
            padding: "10px 16px",
            flex: "1 1 220px",
            border: "1px solid " + T.gb,
          }}
        >
          <span style={{ color: T.td, fontSize: 14 }}>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: T.text,
              fontSize: 13,
              width: "100%",
            }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          style={inputBase}
        >
          <option value="all">All Types</option>
          <option value="expense">Expenses</option>
          <option value="revenue">Revenue</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={inputBase}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="Revenue">Revenue</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          style={inputBase}
        >
          <option value="all">All Status</option>
          <option value="pending">
            Pending review{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </option>
          <option value="verified">Verified</option>
        </select>
        <span
          style={{
            fontSize: 12,
            color: T.td,
            marginLeft: "auto",
            fontFamily: "'IBM Plex Mono'",
            fontWeight: 600,
          }}
        >
          {filtered.length} entries
        </span>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid " + T.gbd,
            background: T.gg,
            color: T.gold,
            fontSize: 12,
            fontWeight: 700,
            cursor: filtered.length === 0 ? "not-allowed" : "pointer",
            opacity: filtered.length === 0 ? 0.4 : 1,
          }}
        >
          ↓ Export CSV
        </button>
      </GlassCard>

      <GlassCard style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 95px 95px 120px 120px 110px 40px 40px",
            gap: 8,
            padding: "14px 22px",
            borderBottom: "1px solid " + T.gb,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {["Company", "Date", "Category", "Debit", "Credit", "Amount", "", ""].map((x, i) => (
            <div
              key={i}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.td,
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              {x}
            </div>
          ))}
        </div>

        {filtered.map((t) => (
          <div
            key={t.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 95px 95px 120px 120px 110px 40px 40px",
              gap: 8,
              padding: "14px 22px",
              borderBottom: "1px solid " + T.gb,
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: t.type === "revenue" ? T.eg : T.rg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  color: t.type === "revenue" ? T.em : T.ro,
                  flexShrink: 0,
                }}
              >
                {t.type === "revenue" ? "↑" : "↓"}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t.company}</span>
              {t.status === "pending" && (
                <button
                  onClick={() => onVerify(t.id)}
                  title="Mark verified"
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: 1,
                    padding: "3px 7px",
                    borderRadius: 6,
                    border: "1px solid " + T.gbd,
                    background: T.gg,
                    color: T.gold,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Pending ✓
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: T.td, fontFamily: "'IBM Plex Mono'" }}>
              {t.date.slice(5)}
            </div>
            <div>
              <Badge color={t.type === "revenue" ? "green" : "blue"}>
                {t.category.length > 9 ? t.category.slice(0, 9) + "…" : t.category}
              </Badge>
            </div>
            <div style={{ fontSize: 11, color: T.td, fontFamily: "'IBM Plex Mono'" }}>
              {t.debit.split(" - ")[0]}
            </div>
            <div style={{ fontSize: 11, color: T.td, fontFamily: "'IBM Plex Mono'" }}>
              {t.credit.split(" - ")[0]}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                fontFamily: "'IBM Plex Mono'",
                color: t.total >= 0 ? T.em : T.text,
                textAlign: "right",
              }}
            >
              {signedEuro(t.total)}
            </div>
            <div style={{ textAlign: "center" }}>
              {t.fileUrl ? (
                <button
                  onClick={() => void openAttachment(t.fileUrl as string)}
                  title="Open original file"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: T.gold,
                    fontSize: 14,
                  }}
                >
                  ⎙
                </button>
              ) : null}
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => onDelete(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: T.td,
                  fontSize: 14,
                  opacity: 0.5,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: 50, textAlign: "center", color: T.td, fontSize: 13 }}>
            No transactions found.
          </div>
        )}
      </GlassCard>
    </div>
  );
}
