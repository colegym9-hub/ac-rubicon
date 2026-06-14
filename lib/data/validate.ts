// Shared, pure validators for project/task writes. Used by BOTH the server
// actions (app/*/actions.ts) and the MCP mutation core (lib/data/mutations.ts)
// so coercion/clamping rules live in exactly one place.

import type { ProjectCategory, ProjectStatus, TaskEffort } from "@/lib/database.types";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const CATEGORIES: ProjectCategory[] = ["finite", "system", "habit", "later"];
export const EFFORTS: TaskEffort[] = ["quick", "slot", "deep"];
export const PROJECT_STATUSES: ProjectStatus[] = ["active", "someday", "done", "archived"];

/** Round + clamp a priority into the stored 1–5 range (defaults to 3). */
export function clampPriority(value: unknown): number {
  const p = Math.round(Number(value));
  if (!Number.isFinite(p)) return 3;
  return Math.min(5, Math.max(1, p));
}

/** Round + clamp a progress percentage into 0–100 (defaults to 0). */
export function clampProgress(value: unknown): number {
  const p = Math.round(Number(value));
  if (!Number.isFinite(p)) return 0;
  return Math.min(100, Math.max(0, p));
}

export function asCategory(value: unknown): ProjectCategory | null {
  return CATEGORIES.includes(value as ProjectCategory) ? (value as ProjectCategory) : null;
}

export function asDate(value: unknown): string | null {
  return typeof value === "string" && DATE_RE.test(value) ? value : null;
}

/** Coerce to a valid task effort, defaulting to "slot". */
export function asEffort(value: unknown): TaskEffort {
  return EFFORTS.includes(value as TaskEffort) ? (value as TaskEffort) : "slot";
}
