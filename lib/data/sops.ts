import "server-only";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { BrainSop } from "@/lib/database.types";

/** All CloudMD docs (general + per-routine), in display order. */
export async function getSops(): Promise<BrainSop[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("brain_sops")
    .select("*")
    .order("sort", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** One CloudMD doc by key — what a routine calls via get_sop. */
export async function getSop(key: string): Promise<BrainSop | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("brain_sops")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}
