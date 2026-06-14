"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { BLOCK_KINDS, type BlockKind, type DayBlock, todayISO } from "@/lib/day";

export type ActionResult = { error?: string };

const KINDS = new Set<string>(BLOCK_KINDS);
const HHMM = /^\d{1,2}:\d{2}$/;

function sanitizeBlocks(input: unknown): DayBlock[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    .map((x) => ({
      id: typeof x.id === "string" && x.id ? x.id : crypto.randomUUID(),
      start: String(x.start ?? ""),
      end: String(x.end ?? ""),
      label: String(x.label ?? "").slice(0, 200),
      kind: (KINDS.has(String(x.kind)) ? String(x.kind) : "light") as BlockKind,
      taskId: x.taskId ? String(x.taskId) : null,
      rationale: x.rationale ? String(x.rationale).slice(0, 300) : null,
      done: Boolean(x.done),
    }))
    .filter((b) => b.label && HHMM.test(b.start) && HHMM.test(b.end));
}

export async function saveDayPlan(blocks: DayBlock[]): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("daily_plans")
    .upsert(
      { date: todayISO(), blocks: sanitizeBlocks(blocks), source: "edited" },
      { onConflict: "date" },
    );
  if (error) return { error: error.message };
  revalidatePath("/today");
  return {};
}

export async function saveRecap(input: {
  recap?: string;
  energy?: number | null;
  slotsDone?: number | null;
  slotsSlipped?: string;
}): Promise<ActionResult> {
  const energy =
    input.energy == null
      ? null
      : Math.min(5, Math.max(1, Math.round(Number(input.energy))));
  const slotsDone =
    input.slotsDone == null
      ? null
      : Math.max(0, Math.round(Number(input.slotsDone)));

  const supabase = createServiceClient();
  const { error } = await supabase.from("daily_logs").upsert(
    {
      date: todayISO(),
      recap_text: input.recap?.trim() || null,
      energy,
      slots_done: slotsDone,
      slots_slipped: input.slotsSlipped?.trim() || null,
    },
    { onConflict: "date" },
  );
  if (error) return { error: error.message };
  revalidatePath("/today");
  return {};
}
