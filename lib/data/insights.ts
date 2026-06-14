import "server-only";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { DayBlock } from "@/lib/day";

const WINDOW_DAYS = 14;

export type TrendSeries = {
  label: string;
  type: string;
  points: (number | null)[];
};

export type Insights = {
  configured: boolean;
  days: string[]; // ISO dates, oldest → newest
  throughput: number[]; // tasks completed per day
  adherence: { planned: number; done: number }[]; // per day from daily_plans
  trends: TrendSeries[]; // numeric metrics over the window
};

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const NUMERIC_TYPES = new Set(["count", "scale", "duration"]);

export async function getInsights(): Promise<Insights> {
  const days = lastNDays(WINDOW_DAYS);
  const cutoff = days[0];

  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      days,
      throughput: days.map(() => 0),
      adherence: days.map(() => ({ planned: 0, done: 0 })),
      trends: [],
    };
  }

  const index = new Map(days.map((d, i) => [d, i]));
  const supabase = createServiceClient();

  const [doneRes, plansRes, metricsRes, entriesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("completed_at")
      .eq("status", "done")
      .gte("completed_at", `${cutoff}T00:00:00Z`),
    supabase.from("daily_plans").select("date, blocks").gte("date", cutoff),
    supabase
      .from("tracking_metrics")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true }),
    supabase.from("tracking_entries").select("metric_id, date, value_num").gte("date", cutoff),
  ]);

  if (doneRes.error) throw new Error(doneRes.error.message);
  if (plansRes.error) throw new Error(plansRes.error.message);
  if (metricsRes.error) throw new Error(metricsRes.error.message);
  if (entriesRes.error) throw new Error(entriesRes.error.message);

  // Throughput
  const throughput = days.map(() => 0);
  for (const row of doneRes.data ?? []) {
    const day = (row.completed_at ?? "").slice(0, 10);
    const i = index.get(day);
    if (i !== undefined) throughput[i] += 1;
  }

  // Adherence
  const adherence = days.map(() => ({ planned: 0, done: 0 }));
  for (const plan of plansRes.data ?? []) {
    const i = index.get(plan.date as string);
    if (i === undefined) continue;
    const blocks = Array.isArray(plan.blocks) ? (plan.blocks as DayBlock[]) : [];
    adherence[i] = {
      planned: blocks.length,
      done: blocks.filter((b) => b?.done).length,
    };
  }

  // Trends (numeric metrics only)
  const numericMetrics = (metricsRes.data ?? []).filter((m) => NUMERIC_TYPES.has(m.type));
  const trends: TrendSeries[] = numericMetrics.map((metric) => {
    const points: (number | null)[] = days.map(() => null);
    for (const entry of entriesRes.data ?? []) {
      if (entry.metric_id !== metric.id) continue;
      const i = index.get(entry.date as string);
      if (i !== undefined) points[i] = entry.value_num ?? null;
    }
    return { label: metric.label, type: metric.type, points };
  });

  return { configured: true, days, throughput, adherence, trends };
}
