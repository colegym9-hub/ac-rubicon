import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

// Best-effort wake-up for a Claude Code cloud routine. The app writes the actual
// request to a Supabase queue (raw_sources / brain_chats / replan_requests); this
// just pings the routine to process it now. If the routine isn't wired yet (env
// unset), it no-ops and returns false — the queued row persists and a scheduled
// sweep picks it up later. Never throws.

export type RoutineKey = "process" | "chat" | "replan";

export async function fireRoutine(key: RoutineKey): Promise<boolean> {
  const prefix = `BRAIN_${key.toUpperCase()}`;
  const url = process.env[`${prefix}_FIRE_URL`];
  const token = process.env[`${prefix}_TOKEN`];
  if (!url || !token) return false;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: "ac-rubicon", key }),
      signal: AbortSignal.timeout(2500),
    });
    return true;
  } catch {
    return false; // fire-and-forget; the queue row is the source of truth
  }
}

/** Fire process-brain at most once per ~30s. A single run drains the whole
 *  queue, so quick-succession captures = one ping, not many. Atomic: only the
 *  caller that flips the stale lock row actually fires. */
export async function fireProcessDebounced(): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("brain_run_lock")
      .update({ fired_at: new Date().toISOString() })
      .eq("id", true)
      .lt("fired_at", new Date(Date.now() - 30_000).toISOString())
      .select("id");
    if (data && data.length) await fireRoutine("process");
  } catch {
    // never block a capture on the ping
  }
}
