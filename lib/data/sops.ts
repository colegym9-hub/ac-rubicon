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

/** Upsert the weekly plan — keyed as 'weekly_plan', sort=99 so it sits at the
 *  bottom of the SOP list and is easy to find from the daily-planner routine. */
export async function saveWeeklyPlan(content: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createServiceClient();
  const { error } = await supabase.from("brain_sops").upsert(
    { key: "weekly_plan", label: "Weekly Plan", content_md: content, sort: 99 },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}
