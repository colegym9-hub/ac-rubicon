"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { MetricType } from "@/lib/database.types";
import { writeMetricValue } from "@/lib/data/mutations";

export type ActionResult = { error?: string };

const TYPES: MetricType[] = ["bool", "count", "scale", "duration", "note"];

/** Upsert today's entry for a metric. Logic lives in lib/data/mutations.ts
 *  (shared with the MCP set_metric_value tool); this wrapper adds revalidation. */
export async function setMetricValue(
  metricId: string,
  value: { valueNum?: number | null; valueText?: string | null },
): Promise<ActionResult> {
  const res = await writeMetricValue(metricId, value);
  if (!res.error) revalidatePath("/tracking");
  return res;
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
