"use server";

import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type SearchItem = {
  type: "project" | "task" | "metric";
  id: string;
  label: string;
  href: string;
  sub: string;
};

/**
 * Lightweight search index for the command palette: non-archived projects, open
 * tasks, and active metrics. Personal-scale data, so we load all and fuzzy-filter
 * client-side rather than round-tripping per keystroke. Returns [] when the DB
 * isn't configured (palette still offers commands + navigation).
 */
export async function getCommandIndex(): Promise<SearchItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createServiceClient();
  const [projectsRes, tasksRes, metricsRes] = await Promise.all([
    supabase.from("projects").select("id, name, category").neq("status", "archived"),
    supabase
      .from("tasks")
      .select("id, title, project_id")
      .neq("status", "done")
      .neq("status", "dropped"),
    supabase.from("tracking_metrics").select("id, label").eq("active", true),
  ]);

  const items: SearchItem[] = [];
  for (const p of projectsRes.data ?? []) {
    items.push({
      type: "project",
      id: p.id,
      label: p.name,
      href: `/projects/${p.id}`,
      sub: p.category ?? "project",
    });
  }
  for (const t of tasksRes.data ?? []) {
    items.push({
      type: "task",
      id: t.id,
      label: t.title,
      href: t.project_id ? `/projects/${t.project_id}` : "/projects",
      sub: "task",
    });
  }
  for (const m of metricsRes.data ?? []) {
    items.push({ type: "metric", id: m.id, label: m.label, href: "/tracking", sub: "metric" });
  }
  return items;
}
