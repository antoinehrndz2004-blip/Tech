/**
 * Luxembourg chart of accounts — PCN 2011 (Plan Comptable Normalisé).
 *
 * This module is the single source of truth for account codes used across the
 * UI. The same codes are seeded into the `chart_of_accounts` table by the
 * Supabase migration trigger `seed_default_coa` — keep the two in sync when
 * editing.
 */
import type { Category } from "../theme";

export type AccountKind = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface Account {
  code: string;
  label: string;
  kind: AccountKind;
}

/** Accounts that are always present (bank, VAT, receivables, …). */
export const SYSTEM_ACCOUNTS = {
  bank: { code: "5131", label: "Banques — Compte courant", kind: "asset" },
  cash: { code: "531", label: "Caisse", kind: "asset" },
  receivables: { code: "411", label: "Clients", kind: "asset" },
  payables: { code: "401", label: "Fournisseurs", kind: "liability" },
  vatDeductible: { code: "4421", label: "TVA déductible", kind: "asset" },
  vatCollected: { code: "4425", label: "TVA collectée", kind: "liability" },
  salesServices: {
    code: "705",
    label: "Prestations de services",
    kind: "revenue",
  },
  salesGoods: {
    code: "707",
    label: "Ventes de marchandises",
    kind: "revenue",
  },
} as const satisfies Record<string, Account>;

/**
 * Expense account for each invoice/transaction category. Codes follow the
 * Luxembourg PCN 2011 sub-classes of chapter 6 (Charges d'exploitation).
 */
export const EXPENSE_ACCOUNTS: Record<
  Exclude<Category, "Revenue">,
  Account
> = {
  Rent: { code: "611", label: "Locations et charges locatives", kind: "expense" },
  "Food & Dining": {
    code: "622",
    label: "Missions, réceptions et frais de représentation",
    kind: "expense",
  },
  Transport: {
    code: "623",
    label: "Voyages et déplacements",
    kind: "expense",
  },
  "Office Supplies": {
    code: "606",
    label: "Achats non stockés de fournitures",
    kind: "expense",
  },
  Software: {
    code: "6061",
    label: "Logiciels, licences et abonnements",
    kind: "expense",
  },
  Marketing: {
    code: "621",
    label: "Publicité, relations publiques",
    kind: "expense",
  },
  Utilities: {
    code: "6051",
    label: "Eau, gaz, électricité, combustibles",
    kind: "expense",
  },
  Insurance: {
    code: "613",
    label: "Primes et cotisations d'assurance",
    kind: "expense",
  },
  "Professional Services": {
    code: "616",
    label: "Rémunérations, commissions et honoraires",
    kind: "expense",
  },
  Other: {
    code: "648",
    label: "Autres charges d'exploitation",
    kind: "expense",
  },
};

/** The full flat list seeded into `chart_of_accounts` on company creation. */
export const DEFAULT_ACCOUNTS: readonly Account[] = [
  SYSTEM_ACCOUNTS.receivables,
  SYSTEM_ACCOUNTS.payables,
  SYSTEM_ACCOUNTS.vatDeductible,
  SYSTEM_ACCOUNTS.vatCollected,
  SYSTEM_ACCOUNTS.bank,
  SYSTEM_ACCOUNTS.cash,
  ...Object.values(EXPENSE_ACCOUNTS),
  SYSTEM_ACCOUNTS.salesServices,
  SYSTEM_ACCOUNTS.salesGoods,
] as const;

/**
 * Debit & credit accounts for a single-entry journal post:
 *  - expense → DR expense class-6 account, CR bank (5131)
 *  - revenue → DR clients (411), CR sales (705)
 */
export function journalEntryFor(
  type: "expense" | "revenue",
  category: Category,
): { debit: Account; credit: Account } {
  if (type === "expense") {
    const key = (category === "Revenue" ? "Other" : category) as Exclude<
      Category,
      "Revenue"
    >;
    return { debit: EXPENSE_ACCOUNTS[key], credit: SYSTEM_ACCOUNTS.bank };
  }
  return {
    debit: SYSTEM_ACCOUNTS.receivables,
    credit: SYSTEM_ACCOUNTS.salesServices,
  };
}

export const formatAccount = (a: Account): string => a.code + " — " + a.label;
