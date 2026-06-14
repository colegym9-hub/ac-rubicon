import "server-only";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Project, TaskWithWeight } from "@/lib/database.types";
import { effectiveProgress } from "@/lib/labels";

export type ProjectDetail = {
  project: Project;
  tasks: TaskWithWeight[];
  total: number;
  done: number;
  progressPct: number;
};

export type ProjectDetailResult = {
  configured: boolean;
  detail: ProjectDetail | null; // null = not found (when configured)
};

export async function getProject(id: string): Promise<ProjectDetailResult> {
  if (!isSupabaseConfigured()) return { configured: false, detail: null };

  const supabase = createServiceClient();
  const [projectRes, tasksRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("task_weights")
      .select("*")
      .eq("project_id", id)
      .neq("status", "dropped")
      .order("weight", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (projectRes.error) throw new Error(projectRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (!projectRes.data) return { configured: true, detail: null };

  const project = projectRes.data as Project;
  const tasks = tasksRes.data ?? [];
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;

  return {
    configured: true,
    detail: {
      project,
      tasks,
      total,
      done,
      progressPct: effectiveProgress(project.progress_mode, project.progress, done, total),
    },
  };
}
