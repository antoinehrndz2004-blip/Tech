/**
 * Typed shape of the Supabase database. Mirrors the SQL schema in
 * supabase/migrations/20260414000000_initial_schema.sql.
 */
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          vat_number: string | null;
          address: string | null;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          vat_number?: string | null;
          address?: string | null;
          currency?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          company_id: string;
          counterparty: string;
          date: string;
          total: number;
          vat: number;
          category: string;
          type: "expense" | "revenue";
          status: "verified" | "pending";
          debit_account: string;
          credit_account: string;
          invoice_id: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          counterparty: string;
          date: string;
          total: number;
          vat?: number;
          category: string;
          type: "expense" | "revenue";
          status?: "verified" | "pending";
          debit_account: string;
          credit_account: string;
          invoice_id?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          file_url: string | null;
          file_hash: string | null;
          status: "uploaded" | "processing" | "extracted" | "confirmed" | "failed";
          extracted: Record<string, unknown> | null;
          confidence: number | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          file_url?: string | null;
          file_hash?: string | null;
          status?: "uploaded" | "processing" | "extracted" | "confirmed" | "failed";
          extracted?: Record<string, unknown> | null;
          confidence?: number | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      chart_of_accounts: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          label: string;
          kind: "asset" | "liability" | "equity" | "revenue" | "expense";
        };
        Insert: {
          id?: string;
          company_id: string;
          code: string;
          label: string;
          kind: "asset" | "liability" | "equity" | "revenue" | "expense";
        };
        Update: Partial<Database["public"]["Tables"]["chart_of_accounts"]["Insert"]>;
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          company_id: string;
          provider: string;
          status: "connected" | "setup" | "error";
          config: Record<string, unknown> | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          provider: string;
          status?: "connected" | "setup" | "error";
          config?: Record<string, unknown> | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["integrations"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
