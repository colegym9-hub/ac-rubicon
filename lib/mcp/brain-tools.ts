import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createServiceClient } from "@/lib/supabase/server";
import { getSop } from "@/lib/data/sops";
import { getWikiPage, searchWiki } from "@/lib/data/brain";
import { convertSourceById } from "@/lib/brain/convert";
import {
  upsertWikiPage,
  linkSourceToPage,
  setSourceStatus,
  appendBrainLog,
  addProjectNote,
} from "@/lib/data/brain-mutations";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}
function ok(msg = "OK") {
  return { content: [{ type: "text" as const, text: msg }] };
}
function fail(m: string) {
  return { content: [{ type: "text" as const, text: `Error: ${m}` }], isError: true };
}

/** Brain/ingest MCP tools the routines call. All non-destructive. */
export function registerBrainTools(server: McpServer) {
  // ── Reads ────────────────────────────────────────────────────────────────
  server.tool(
    "get_sop",
    "Read a CloudMD doc by key: 'cloudmd' (general brain rules — read first), or a routine's doc: 'ingest' | 'chat' | 'replan' | 'daily' | 'weekly'.",
    { key: z.string() },
    async ({ key }) => {
      const s = await getSop(key);
      return s ? json({ key: s.key, label: s.label, content: s.content_md }) : fail(`No SOP '${key}'`);
    },
  );

  server.tool(
    "get_pending_work",
    "Everything waiting for the routines: raw sources to convert/ingest, pending chat questions, and pending re-plan requests.",
    {},
    async () => {
      const sb = createServiceClient();
      const [src, chats, replans] = await Promise.all([
        sb.from("raw_sources").select("id, type, title, raw_input, content_md, status, retry_count")
          .in("status", ["raw", "converting", "converted", "ingesting"]).order("created_at", { ascending: true }),
        sb.from("brain_chats").select("id, question").eq("status", "pending").order("created_at", { ascending: true }),
        sb.from("replan_requests").select("id, plan_date, what_changed, time_left").eq("status", "pending").order("created_at", { ascending: true }),
      ]);
      return json({ sources: src.data ?? [], questions: chats.data ?? [], replans: replans.data ?? [] });
    },
  );

  server.tool(
    "get_brain_pages",
    "The wiki index — every active page's slug, title, domain, overview. Use it to decide where a source belongs.",
    { domain: z.string().optional() },
    async ({ domain }) => {
      const sb = createServiceClient();
      let q = sb.from("wiki_pages").select("slug, title, domain, overview").eq("status", "active");
      if (domain) q = q.eq("domain", domain);
      const { data, error } = await q.order("domain", { ascending: true });
      return error ? fail(error.message) : json(data ?? []);
    },
  );

  server.tool(
    "get_wiki_page",
    "Read one wiki page in full (content + related slugs + its sources).",
    { slug: z.string() },
    async ({ slug }) => {
      const p = await getWikiPage(slug);
      return p ? json(p) : fail(`No page '${slug}'`);
    },
  );

  server.tool(
    "search_wiki",
    "Full-text search the wiki; returns the most relevant active pages.",
    { query: z.string() },
    async ({ query }) => json(await searchWiki(query)),
  );

  // ── Conversion (app-first; routine falls back on error) ────────────────────
  server.tool(
    "convert_source",
    "Convert a link/video raw source to markdown via Supadata. On success, saves content_md and marks it 'converted'. On error, leaves it 'raw' and returns the error — then YOU (the routine) transcribe/extract it yourself.",
    { id: z.string() },
    async ({ id }) => {
      const r = await convertSourceById(id);
      if (!r.ok) return fail(r.error);
      return ok(r.skipped ? "no conversion needed" : "converted");
    },
  );

  // ── Writes (the routine does its work) ────────────────────────────────────
  server.tool(
    "set_source_status",
    "Set a raw source's status (raw|converting|converted|ingesting|ingested|needs_review|error) + optional error message. 'needs_review' parks it for Cole without touching the wiki.",
    {
      id: z.string(),
      status: z.enum(["raw", "converting", "converted", "ingesting", "ingested", "needs_review", "error"]),
      errorMsg: z.string().nullable().optional(),
    },
    async ({ id, status, errorMsg }) => {
      const res = await setSourceStatus(id, status, errorMsg);
      return res.error ? fail(res.error) : ok();
    },
  );

  server.tool(
    "upsert_wiki_page",
    "Create or update a wiki page. Pass the FULL new content_md (append your source entry to the existing content — read it first with get_wiki_page). Bumps version + last_ingested_at. slug lowercase-hyphenated; domain one of A.C Media|BU|Content|Coursework|Personal Ops|Mindset.",
    {
      slug: z.string(),
      title: z.string(),
      domain: z.string(),
      overview: z.string().nullable().optional(),
      content_md: z.string(),
      relatedSlugs: z.array(z.string()).optional(),
    },
    async ({ slug, title, domain, overview, content_md, relatedSlugs }) => {
      const res = await upsertWikiPage({ slug, title, domain, overview, content_md, relatedSlugs });
      return res.error ? fail(res.error) : ok();
    },
  );

  server.tool(
    "link_source_to_page",
    "Record that a raw source fed a wiki page — powers the capture's 'Filed to [page]' badge + the page's Sources list. Call after upsert_wiki_page.",
    {
      sourceId: z.string(),
      pageSlug: z.string(),
      contribution: z.enum(["added", "updated", "confirmed"]).optional(),
    },
    async ({ sourceId, pageSlug, contribution }) => {
      const res = await linkSourceToPage({ sourceId, pageSlug, contribution });
      return res.error ? fail(res.error) : ok();
    },
  );

  server.tool(
    "append_brain_log",
    "Record a brain operation in the activity log (append-only).",
    {
      operation: z.enum(["ingest", "query", "lint", "create", "update", "archive", "error"]),
      summary: z.string(),
      targetType: z.enum(["raw_source", "wiki_page", "brain"]).nullable().optional(),
      targetId: z.string().nullable().optional(),
      meta: z.record(z.unknown()).optional(),
    },
    async ({ operation, summary, targetType, targetId, meta }) => {
      const res = await appendBrainLog({ operation, summary, targetType, targetId, meta });
      return res.error ? fail(res.error) : ok();
    },
  );

  server.tool(
    "add_project_note",
    "Add a background note to an active project — ONLY when a source is clearly relevant to what Cole's building. sourceId links it to the capture.",
    { projectId: z.string(), content: z.string(), sourceId: z.string().nullable().optional() },
    async ({ projectId, content, sourceId }) => {
      const res = await addProjectNote({ projectId, content, sourceId });
      return res.error ? fail(res.error) : ok();
    },
  );

  server.tool(
    "save_chat_answer",
    "Save the routine's answer to a brain_chat question. Sets status='answered' and clears any error.",
    {
      chatId: z.string(),
      answer: z.string(),
      citations: z.array(z.string()).optional(),
    },
    async ({ chatId, answer, citations }) => {
      const sb = createServiceClient();
      const { error } = await sb.from("brain_chats").update({
        answer,
        status: "answered",
        citations: citations ?? [],
        error_msg: null,
      }).eq("id", chatId);
      return error ? fail(error.message) : ok();
    },
  );

  server.tool(
    "mark_replan_done",
    "Mark a replan_request as completed after the routine has produced and saved the new plan.",
    { replanId: z.string() },
    async ({ replanId }) => {
      const sb = createServiceClient();
      const { error } = await sb.from("replan_requests").update({ status: "done" }).eq("id", replanId);
      return error ? fail(error.message) : ok();
    },
  );

  server.tool(
    "save_lint_report",
    "Persist a weekly lint report — a list of wiki pages that have issues. kind='lint', status='done' (ready to display).",
    {
      weekOf: z.string(),
      issues: z.array(z.object({ slug: z.string(), title: z.string(), issue: z.string() })),
      summary: z.string().optional(),
    },
    async ({ weekOf, issues, summary }) => {
      const sb = createServiceClient();
      const { error } = await sb.from("brain_reports").insert({
        kind: "lint",
        week_of: weekOf,
        issues,
        summary: summary ?? null,
        status: "done",
      });
      return error ? fail(error.message) : ok();
    },
  );

  server.tool(
    "save_insight",
    "Persist a weekly insight report. kind='insight', status='done' (ready to display). The insight string maps to the summary column.",
    {
      weekOf: z.string(),
      insight: z.string(),
    },
    async ({ weekOf, insight }) => {
      const sb = createServiceClient();
      const { error } = await sb.from("brain_reports").insert({
        kind: "insight",
        week_of: weekOf,
        summary: insight,
        status: "done",
      });
      return error ? fail(error.message) : ok();
    },
  );

  server.tool(
    "get_weekly_plan",
    "Read the weekly plan from brain_sops (key='weekly_plan'). Returns { content: string } — empty string if not yet set.",
    {},
    async () => {
      const sb = createServiceClient();
      const { data } = await sb.from("brain_sops").select("content_md").eq("key", "weekly_plan").maybeSingle();
      return json({ content: data?.content_md ?? "" });
    },
  );

  server.tool(
    "save_weekly_plan",
    "Upsert the weekly plan into brain_sops (key='weekly_plan'). Creates the row if absent, overwrites if present.",
    { content: z.string() },
    async ({ content }) => {
      const sb = createServiceClient();
      const { error } = await sb.from("brain_sops").upsert(
        { key: "weekly_plan", label: "Weekly Plan", content_md: content, sort: 99 },
        { onConflict: "key" },
      );
      return error ? fail(error.message) : ok();
    },
  );
}
