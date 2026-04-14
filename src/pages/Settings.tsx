import { useEffect, useState } from "react";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { ThreeScene } from "../components/ThreeScene";
import { T } from "../theme";
import { DEFAULT_ACCOUNTS } from "../lib/accounts";
import type { Company, CompanyInput } from "../hooks/useCompany";
import { KNOWN_INTEGRATIONS, useIntegrations } from "../hooks/useIntegrations";

interface Props {
  company: Company | null;
  companyId: string | null;
  onSave: (input: Partial<CompanyInput>) => Promise<boolean>;
}

export function Settings({ company, companyId, onSave }: Props) {
  const [form, setForm] = useState<CompanyInput>(() => ({
    name: company?.name ?? "",
    vat_number: company?.vat_number ?? "",
    address: company?.address ?? "",
    currency: company?.currency ?? "EUR",
  }));
  const [saving, setSaving] = useState(false);

  // Keep form in sync if the company is (re)loaded.
  useEffect(() => {
    setForm({
      name: company?.name ?? "",
      vat_number: company?.vat_number ?? "",
      address: company?.address ?? "",
      currency: company?.currency ?? "EUR",
    });
  }, [company]);

  const { integrations } = useIntegrations({ companyId });
  const connected = new Set(integrations.filter((i) => i.status === "connected").map((i) => i.provider));

  const dirty =
    company != null &&
    (form.name !== (company.name ?? "") ||
      (form.vat_number ?? "") !== (company.vat_number ?? "") ||
      (form.address ?? "") !== (company.address ?? "") ||
      (form.currency ?? "EUR") !== company.currency);

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    await onSave({
      name: form.name.trim(),
      vat_number: form.vat_number?.trim() || null,
      address: form.address?.trim() || null,
      currency: form.currency?.trim() || "EUR",
    });
    setSaving(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid " + T.gb,
    background: "rgba(255,255,255,0.03)",
    color: T.text,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const label = (text: string) => (
    <label
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: T.td,
        marginBottom: 6,
        display: "block",
        letterSpacing: 1.5,
        textTransform: "uppercase",
      }}
    >
      {text}
    </label>
  );

  const accounts = DEFAULT_ACCOUNTS;
  const readOnly = company == null;

  return (
    <div style={{ maxWidth: 660, display: "flex", flexDirection: "column", gap: 24 }}>
      <GlassCard style={{ height: 160, position: "relative", overflow: "hidden" }}>
        <ThreeScene variant="settings" />
        <div style={{ position: "absolute", bottom: 20, left: 24, zIndex: 2 }}>
          <div
            style={{
              fontSize: 10,
              color: T.td,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Configuration
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>
            Account Settings
          </div>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 28 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
            Company Details
          </h3>
          <button
            onClick={save}
            disabled={!dirty || saving || readOnly}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid " + T.gbd,
              background: dirty && !saving ? T.gg : "rgba(255,255,255,0.03)",
              color: dirty && !saving ? T.gold : T.td,
              fontSize: 12,
              fontWeight: 700,
              cursor: dirty && !saving ? "pointer" : "not-allowed",
              opacity: dirty && !saving ? 1 : 0.6,
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            {label("Company Name")}
            <input
              value={form.name}
              disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            {label("VAT Number")}
            <input
              value={form.vat_number ?? ""}
              disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, vat_number: e.target.value }))}
              placeholder="LU12345678"
              style={inputStyle}
            />
          </div>
          <div>
            {label("Address")}
            <input
              value={form.address ?? ""}
              disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="12 Rue du Fort Bourbon, L-1249 Luxembourg"
              style={inputStyle}
            />
          </div>
          <div>
            {label("Currency")}
            <input
              value={form.currency ?? ""}
              disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              style={inputStyle}
            />
          </div>
        </div>
        {readOnly && (
          <div style={{ marginTop: 14, fontSize: 11, color: T.td }}>
            Demo mode — connect Supabase to save real company data.
          </div>
        )}
      </GlassCard>

      <GlassCard style={{ padding: 28 }}>
        <h3
          style={{ margin: 0, fontSize: 16, fontWeight: 800, marginBottom: 22, color: T.text }}
        >
          Integrations
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {KNOWN_INTEGRATIONS.map((i) => {
            const isConnected = connected.has(i.provider);
            return (
              <div
                key={i.provider}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderRadius: 14,
                  border: "1px solid " + T.gb,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                    {i.provider}
                  </div>
                  <div style={{ fontSize: 11, color: T.td, marginTop: 2 }}>
                    {i.description}
                  </div>
                </div>
                <Badge color={isConnected ? "green" : "amber"}>
                  {isConnected ? "Connected" : "Setup"}
                </Badge>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 28 }}>
        <h3
          style={{ margin: 0, fontSize: 16, fontWeight: 800, marginBottom: 6, color: T.text }}
        >
          Chart of Accounts
        </h3>
        <p style={{ margin: 0, marginBottom: 18, fontSize: 12, color: T.td }}>
          PCN Luxembourg
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {accounts.map((a) => (
            <div
              key={a.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid " + T.gb,
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono'",
                  fontSize: 13,
                  fontWeight: 800,
                  color: T.gold,
                  minWidth: 50,
                }}
              >
                {a.code}
              </span>
              <span style={{ fontSize: 13, color: T.ts }}>{a.label}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
