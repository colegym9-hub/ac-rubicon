"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { ProgressMode, ProjectStatus, ProjectUpdate } from "@/lib/database.types";
import {
  asCategory,
  asDate,
  clampPriority,
  clampProgress,
  PROJECT_STATUSES,
} from "@/lib/data/validate";
import {
  insertTask,
  scheduleTaskToday,
  setTaskDone,
  updateTaskPriority,
} from "@/lib/data/mutations";

export type ActionResult = { error?: string };

// Revalidate the board AND every nested project detail page.
function refresh() {
  revalidatePath("/projects", "layout");
}

// ── Projects ────────────────────────────────────────────────────────────────

export async function createProject(input: {
  name: string;
  category?: string | null;
  priority?: number;
  dueDate?: string | null;
}): Promise<ActionResult> {
  const name = input.name?.trim();
  if (!name) return { error: "Project name is required." };

  const supabase = createServiceClient();
  const { error } = await supabase.from("projects").insert({
    name,
    category: asCategory(input.category),
    priority: clampPriority(input.priority ?? 3),
    target_date: asDate(input.dueDate),
  });
  if (error) return { error: error.message };

  refresh();
  return {};
}

export async function updateProject(
  id: string,
  patch: {
    name?: string;
    priority?: number;
    category?: string | null;
    status?: string;
    dueDate?: string | null;
  },
): Promise<ActionResult> {
  const update: ProjectUpdate = {};
  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (!name) return { error: "Project name is required." };
    update.name = name;
  }
  if (patch.priority != null) update.priority = clampPriority(patch.priority);
  if (patch.category !== undefined) update.category = asCategory(patch.category);
  if (patch.dueDate !== undefined) update.target_date = asDate(patch.dueDate);
  if (patch.status && PROJECT_STATUSES.includes(patch.status as ProjectStatus)) {
    update.status = patch.status as ProjectStatus;
  }
  if (Object.keys(update).length === 0) return {};

  const supabase = createServiceClient();
  const { error } = await supabase.from("projects").update(update).eq("id", id);
  if (error) return { error: error.message };

  refresh();
  return {};
}

/** Move the progress slider — switches the project to manual mode. */
export async function setProjectProgress(id: string, value: number): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("projects")
    .update({ progress: clampProgress(value), progress_mode: "manual" })
    .eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Toggle whether progress is auto (from subtasks) or manual (slider). */
export async function setProjectProgressMode(id: string, mode: ProgressMode): Promise<ActionResult> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("projects")
    .update({ progress_mode: mode === "manual" ? "manual" : "auto" })
    .eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteProject(id: string): Promise<void> {
  // tasks.project_id is ON DELETE SET NULL — a deleted project's tasks fall
  // back to the Inbox rather than being lost.
  const supabase = createServiceClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

// ── Tasks ─────────────────────────────────────────────────────────────────
// Write logic lives in lib/data/mutations.ts (shared with the MCP tools); these
// server actions are thin wrappers that add page revalidation. deleteTask stays
// here (intentionally not exposed via MCP).

export async function createTask(input: {
  title: string;
  projectId?: string | null;
  priority?: number;
  effort?: string;
  due?: string | null;
}): Promise<ActionResult> {
  const res = await insertTask(input);
  if (!res.error) refresh();
  return res;
}

export async function toggleTaskDone(id: string, done: boolean): Promise<void> {
  const res = await setTaskDone(id, done);
  if (res.error) throw new Error(res.error);
  refresh();
}

export async function setTaskPriority(id: string, priority: number): Promise<void> {
  const res = await updateTaskPriority(id, priority);
  if (res.error) throw new Error(res.error);
  refresh();
}

export async function sendTaskToToday(id: string): Promise<void> {
  const res = await scheduleTaskToday(id);
  if (res.error) throw new Error(res.error);
  refresh();
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
