import type { ProjectCategory } from "@/lib/database.types";

// Named priority levels (no "P1" — maps the stored smallint 1–5 to labels).
export const PRIORITY_LEVELS: { value: number; label: string }[] = [
  { value: 5, label: "Urgent" },
  { value: 4, label: "High" },
  { value: 3, label: "Medium" },
  { value: 2, label: "Low" },
  { value: 1, label: "Someday" },
];

export function priorityLabel(priority: number): string {
  return PRIORITY_LEVELS.find((l) => l.value === priority)?.label ?? "Medium";
}

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  finite: "Finite",
  system: "System",
  habit: "Habit",
  later: "Later",
};

export const CATEGORY_OPTIONS: { value: ProjectCategory; label: string }[] = [
  { value: "finite", label: "Finite" },
  { value: "system", label: "System" },
  { value: "habit", label: "Habit" },
  { value: "later", label: "Later" },
];

/** Progress % → a discrete status label. */
export function progressStatus(pct: number): string {
  if (pct >= 100) return "Completed";
  if (pct <= 0) return "Not started";
  return "In progress";
}

/** Effective progress for a project: stored slider value (manual) or % of tasks done (auto). */
export function effectiveProgress(
  mode: "auto" | "manual",
  stored: number,
  doneCount: number,
  totalCount: number,
): number {
  if (mode === "manual") return Math.min(100, Math.max(0, stored));
  if (totalCount === 0) return 0;
  return Math.round((doneCount / totalCount) * 100);
}
