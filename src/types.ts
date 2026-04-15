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
  /** Storage path of the uploaded source file, if any. */
  fileUrl?: string | null;
  /** UUID of the linked `invoices` row, if any. */
  invoiceId?: string | null;
}

export interface MonthStat {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  /** Unit price, excluding VAT (HT), in EUR. */
  unitPrice: number;
  /** VAT rate as a percentage, e.g. 17 for 17%. */
  vatRate: number;
  /** Line amount excluding VAT (quantity * unitPrice). */
  lineTotal: number;
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
  /** Page(s) of the source document this invoice came from, e.g. "1", "2-3". */
  pageRange?: string;
  /** Itemized lines, if the document was itemized. Empty array otherwise. */
  lines?: InvoiceLine[];
}

export type PageId =
  | "dashboard"
  | "transactions"
  | "upload"
  | "reports"
  | "settings";
