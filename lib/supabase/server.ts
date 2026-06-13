import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Server-only Supabase client using the SERVICE_ROLE key.
 *
 * Access model: the browser never holds a Supabase client. All DB access goes
 * through server actions / route handlers behind the app password gate, using
 * this service-role client (which bypasses the deny-by-default RLS). See
 * specs/TODO.md (NEEDS ME: auth/RLS model).
 *
 * Lazy + throws only when called (never at module load) so `next build`
 * stays green before the env keys are added. Pages that query must be dynamic.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY to .env.local (see specs/TODO.md → NEEDS ME).",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** True when the Supabase env is present — lets pages render a friendly "not configured yet" state instead of throwing. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
