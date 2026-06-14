import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getBoard } from "@/lib/data/board";
import { getProject } from "@/lib/data/project";
import { getToday } from "@/lib/data/today";
import { getTracking } from "@/lib/data/tracking";
import { getInsights } from "@/lib/data/insights";
import { getPlanningContext } from "@/lib/data/planning";
import {
  insertTask,
  scheduleTaskToday,
  setTaskDone,
  updateTaskPriority,
  writeDayPlan,
  writeMetricValue,
  writeRecap,
  type MutationResult,
} from "@/lib/data/mutations";

/** Wrap any JSON-serializable value as an MCP text result. */
function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

/** Turn a MutationResult into an MCP result (flagging isError on failure). */
function done(res: MutationResult) {
  return res.error
    ? { content: [{ type: "text" as const, text: `Error: ${res.error}` }], isError: true }
    : { content: [{ type: "text" as const, text: "OK" }] };
}

const blockSchema = z.object({
  id: z.string().optional(),
  start: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, '24h "HH:MM"'),
  end: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, '24h "HH:MM"'),
  label: z.string().max(200),
  kind: z.enum(["deep", "light", "break", "gym", "event", "buffer"]).default("light"),
  taskId: z.string().nullable().optional(),
  rationale: z.string().max(300).nullable().optional(),
  done: z.boolean().optional(),
});

/** Register every ac-rubicon MCP tool: 5 reads + 7 non-destructive writes.
 *  No delete/deactivate tools by design — caps blast radius of a leaked token. */
export function registerTools(server: McpServer) {
  // ── Reads ──────────────────────────────────────────────────────────────────
  server.tool(
    "get_board",
    "All non-archived projects grouped into priority columns, plus one-off Inbox tasks.",
    {},
    async () => json(await getBoard()),
  );
  server.tool(
    "get_project",
    "A single project with its weight-sorted tasks and progress.",
    { id: z.string() },
    async ({ id }) => json(await getProject(id)),
  );
  server.tool(
    "get_today",
    "Today's plan blocks, evening recap log, and tasks scheduled for today.",
    {},
    async () => json(await getToday()),
  );
  server.tool(
    "get_tracking",
    "Active tracking metrics with today's logged values.",
    {},
    async () => json(await getTracking()),
  );
  server.tool(
    "get_insights",
    "14-day rollup: task throughput, plan adherence, and numeric-metric trends.",
    {},
    async () => json(await getInsights()),
  );
  server.tool(
    "get_planning_context",
    "ONE-CALL bundle for day planning: today's date, last night's recap, today's existing plan, tasks already scheduled for today, top unblocked tasks by weight, active projects, tracked metrics, and recent plan adherence. Start here when generating a day plan.",
    {},
    async () => json(await getPlanningContext()),
  );

  // ── Writes (non-destructive) ─────────────────────────────────────────────────
  server.tool(
    "save_day_plan",
    "Replace a day's time-blocked plan with the full ordered list of blocks. Defaults to today (app timezone); pass date (YYYY-MM-DD) to target another day. Sets source=auto.",
    {
      blocks: z.array(blockSchema),
      rationale: z.string().max(2000).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    },
    async ({ blocks, rationale, date }) =>
      done(await writeDayPlan(blocks, { source: "auto", rationale, date })),
  );
  server.tool(
    "create_task",
    "Create a task. Omit projectId for an Inbox one-off. priority 1–5, effort quick|slot|deep, due YYYY-MM-DD.",
    {
      title: z.string().min(1),
      projectId: z.string().nullable().optional(),
      priority: z.number().int().min(1).max(5).optional(),
      effort: z.enum(["quick", "slot", "deep"]).optional(),
      due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    },
    async (input) => done(await insertTask(input)),
  );
  server.tool(
    "toggle_task_done",
    "Mark a task done or not-done (sets or clears completed_at).",
    { id: z.string(), done: z.boolean() },
    async ({ id, done: isDone }) => done(await setTaskDone(id, isDone)),
  );
  server.tool(
    "set_task_priority",
    "Set a task's priority (1 = Someday … 5 = Urgent).",
    { id: z.string(), priority: z.number().int().min(1).max(5) },
    async ({ id, priority }) => done(await updateTaskPriority(id, priority)),
  );
  server.tool(
    "send_task_to_today",
    "Schedule a task for today (sets scheduled_for to today's date).",
    { id: z.string() },
    async ({ id }) => done(await scheduleTaskToday(id)),
  );
  server.tool(
    "set_metric_value",
    "Log today's value for a tracking metric — numeric and/or text.",
    {
      metricId: z.string(),
      valueNum: z.number().nullable().optional(),
      valueText: z.string().nullable().optional(),
    },
    async ({ metricId, valueNum, valueText }) =>
      done(await writeMetricValue(metricId, { valueNum, valueText })),
  );
  server.tool(
    "save_recap",
    "Write today's evening recap: free text, energy 1–5, slots done/slipped.",
    {
      recap: z.string().optional(),
      energy: z.number().int().min(1).max(5).nullable().optional(),
      slotsDone: z.number().int().min(0).nullable().optional(),
      slotsSlipped: z.string().optional(),
    },
    async (input) => done(await writeRecap(input)),
  );
}
