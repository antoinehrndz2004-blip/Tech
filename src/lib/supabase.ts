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
