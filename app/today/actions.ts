"use server";

import { revalidatePath } from "next/cache";
import { writeDayPlan, writeRecap } from "@/lib/data/mutations";
import { getBlocksForDate } from "@/lib/data/today";
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
