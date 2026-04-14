import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export type IntegrationStatus = "connected" | "setup" | "error";

export interface Integration {
  provider: string;
  status: IntegrationStatus;
}

/**
 * Providers we display in the Settings → Integrations card. The list is fixed;
 * the backing row is only created once the user actually connects something.
 */
export const KNOWN_INTEGRATIONS: { provider: string; description: string }[] = [
  { provider: "OpenAI API", description: "AI parsing (invoices)" },
  { provider: "Google Vision", description: "OCR" },
  { provider: "Banking API", description: "Auto-import" },
  { provider: "FIDUNAV", description: "Lux accounting export" },
];

interface Options {
  companyId?: string | null;
}

export function useIntegrations({ companyId }: Options) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured() || !companyId) {
      setIntegrations([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase!
      .from("integrations")
      .select("provider, status")
      .eq("company_id", companyId);
    if (error) {
      console.error(error);
      setIntegrations([]);
    } else {
      setIntegrations(
        (data ?? []).map((row) => ({
          provider: row.provider,
          status: row.status as IntegrationStatus,
        })),
      );
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { integrations, loading, reload: load };
}
