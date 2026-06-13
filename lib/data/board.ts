import "server-only";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Project, TaskWithWeight } from "@/lib/database.types";

export type ProjectWithTasks = Project & { tasks: TaskWithWeight[] };

export type Board = {
  configured: boolean;
  projects: ProjectWithTasks[];
  inbox: TaskWithWeight[];
};

/**
 * The Projects/Tasks board: non-archived projects (priority desc) each with
 * their open tasks (effective-weight desc), plus one-off Inbox tasks
 * (project_id null). Dropped tasks are hidden; done tasks sink to the bottom
 * (weight 0). Returns configured:false (not a throw) when Supabase env is
 * absent, so the page renders an empty shell pre-service-role-key.
 */
export async function getBoard(): Promise<Board> {
  if (!isSupabaseConfigured()) {
    return { configured: false, projects: [], inbox: [] };
  }

  const supabase = createServiceClient();
  const [projectsRes, tasksRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .neq("status", "archived")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("task_weights")
      .select("*")
      .neq("status", "dropped")
      .order("weight", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);

  // Bucket tasks by project. A task with project_id === null is an Inbox
  // one-off. A task whose project_id points to an archived/excluded project
  // is intentionally NOT surfaced here (archiving a project puts its tasks
  // away too) — to bring them back, un-archive the project or delete it
  // (delete sets project_id null → the tasks return to the Inbox).
  const byProject = new Map<string, TaskWithWeight[]>();
  const inbox: TaskWithWeight[] = [];
  for (const task of tasksRes.data ?? []) {
    if (task.project_id) {
      const list = byProject.get(task.project_id) ?? [];
      list.push(task);
      byProject.set(task.project_id, list);
    } else {
      inbox.push(task);
    }
  }

  const projects = (projectsRes.data ?? []).map((project) => ({
    ...project,
    tasks: byProject.get(project.id) ?? [],
  }));

  return { configured: true, projects, inbox };
}
