import type { Category } from "./theme";

export type TxType = "expense" | "revenue";
export type TxStatus = "verified" | "pending";

export interface Transaction {
  id: string;
  company: string;
  /** ISO date (yyyy-mm-dd) */
  date: string;
  /** Signed amount: negative for expenses, positive for revenue. */
  total: number;
  /** VAT amount (absolute). */
  vat: number;
  category: Category;
  type: TxType;
  status: TxStatus;
  /** Account code + label, e.g. "6100 - Software". */
  debit: string;
  credit: string;
}

export interface MonthStat {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ExtractedInvoice {
  company: string;
  date: string;
  total: number;
  vat: number;
  category: Category;
  type: TxType;
  /** AI confidence, 0-100. */
  conf: number;
}

export type PageId =
  | "dashboard"
  | "transactions"
  | "upload"
  | "reports"
  | "settings";
