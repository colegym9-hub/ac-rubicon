"use server";

import { revalidatePath } from "next/cache";
import { writeDayPlan, writeRecap, writeReplanRequest } from "@/lib/data/mutations";
import { getBlocksForDate } from "@/lib/data/today";
import { fireRoutine } from "@/lib/brain/routine";
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

/** Queue a two-question "re-plan from now" and wake the brain routine to rewrite
 *  the rest of today's plan. Returns the request id (for optional polling). */
export async function replanFromNow(input: {
  whatChanged?: string;
  timeLeft?: string;
}): Promise<ActionResult & { id?: string }> {
  const res = await writeReplanRequest({
    whatChanged: input.whatChanged,
    timeLeft: input.timeLeft,
  });
  if (res.error) return { error: res.error };
  await fireRoutine("replan");
  revalidatePath("/today");
  return { id: res.id };
}
