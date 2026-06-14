import "server-only";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { TrackingEntry, TrackingMetric } from "@/lib/database.types";
import { todayISO } from "@/lib/day";

export type MetricWithEntry = TrackingMetric & { entry: TrackingEntry | null };

export type Tracking = {
  configured: boolean;
  date: string;
  metrics: MetricWithEntry[];
};

export async function getTracking(): Promise<Tracking> {
  const date = todayISO();
  if (!isSupabaseConfigured()) {
    return { configured: false, date, metrics: [] };
  }

  const supabase = createServiceClient();
  const [metricsRes, entriesRes] = await Promise.all([
    supabase
      .from("tracking_metrics")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("tracking_entries").select("*").eq("date", date),
  ]);

  if (metricsRes.error) throw new Error(metricsRes.error.message);
  if (entriesRes.error) throw new Error(entriesRes.error.message);

  const byMetric = new Map(
    (entriesRes.data ?? []).map((entry) => [entry.metric_id, entry]),
  );
  const metrics = (metricsRes.data ?? []).map((metric) => ({
    ...metric,
    entry: byMetric.get(metric.id) ?? null,
  }));

  return { configured: true, date, metrics };
}
