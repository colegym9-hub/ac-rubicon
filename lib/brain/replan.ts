import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import { getSop } from "@/lib/data/sops";
import { getPlanningContext } from "@/lib/data/planning";
import { writeDayPlan } from "@/lib/data/mutations";
import { nowHHMM } from "@/lib/day";

// "Re-plan from now" — was a cloud routine (replan-day.md), now a direct Anthropic
// call so the day re-flows the instant Cole taps the button. Scheduled planning
// (daily/weekly) stays on cloud routines; this is on-demand, so it uses the API.

const MODEL = "claude-sonnet-4-6";

// Used when Cole hasn't written a replan SOP in-app yet (the seeded one is a stub).
// Mirrors routines/replan-day.md so behavior matches the old routine.
const DEFAULT_REPLAN_SOP = `You are Cole's re-plan routine. Something changed the day — a call ran long, gym moved, energy tanked. Take what's LEFT of today and re-flow it around the disruption while keeping the same priorities. The plan adapts; it does not fail. Cole should finish feeling like the day moved with him, not like he's behind.

Rules:
- Partition today's blocks: any block whose end time is at/before the current time, OR marked done, is FROZEN — copy it into the output verbatim, no edits. Everything else is yours to redesign.
- Design only the time from now forward, bounded by time_left (a hard ceiling — never schedule past it). The first future block starts at or after the current time.
- The priority list does NOT change — only when things happen. Keep the big things from the remaining blocks + top_tasks.
- Account for what_changed directly: "skipping gym" → remove the gym block (let the time breathe); "call at 4" → place an event block and plan around it; "low energy" → reduce deep-work load; "ran late on X" → give X the time it still needs, then flow the rest.
- Leave slack. Don't pack the remaining hours. 3–5 future blocks is usually right (fewer if time_left is short).
- Frame the rationale so Cole never feels behind: the plan adapted, he didn't miss something.
- All times Eastern, 24h "HH:MM". start < end, no overlaps.
- Call save_replan with the FULL ordered block list: frozen past/done blocks first, then the newly designed future blocks, chronological.`;

const REPLAN_TOOL: Anthropic.Tool = {
  name: "save_replan",
  description:
    "Save the re-planned day. Pass the FULL ordered blocks array: frozen past/done blocks first (verbatim), then the newly designed future blocks, in chronological order.",
  input_schema: {
    type: "object",
    properties: {
      blocks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            start: { type: "string", description: 'Eastern 24h "HH:MM"' },
            end: { type: "string", description: 'Eastern 24h "HH:MM"' },
            label: { type: "string", description: "Short human label" },
            kind: { type: "string", enum: ["deep", "light", "break", "gym", "event", "buffer"] },
            taskId: { type: ["string", "null"], description: "Matching task id, or null" },
            rationale: { type: "string", description: "One line (optional)" },
          },
          required: ["start", "end", "label", "kind"],
        },
      },
      rationale: {
        type: "string",
        description: "2–3 sentences: what changed, what you kept, what flexed. Adaptive framing.",
      },
    },
    required: ["blocks", "rationale"],
  },
};

export type ReplanResult = { ok: true; rationale: string } | { ok: false; error: string };

export async function runReplan(input: {
  whatChanged?: string;
  timeLeft?: string;
  date?: string;
}): Promise<ReplanResult> {
  const ctx = await getPlanningContext();
  if (!ctx.configured) return { ok: false, error: "Planning context unavailable." };

  const [cloud, replanSop] = await Promise.all([
    getSop("cloudmd").catch(() => null),
    getSop("replan").catch(() => null),
  ]);

  // Cole's edited SOP wins; fall back to the default when it's still the stub.
  const replanRules =
    replanSop?.content_md && replanSop.content_md.trim().length > 120
      ? replanSop.content_md
      : DEFAULT_REPLAN_SOP;
  const systemText = [cloud?.content_md, replanRules].filter(Boolean).join("\n\n---\n\n");

  const now = nowHHMM();
  const payload = {
    now_eastern: now,
    date: ctx.date,
    what_changed: input.whatChanged ?? null,
    time_left: input.timeLeft ?? null,
    today_blocks: ctx.todayBlocks,
    top_tasks: ctx.topTasks.map((t) => ({
      id: t.id,
      title: t.title,
      weight: t.weight,
      status: t.status,
    })),
    last_recap: ctx.lastRecap,
    active_projects: ctx.activeProjects,
    recent_adherence: ctx.recentAdherence,
  };

  let msg: Anthropic.Message;
  try {
    msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemText,
      tools: [REPLAN_TOOL],
      tool_choice: { type: "tool", name: "save_replan" },
      messages: [
        {
          role: "user",
          content: `Re-plan the rest of today around what changed. Current Eastern time is ${now}.\n\nContext (JSON):\n${JSON.stringify(payload)}`,
        },
      ],
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed." };
  }

  const toolUse = msg.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) return { ok: false, error: "No plan produced." };
  const out = toolUse.input as { blocks?: unknown; rationale?: string };

  // writeDayPlan sanitizes the blocks (drops malformed ones, fills ids). "auto"
  // marks it AI-generated; Cole explicitly asked for this re-plan, so replacing
  // the current plan is intended.
  const res = await writeDayPlan(out.blocks, {
    source: "auto",
    rationale: out.rationale ?? null,
    date: input.date ?? ctx.date,
  });
  if (res.error) return { ok: false, error: res.error };

  return { ok: true, rationale: out.rationale ?? "" };
}
