import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { makeTransactions } from "../lib/mockData";
import type { Category } from "../theme";
import type { Transaction, TxStatus, TxType } from "../types";

interface Options {
  companyId?: string | null;
}

/**
 * Transactions data hook. Talks to Supabase when configured, otherwise falls
 * back to mock data so the UI is usable without a backend.
 */
export function useTransactions({ companyId }: Options = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured() || !companyId) {
      setTransactions(makeTransactions());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase!
      .from("transactions")
      .select("*")
      .eq("company_id", companyId)
      .order("date", { ascending: false });
    if (error) {
      console.error(error);
      setTransactions([]);
    } else {
      setTransactions(
        (data ?? []).map((row) => ({
          id: row.id,
          company: row.counterparty,
          date: row.date,
          total: Number(row.total),
          vat: Number(row.vat),
          category: row.category as Category,
          type: row.type as TxType,
          status: row.status as TxStatus,
          debit: row.debit_account,
          credit: row.credit_account,
        })),
      );
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(
    async (tx: Transaction) => {
      setTransactions((prev) => [tx, ...prev]);
      if (!isSupabaseConfigured() || !companyId) return;
      const { error } = await supabase!.from("transactions").insert({
        company_id: companyId,
        counterparty: tx.company,
        date: tx.date,
        total: tx.total,
        vat: tx.vat,
        category: tx.category,
        type: tx.type,
        status: tx.status,
        debit_account: tx.debit,
        credit_account: tx.credit,
        invoice_id: null,
        created_by: null,
      });
      if (error) console.error(error);
    },
    [companyId],
  );

  const remove = useCallback(
    async (id: string) => {
      setTransactions((prev) => prev.filter((x) => x.id !== id));
      if (!isSupabaseConfigured() || !companyId) return;
      const { error } = await supabase!.from("transactions").delete().eq("id", id);
      if (error) console.error(error);
    },
    [companyId],
  );

  return { transactions, loading, add, remove, reload: load };
}
