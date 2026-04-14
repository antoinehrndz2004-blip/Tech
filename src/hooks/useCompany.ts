import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export interface Company {
  id: string;
  name: string;
  vat_number: string | null;
  address: string | null;
  currency: string;
}

export interface CompanyInput {
  name: string;
  vat_number?: string | null;
  address?: string | null;
  currency?: string;
}

const SELECT = "id, name, vat_number, address, currency" as const;

/**
 * Loads the authenticated user's primary company. For v1 each user has one
 * company; multi-company workspaces can be added later by exposing a picker.
 */
export function useCompany(session: Session | null) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !session) {
      setCompany(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase!
      .from("companies")
      .select(SELECT)
      .eq("owner_id", session.user.id)
      .limit(1)
      .maybeSingle();
    if (error) console.error(error);
    setCompany((data as Company | null) ?? null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (input: CompanyInput) => {
      if (!isSupabaseConfigured() || !session)
        return { data: null, error: new Error("Not configured") };
      const { data, error } = await supabase!
        .from("companies")
        .insert({
          owner_id: session.user.id,
          name: input.name,
          vat_number: input.vat_number ?? null,
          address: input.address ?? null,
          currency: input.currency ?? "EUR",
        })
        .select(SELECT)
        .single();
      if (!error && data) setCompany(data as Company);
      return { data: data as Company | null, error };
    },
    [session],
  );

  const update = useCallback(
    async (input: Partial<CompanyInput>) => {
      if (!isSupabaseConfigured() || !company)
        return { data: null, error: new Error("No company") };
      const { data, error } = await supabase!
        .from("companies")
        .update(input)
        .eq("id", company.id)
        .select(SELECT)
        .single();
      if (!error && data) setCompany(data as Company);
      return { data: data as Company | null, error };
    },
    [company],
  );

  return { company, loading, create, update, reload: load };
}
