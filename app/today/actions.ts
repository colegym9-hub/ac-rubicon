"use server";

import { revalidatePath } from "next/cache";
import { writeDayPlan, writeRecap } from "@/lib/data/mutations";
import { getBlocksForDate } from "@/lib/data/today";
import { saveWeeklyPlan } from "@/lib/data/sops";
import type { DayBlock } from "@/lib/day";

export type ActionResult = { error?: string };

export async function saveDayPlan(blocks: DayBlock[], date?: string): Promise<ActionResult> {
  const res = await writeDayPlan(blocks, { source: "edited", date });
  if (!res.error) revalidatePath("/today");
  return res;
}

export async function fetchBlocksForDate(date: string): Promise<{ blocks: DayBlock[] }> {
  const blocks = await getBlocksForDate(date);
  return { blocks };
}

export async function saveRecap(input: {
  recap?: string;
  energy?: number | null;
  slotsDone?: number | null;
  slotsSlipped?: string;
}): Promise<ActionResult> {
  const res = await writeRecap(input);
  if (!res.error) revalidatePath("/today");
  return res;
}

/** Save a recap for a specific date (the morning check-in fills out yesterday). */
export async function saveRecapForDate(
  date: string,
  input: {
    recap?: string;
    energy?: number | null;
    slotsDone?: number | null;
    slotsSlipped?: string;
  },
): Promise<ActionResult> {
  const res = await writeRecap(input, date);
  if (!res.error) revalidatePath("/today");
  return res;
}

/** Save/update the weekly context brain-dump that the planner routine reads. */
export async function updateWeeklyPlan(content: string): Promise<ActionResult> {
  try {
    await saveWeeklyPlan(content);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save weekly plan." };
  }
  revalidatePath("/today");
  return {};
}
