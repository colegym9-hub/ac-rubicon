"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  ProjectCategory,
  ProjectStatus,
  ProjectUpdate,
  TaskEffort,
} from "@/lib/database.types";

const CATEGORIES: ProjectCategory[] = ["finite", "system", "habit", "later"];
const EFFORTS: TaskEffort[] = ["quick", "slot", "deep"];
const PROJECT_STATUSES: ProjectStatus[] = [
  "active",
  "someday",
  "done",
  "archived",
];

export type ActionResult = { error?: string };

function clampPriority(value: unknown): number {
  const p = Math.round(Number(value));
  if (!Number.isFinite(p)) return 3;
  return Math.min(5, Math.max(1, p));
}

function asCategory(value: unknown): ProjectCategory | null {
  return CATEGORIES.includes(value as ProjectCategory)
    ? (value as ProjectCategory)
    : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Projects ────────────────────────────────────────────────────────────────

export async function createProject(input: {
  name: string;
  category?: string | null;
  priority?: number;
}): Promise<ActionResult> {
  const name = input.name?.trim();
  if (!name) return { error: "Project name is required." };

  const supabase = createServiceClient();
  const { error } = await supabase.from("projects").insert({
    name,
    category: asCategory(input.category),
    priority: clampPriority(input.priority ?? 3),
  });
  if (error) return { error: error.message };

  revalidatePath("/projects");
  return {};
}

export async function updateProject(
  id: string,
  patch: {
    name?: string;
    priority?: number;
    category?: string | null;
    status?: string;
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
  if (patch.status && PROJECT_STATUSES.includes(patch.status as ProjectStatus)) {
    update.status = patch.status as ProjectStatus;
  }
  if (Object.keys(update).length === 0) return {};

  const supabase = createServiceClient();
  const { error } = await supabase.from("projects").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/projects");
  return {};
}

export async function deleteProject(id: string): Promise<void> {
  // tasks.project_id is ON DELETE SET NULL — a deleted project's tasks fall
  // back to the Inbox rather than being lost.
  const supabase = createServiceClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

// ── Tasks ─────────────────────────────────────────────────────────────────

export async function createTask(input: {
  title: string;
  projectId?: string | null;
  priority?: number;
  effort?: string;
  due?: string | null;
}): Promise<ActionResult> {
  const title = input.title?.trim();
  if (!title) return { error: "Task title is required." };

  const effort = EFFORTS.includes(input.effort as TaskEffort)
    ? (input.effort as TaskEffort)
    : "slot";
  const due = input.due && DATE_RE.test(input.due) ? input.due : null;

  const supabase = createServiceClient();
  const { error } = await supabase.from("tasks").insert({
    title,
    project_id: input.projectId ?? null,
    priority: clampPriority(input.priority ?? 3),
    effort,
    due,
  });
  if (error) return { error: error.message };

  revalidatePath("/projects");
  return {};
}

export async function toggleTaskDone(id: string, done: boolean): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "todo",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function setTaskPriority(
  id: string,
  priority: number,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tasks")
    .update({ priority: clampPriority(priority) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function sendTaskToToday(id: string): Promise<void> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("tasks")
    .update({ scheduled_for: today })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}
