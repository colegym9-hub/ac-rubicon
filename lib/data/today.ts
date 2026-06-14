import "server-only";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { DailyLog, DailyPlan, TaskWithWeight } from "@/lib/database.types";
import { type DayBlock, sortBlocks, todayISO } from "@/lib/day";

export type Today = {
  configured: boolean;
  date: string;
  plan: DailyPlan | null;
  blocks: DayBlock[];
  log: DailyLog | null;
  scheduledTasks: TaskWithWeight[];
};

function parseBlocks(value: unknown): DayBlock[] {
  if (!Array.isArray(value)) return [];
  return sortBlocks(value as DayBlock[]);
}

export async function getBlocksForDate(date: string): Promise<DayBlock[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_plans")
    .select("blocks")
    .eq("date", date)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseBlocks(data?.blocks);
}

export async function getToday(): Promise<Today> {
  const date = todayISO();
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      date,
      plan: null,
      blocks: [],
      log: null,
      scheduledTasks: [],
    };
  }

  const supabase = createServiceClient();
  const [planRes, logRes, tasksRes] = await Promise.all([
    supabase.from("daily_plans").select("*").eq("date", date).maybeSingle(),
    supabase.from("daily_logs").select("*").eq("date", date).maybeSingle(),
    supabase
      .from("task_weights")
      .select("*")
      .eq("scheduled_for", date)
      .neq("status", "dropped")
      .order("weight", { ascending: false }),
  ]);

  if (planRes.error) throw new Error(planRes.error.message);
  if (logRes.error) throw new Error(logRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);

  return {
    configured: true,
    date,
    plan: planRes.data ?? null,
    blocks: parseBlocks(planRes.data?.blocks),
    log: logRes.data ?? null,
    scheduledTasks: tasksRes.data ?? [],
  };
}

/** Yesterday's log + its date — drives the morning check-in (fill it out if
 *  null, review it if present). */
export async function getYesterdayLog(): Promise<{ date: string; log: DailyLog | null }> {
  const d = new Date(`${todayISO()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const date = d.toISOString().slice(0, 10);
  if (!isSupabaseConfigured()) return { date, log: null };

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { date, log: data ?? null };
}
