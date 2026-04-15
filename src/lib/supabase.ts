import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * The Supabase client is only created when both env vars are present. This
 * lets the app boot on a fresh clone with no backend configured — it will
 * simply fall back to mock data.
 */
export const supabase: SupabaseClient<Database> | null =
  url && anon ? createClient<Database>(url, anon) : null;

export const isSupabaseConfigured = (): boolean => supabase !== null;

export const INVOICES_BUCKET = "invoices";

/**
 * Mint a short-lived signed URL for a private invoice file. Returns null when
 * Supabase is not configured or the file cannot be signed (e.g. wrong path).
 */
export async function getInvoiceSignedUrl(
  path: string,
  expiresInSec = 60 * 60,
): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage
    .from(INVOICES_BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) {
    console.error("[supabase] createSignedUrl failed:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}
