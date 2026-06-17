import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import {
  addDaysISO,
  BLOCK_KINDS,
  type BlockKind,
  type DayBlock,
  toMinutes,
  todayISO,
} from "@/lib/day";
import type { PlanSource } from "@/lib/database.types";
import { asDate, asEffort, clampPriority } from "@/lib/data/validate";

// The DB-write core. Plain async functions (no `revalidatePath`, no request
// context) so they can be called from BOTH the server actions and the MCP
// tools. The server actions are thin wrappers that add page revalidation.

/** Empty on success, `{ error }` on failure. */
export type MutationResult = { error?: string };

const KINDS = new Set<string>(BLOCK_KINDS);

/** Normalize an untrusted blocks array into well-formed DayBlocks — the single
 *  source of truth for plan sanitization (Today action + MCP save_day_plan). */
export function sanitizeBlocks(input: unknown): DayBlock[] {
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
    .filter((b) => b.label && toMinutes(b.start) >= 0 && toMinutes(b.end) > toMinutes(b.start));
}

// ── Today: plan + recap ───────────────────────────────────────────────────────

export async function writeDayPlan(
  blocks: unknown,
  opts?: { source?: PlanSource; rationale?: string | null; date?: string },
): Promise<MutationResult> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("daily_plans").upsert(
    {
      date: opts?.date ?? todayISO(),
      blocks: sanitizeBlocks(blocks),
      source: opts?.source ?? "edited",
      // Only touch rationale when explicitly provided (omitting keeps any existing value).
      ...(opts?.rationale !== undefined ? { rationale: opts.rationale } : {}),
    },
    { onConflict: "date" },
  );
  return error ? { error: error.message } : {};
}

export async function writeRecap(
  input: {
    recap?: string;
    energy?: number | null;
    slotsDone?: number | null;
    slotsSlipped?: string;
    // Optional per-day log fields + block completion ({fields, blocks}); only
    // touched when provided, so an MCP recap without it never clobbers UI extras.
    extra?: Record<string, unknown> | null;
    // The log's "Tomorrow" field: written onto *tomorrow's* row as plan_note.
    // Only touched when provided; "" clears it. undefined leaves it alone.
    tomorrowNote?: string | null;
  },
  date?: string, // defaults to today; pass an ISO date to log a past day (morning check-in)
): Promise<MutationResult> {
  const energy =
    input.energy == null
      ? null
      : Math.min(5, Math.max(1, Math.round(Number(input.energy))));
  const slotsDone =
    input.slotsDone == null
      ? null
      : Math.max(0, Math.round(Number(input.slotsDone)));

  const day = date ?? todayISO();
  const supabase = createServiceClient();

  // The day's own row: recap columns (+ extra when provided). Listing only these
  // columns means a separate plan_note write on the same row is never clobbered.
  const row: {
    date: string;
    recap_text: string | null;
    energy: number | null;
    slots_done: number | null;
    slots_slipped: string | null;
    extra?: Record<string, unknown> | null;
  } = {
    date: day,
    recap_text: input.recap?.trim() || null,
    energy,
    slots_done: slotsDone,
    slots_slipped: input.slotsSlipped?.trim() || null,
  };
  if (input.extra !== undefined) row.extra = input.extra;

  const { error } = await supabase
    .from("daily_logs")
    .upsert(row, { onConflict: "date" });
  if (error) return { error: error.message };

  // "Tomorrow" → tomorrow's plan_note. Separate upsert (only the date + plan_note
  // columns) so it never disturbs tomorrow's own recap, and vice-versa.
  if (input.tomorrowNote !== undefined) {
    const { error: noteErr } = await supabase
      .from("daily_logs")
      .upsert(
        { date: addDaysISO(day, 1), plan_note: input.tomorrowNote?.trim() || null },
        { onConflict: "date" },
      );
    if (noteErr) return { error: noteErr.message };
  }

  return {};
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function insertTask(input: {
  title: string;
  projectId?: string | null;
  priority?: number;
  effort?: string;
  due?: string | null;
}): Promise<MutationResult> {
  const title = input.title?.trim();
  if (!title) return { error: "Task title is required." };

  const supabase = createServiceClient();
  const { error } = await supabase.from("tasks").insert({
    title,
    project_id: input.projectId ?? null,
    priority: clampPriority(input.priority ?? 3),
    effort: asEffort(input.effort),
    due: asDate(input.due),
  });
  return error ? { error: error.message } : {};
}

export async function setTaskDone(id: string, done: boolean): Promise<MutationResult> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "todo",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);
  return error ? { error: error.message } : {};
}

export async function updateTaskPriority(id: string, priority: number): Promise<MutationResult> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tasks")
    .update({ priority: clampPriority(priority) })
    .eq("id", id);
  return error ? { error: error.message } : {};
}

export async function scheduleTaskToday(id: string): Promise<MutationResult> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tasks")
    .update({ scheduled_for: todayISO() })
    .eq("id", id);
  return error ? { error: error.message } : {};
}

// ── Tracking ──────────────────────────────────────────────────────────────────

/** Upsert today's entry for a metric. Only provided fields are written, so
 *  toggling a value never clobbers an existing note. */
export async function writeMetricValue(
  metricId: string,
  value: { valueNum?: number | null; valueText?: string | null },
): Promise<MutationResult> {
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
  return error ? { error: error.message } : {};
}
