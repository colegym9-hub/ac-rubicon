import "server-only";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { DailyLog, TaskWithWeight } from "@/lib/database.types";
import { type DayBlock, sortBlocks, todayISO } from "@/lib/day";

const TOP_TASK_LIMIT = 20;
const ADHERENCE_DAYS = 7;

export type AdherenceDay = { date: string; planned: number; done: number };
export type ContextProject = {
  id: string;
  name: string;
  priority: number;
  category: string | null;
};
export type ContextMetric = { key: string; label: string; type: string };

export type PlanningContext = {
  configured: boolean;
  date: string; // today, app timezone
  yesterday: string;
  alreadyPlanned: boolean;
  todayPlanSource: "auto" | "edited" | null; // "edited" = Cole hand-tuned it; don't clobber
  todayBlocks: DayBlock[];
  lastRecap: DailyLog | null; // yesterday's recap/log — "tomorrow responds"
  scheduledToday: TaskWithWeight[];
  topTasks: TaskWithWeight[]; // top unblocked todo/doing tasks by weight
  activeProjects: ContextProject[];
  activeMetrics: ContextMetric[];
  recentAdherence: AdherenceDay[]; // last 7 days planned vs done
};

/** Add `delta` days to an ISO date via a noon-UTC anchor (DST-safe). */
function isoPlusDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function parseBlocks(value: unknown): DayBlock[] {
  return Array.isArray(value) ? (value as DayBlock[]) : [];
}

/** One-call bundle of everything the day-planner routine needs, so the routine
 *  makes a single MCP call instead of stitching get_board/get_today/etc.
 *  together. The planning *logic* lives in the routine prompt; this is the data. */
export async function getPlanningContext(): Promise<PlanningContext> {
  const date = todayISO();
  const yesterday = isoPlusDays(date, -1);
  const adherenceCutoff = isoPlusDays(date, -(ADHERENCE_DAYS - 1));

  const empty: PlanningContext = {
    configured: false,
    date,
    yesterday,
    alreadyPlanned: false,
    todayPlanSource: null,
    todayBlocks: [],
    lastRecap: null,
    scheduledToday: [],
    topTasks: [],
    activeProjects: [],
    activeMetrics: [],
    recentAdherence: [],
  };
  if (!isSupabaseConfigured()) return empty;

  const supabase = createServiceClient();
  const [planRes, recapRes, topRes, schedRes, projectsRes, metricsRes, adherenceRes] =
    await Promise.all([
      supabase.from("daily_plans").select("blocks, source").eq("date", date).maybeSingle(),
      supabase.from("daily_logs").select("*").eq("date", yesterday).maybeSingle(),
      supabase
        .from("task_weights")
        .select("*")
        .in("status", ["todo", "doing"])
        .order("weight", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(TOP_TASK_LIMIT),
      supabase
        .from("task_weights")
        .select("*")
        .eq("scheduled_for", date)
        .neq("status", "dropped")
        .order("weight", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name, priority, category")
        .eq("status", "active")
        .order("priority", { ascending: false }),
      supabase
        .from("tracking_metrics")
        .select("key, label, type")
        .eq("active", true)
        .order("sort", { ascending: true }),
      supabase.from("daily_plans").select("date, blocks").gte("date", adherenceCutoff),
    ]);

  if (planRes.error) throw new Error(planRes.error.message);
  if (recapRes.error) throw new Error(recapRes.error.message);
  if (topRes.error) throw new Error(topRes.error.message);
  if (schedRes.error) throw new Error(schedRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (metricsRes.error) throw new Error(metricsRes.error.message);
  if (adherenceRes.error) throw new Error(adherenceRes.error.message);

  const recentAdherence: AdherenceDay[] = (adherenceRes.data ?? [])
    .map((p) => {
      const blocks = parseBlocks(p.blocks);
      return {
        date: p.date as string,
        planned: blocks.length,
        done: blocks.filter((b) => b?.done).length,
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return {
    configured: true,
    date,
    yesterday,
    alreadyPlanned: Boolean(planRes.data),
    todayPlanSource: planRes.data?.source ?? null,
    todayBlocks: sortBlocks(parseBlocks(planRes.data?.blocks)),
    lastRecap: recapRes.data ?? null,
    scheduledToday: schedRes.data ?? [],
    topTasks: topRes.data ?? [],
    activeProjects: projectsRes.data ?? [],
    activeMetrics: metricsRes.data ?? [],
    recentAdherence,
  };
}
