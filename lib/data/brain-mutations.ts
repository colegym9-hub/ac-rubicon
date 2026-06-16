import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

// DB-write core for the brain/wiki — plain async functions shared by the in-app
// ingest (lib/brain/ingest.ts) and the MCP tools (lib/mcp/brain-tools.ts), so the
// version-bump + junction logic has a single source of truth.

export type BrainWriteResult = { error?: string };

export type SourceStatus =
  | "raw"
  | "converting"
  | "converted"
  | "ingesting"
  | "ingested"
  | "needs_review"
  | "error";

/** Create or update a wiki page. content_md is the FULL new page body (callers
 *  append their source entry to the existing content). Bumps version + stamps
 *  last_ingested_at. */
export async function upsertWikiPage(input: {
  slug: string;
  title: string;
  domain: string;
  overview?: string | null;
  content_md: string;
  relatedSlugs?: string[];
}): Promise<BrainWriteResult> {
  const sb = createServiceClient();
  const { data: cur } = await sb.from("wiki_pages").select("version").eq("slug", input.slug).maybeSingle();
  const { error } = await sb.from("wiki_pages").upsert(
    {
      slug: input.slug,
      title: input.title,
      domain: input.domain,
      content_md: input.content_md,
      ...(input.overview !== undefined ? { overview: input.overview } : {}),
      ...(input.relatedSlugs ? { related_slugs: input.relatedSlugs } : {}),
      version: (cur?.version ?? 0) + 1,
      last_ingested_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );
  return error ? { error: error.message } : {};
}

/** Record that a raw source fed a wiki page (powers the 'Filed to [page]' badge
 *  + the page's Sources list). Call after upsertWikiPage. */
export async function linkSourceToPage(input: {
  sourceId: string;
  pageSlug: string;
  contribution?: "added" | "updated" | "confirmed";
}): Promise<BrainWriteResult> {
  const sb = createServiceClient();
  const { data: page } = await sb.from("wiki_pages").select("id, version").eq("slug", input.pageSlug).maybeSingle();
  if (!page) return { error: "page not found" };
  const { error } = await sb.from("raw_source_wiki_pages").upsert(
    {
      source_id: input.sourceId,
      page_id: page.id,
      contribution: input.contribution ?? "added",
      page_version: page.version,
    },
    { onConflict: "source_id,page_id" },
  );
  return error ? { error: error.message } : {};
}

/** Set a raw source's status (+ optional error message). */
export async function setSourceStatus(
  id: string,
  status: SourceStatus,
  errorMsg?: string | null,
): Promise<BrainWriteResult> {
  const sb = createServiceClient();
  const { error } = await sb
    .from("raw_sources")
    .update({ status, ...(errorMsg !== undefined ? { error_msg: errorMsg } : {}) })
    .eq("id", id);
  return error ? { error: error.message } : {};
}

/** Append a row to the brain activity log. */
export async function appendBrainLog(input: {
  operation: "ingest" | "query" | "lint" | "create" | "update" | "archive" | "error";
  summary: string;
  targetType?: "raw_source" | "wiki_page" | "brain" | null;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<BrainWriteResult> {
  const sb = createServiceClient();
  const { error } = await sb.from("brain_log").insert({
    operation: input.operation,
    summary: input.summary,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    meta: input.meta ?? {},
  });
  return error ? { error: error.message } : {};
}

/** Add a background note to an active project (ingest feeds projects when a
 *  source is clearly relevant to what Cole's building). */
export async function addProjectNote(input: {
  projectId: string;
  content: string;
  sourceId?: string | null;
}): Promise<BrainWriteResult> {
  const sb = createServiceClient();
  const { error } = await sb.from("project_notes").insert({
    project_id: input.projectId,
    content_md: input.content,
    source_id: input.sourceId ?? null,
  });
  return error ? { error: error.message } : {};
}
