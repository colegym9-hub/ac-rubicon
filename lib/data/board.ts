import "server-only";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Project, TaskWithWeight } from "@/lib/database.types";
import { PRIORITY_LEVELS, effectiveProgress } from "@/lib/labels";

export type ProjectCard = Project & {
  total: number;
  done: number;
  progressPct: number;
};

export type PriorityColumn = {
  value: number;
  label: string;
  projects: ProjectCard[];
};

export type Board = {
  configured: boolean;
  columns: PriorityColumn[];
  inbox: TaskWithWeight[];
};

function emptyColumns(): PriorityColumn[] {
  return PRIORITY_LEVELS.map((l) => ({ value: l.value, label: l.label, projects: [] }));
}

function byDueThenCreated(a: ProjectCard, b: ProjectCard): number {
  const ad = a.target_date ?? "9999-12-31";
  const bd = b.target_date ?? "9999-12-31";
  if (ad !== bd) return ad < bd ? -1 : 1;
  return a.created_at < b.created_at ? -1 : 1;
}

/** The priority board: non-archived projects grouped into priority columns
 *  (each with task counts + effective progress), plus one-off Inbox tasks. */
export async function getBoard(): Promise<Board> {
  if (!isSupabaseConfigured()) {
    return { configured: false, columns: emptyColumns(), inbox: [] };
  }

  const supabase = createServiceClient();
  const [projectsRes, tasksRes] = await Promise.all([
    supabase.from("projects").select("*").neq("status", "archived"),
    supabase
      .from("task_weights")
      .select("*")
      .neq("status", "dropped")
      .order("weight", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);

  const counts = new Map<string, { total: number; done: number }>();
  const inbox: TaskWithWeight[] = [];
  for (const task of tasksRes.data ?? []) {
    if (!task.project_id) {
      inbox.push(task);
      continue;
    }
    const c = counts.get(task.project_id) ?? { total: 0, done: 0 };
    c.total += 1;
    if (task.status === "done") c.done += 1;
    counts.set(task.project_id, c);
  }

  const cards: ProjectCard[] = (projectsRes.data ?? []).map((p) => {
    const c = counts.get(p.id) ?? { total: 0, done: 0 };
    return {
      ...p,
      total: c.total,
      done: c.done,
      progressPct: effectiveProgress(p.progress_mode, p.progress, c.done, c.total),
    };
  });

  const columns = PRIORITY_LEVELS.map((level) => ({
    value: level.value,
    label: level.label,
    projects: cards.filter((c) => c.priority === level.value).sort(byDueThenCreated),
  }));

  return { configured: true, columns, inbox };
}
