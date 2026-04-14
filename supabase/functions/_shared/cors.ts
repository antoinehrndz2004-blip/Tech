/**
 * Shared CORS headers for browser-callable edge functions.
 * In production, lock `Access-Control-Allow-Origin` to your domain.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;
