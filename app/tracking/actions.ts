"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { MetricType } from "@/lib/database.types";
import { todayISO } from "@/lib/day";

export type ActionResult = { error?: string };

const TYPES: MetricType[] = ["bool", "count", "scale", "duration", "note"];

/** Upsert today's entry for a metric. Only the provided fields are written, so
 *  toggling a value never clobbers an existing note (PostgREST merge-duplicates
 *  only SETs columns present in the payload). */
export async function setMetricValue(
  metricId: string,
  value: { valueNum?: number | null; valueText?: string | null },
): Promise<ActionResult> {
  const row: {
    metric_id: string;
    date: string;
    value_num?: number | null;
    value_text?: string | null;
  } = { metric_id: metricId, date: todayISO() };

  if (value.valueNum !== undefined) row.value_num = value.valueNum;
  if (value.valueText !== undefined) {
    row.value_text = value.valueText && value.valueText.trim() ? value.valueText.trim() : null;
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tracking_entries")
    .upsert(row, { onConflict: "metric_id,date" });
  if (error) return { error: error.message };
  revalidatePath("/tracking");
  return {};
}

export async function createMetric(input: {
  label: string;
  type: string;
  key?: string;
}): Promise<ActionResult> {
  const label = input.label?.trim();
  if (!label) return { error: "Label is required." };

  const type = TYPES.includes(input.type as MetricType)
    ? (input.type as MetricType)
    : "bool";
  const key =
    (input.key?.trim() || label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || `metric_${Math.round(Date.now() / 1000)}`;

  const supabase = createServiceClient();
  const { error } = await supabase.from("tracking_metrics").insert({ key, label, type });
  if (error) {
    if (error.code === "23505") return { error: `A metric keyed "${key}" already exists.` };
    return { error: error.message };
  }
  revalidatePath("/tracking");
  return {};
}

export async function deactivateMetric(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tracking_metrics")
    .update({ active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tracking");
}
