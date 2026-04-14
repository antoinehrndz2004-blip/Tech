import { useState, type FormEvent } from "react";
import { GlassCard } from "../components/GlassCard";
import { Background } from "../components/Background";
import { T } from "../theme";
import type { Company, CompanyInput } from "../hooks/useCompany";

interface Props {
  onCreate: (
    input: CompanyInput,
  ) => Promise<{ data: Company | null; error: { message: string } | null }>;
  onSignOut: () => Promise<void> | void;
  email: string | null;
}

export function CompanySetup({ onCreate, onSignOut, email }: Props) {
  const [name, setName] = useState("");
  const [vat, setVat] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await onCreate({
        name: name.trim(),
        vat_number: vat.trim() || null,
        address: address.trim() || null,
      });
      if (err) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid " + T.gb,
    background: "rgba(255,255,255,0.03)",
    color: T.text,
    fontSize: 14,
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

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.bg,
        color: T.text,
        padding: 24,
      }}
    >
      <Background />
      <GlassCard style={{ width: "100%", maxWidth: 480, padding: 36, zIndex: 5 }}>
        <div
          style={{
            fontSize: 10,
            color: T.gold,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Step 1 of 1
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 6 }}>
          Set up your company
        </h1>
        <p style={{ fontSize: 13, color: T.td, margin: 0, marginBottom: 26 }}>
          We'll seed a Luxembourg chart of accounts and you can start posting
          entries straight away.
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            {label("Company name *")}
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="LuxDrop Logistics Sàrl"
            />
          </div>
          <div>
            {label("VAT number")}
            <input
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              style={inputStyle}
              placeholder="LU12345678"
            />
          </div>
          <div>
            {label("Address")}
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={inputStyle}
              placeholder="12 Rue du Fort Bourbon, L-1249 Luxembourg"
            />
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: T.ro,
                background: T.rg,
                border: "1px solid rgba(244,63,94,0.25)",
                padding: "10px 14px",
                borderRadius: 10,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            style={{
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
              color: T.bg,
              fontSize: 14,
              fontWeight: 800,
              cursor: submitting ? "default" : "pointer",
              boxShadow: "0 4px 20px " + T.gg,
              opacity: submitting || !name.trim() ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {submitting ? "Creating…" : "Create workspace"}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid " + T.gb,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: T.td,
          }}
        >
          <span>Signed in as {email ?? "—"}</span>
          <button
            type="button"
            onClick={() => void onSignOut()}
            style={{
              background: "none",
              border: "none",
              color: T.gold,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Sign out
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
