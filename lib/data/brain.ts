import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  CaptureSummary,
  CaptureDetail,
  WikiGroup,
  WikiSummary,
  WikiDetail,
  SourceEntry,
  SourceWithStatus,
  PageWithSources,
  PendingSource,
  SourcesByPageResult,
  ChatTurn,
  ConversationSummary,
  ConversationDetail,
} from "@/lib/brain/types";
import type { BrainReport, ProjectNote } from "@/lib/database.types";

const DOMAIN_ORDER = ["A.C Media", "BU", "Content", "Coursework", "Personal Ops", "Mindset"];

// ── Captures (raw sources) ──────────────────────────────────────────────────

/** Recent captures Cole made in the app. Excludes the migrated bulk (tag
 *  'migrated') so the feed stays the live inbox, not the 1,200-source archive. */
export async function getCaptures(limit = 50): Promise<CaptureSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("raw_sources")
    .select("id, type, title, status, error_msg, source_date, created_at")
    .not("tags", "cs", "{migrated}")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCapture(id: string): Promise<CaptureDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("raw_sources")
    .select("id, type, title, status, error_msg, source_date, created_at, content_md, raw_input")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  // Wiki pages this source fed (via the junction).
  const { data: links } = await supabase
    .from("raw_source_wiki_pages")
    .select("page_id")
    .eq("source_id", id);
  const pageIds = (links ?? []).map((l) => l.page_id);
  let pages: { slug: string; title: string }[] = [];
  if (pageIds.length) {
    const { data: wp } = await supabase
      .from("wiki_pages")
      .select("slug, title")
      .in("id", pageIds);
    pages = wp ?? [];
  }
  return { ...data, pages };
}

/** Live status for a single capture — the captures list polls this. */
export async function getCaptureStatus(
  id: string,
): Promise<{ id: string; status: string; error_msg: string | null } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("raw_sources")
    .select("id, status, error_msg")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

// ── Sources by page ─────────────────────────────────────────────────────────

export async function getSourcesByPage(): Promise<SourcesByPageResult> {
  if (!isSupabaseConfigured()) return { groups: [], pending: [] };
  const supabase = createServiceClient();

  // All active wiki pages (lightweight — no content)
  const { data: pages, error: pErr } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, domain")
    .eq("status", "active")
    .order("title");
  if (pErr) throw new Error(pErr.message);

  // All source↔page junction rows
  const { data: links, error: lErr } = await supabase
    .from("raw_source_wiki_pages")
    .select("page_id, source_id");
  if (lErr) throw new Error(lErr.message);

  // Fetch metadata for every linked source
  const sourceIds = [...new Set((links ?? []).map((l) => l.source_id))];
  const sourceMap = new Map<string, SourceWithStatus>();
  if (sourceIds.length) {
    const { data: srcs, error: sErr } = await supabase
      .from("raw_sources")
      .select("id, type, title, created_at, status")
      .in("id", sourceIds)
      .order("created_at", { ascending: false });
    if (sErr) throw new Error(sErr.message);
    for (const s of srcs ?? []) sourceMap.set(s.id, s as SourceWithStatus);
  }

  // Build page → sources index
  const pageSourceIds: Record<string, string[]> = {};
  for (const l of links ?? []) {
    if (!pageSourceIds[l.page_id]) pageSourceIds[l.page_id] = [];
    pageSourceIds[l.page_id].push(l.source_id);
  }

  // Group pages by domain
  const groupMap = new Map<string, PageWithSources[]>();
  for (const p of pages ?? []) {
    const sources = (pageSourceIds[p.id] ?? [])
      .map((sid) => sourceMap.get(sid))
      .filter((s): s is SourceWithStatus => !!s);
    if (!groupMap.has(p.domain)) groupMap.set(p.domain, []);
    groupMap.get(p.domain)!.push({ ...p, sources });
  }

  const rank = (d: string) => {
    const i = DOMAIN_ORDER.indexOf(d);
    return i === -1 ? DOMAIN_ORDER.length : i;
  };
  const groups = [...groupMap.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([domain, ps]) => ({
      domain,
      pages: ps.sort((a, b) => b.sources.length - a.sources.length),
    }));

  // Pending: non-ingested, non-migrated (include content for review)
  const { data: pendingRows, error: pendErr } = await supabase
    .from("raw_sources")
    .select("id, type, title, status, error_msg, raw_input, content_md, created_at")
    .not("status", "eq", "ingested")
    .not("tags", "cs", "{migrated}")
    .order("created_at", { ascending: false });
  if (pendErr) throw new Error(pendErr.message);

  return { groups, pending: (pendingRows ?? []) as PendingSource[] };
}

// ── Wiki ────────────────────────────────────────────────────────────────────

async function _getWikiPages(): Promise<WikiGroup[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, domain, overview, pinned, updated_at")
    .eq("status", "active");
  if (error) throw new Error(error.message);

  const groups = new Map<string, WikiSummary[]>();
  for (const p of data ?? []) {
    if (!groups.has(p.domain)) groups.set(p.domain, []);
    groups.get(p.domain)!.push(p);
  }
  const rank = (d: string) => {
    const i = DOMAIN_ORDER.indexOf(d);
    return i === -1 ? DOMAIN_ORDER.length : i;
  };
  return [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([domain, pages]) => ({
      domain,
      pages: pages.sort((a, b) =>
        a.pinned === b.pinned ? a.title.localeCompare(b.title) : a.pinned ? -1 : 1,
      ),
    }));
}

export const getWikiPages = unstable_cache(_getWikiPages, ["wiki-pages"], { revalidate: 600 });

export async function getWikiPage(slug: string): Promise<WikiDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, domain, overview, content_md, related_slugs, status, pinned, version, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: links } = await supabase
    .from("raw_source_wiki_pages")
    .select("source_id")
    .eq("page_id", data.id);
  const ids = (links ?? []).map((l) => l.source_id);
  let sources: SourceEntry[] = [];
  if (ids.length) {
    const { data: srcs } = await supabase
      .from("raw_sources")
      .select("id, type, title, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    sources = srcs ?? [];
  }
  return { ...data, sources };
}

/** Full-text search over active wiki pages (Postgres FTS — no embeddings). */
export async function searchWiki(query: string, limit = 8): Promise<WikiSummary[]> {
  if (!isSupabaseConfigured() || !query.trim()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, domain, overview, pinned, updated_at")
    .eq("status", "active")
    .textSearch("fts", query, { type: "websearch", config: "english" })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Chat (routine-driven queue) ─────────────────────────────────────────────

export async function getChat(id: string): Promise<ChatTurn | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("brain_chats")
    .select("id, question, answer, status, citations, error_msg")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const citations = Array.isArray(data.citations)
    ? (data.citations as { slug: string; title: string }[])
    : [];
  return { ...data, citations };
}

// ── Conversations (saved chat threads) ──────────────────────────────────────

const toCitations = (raw: unknown): { slug: string; title: string }[] =>
  Array.isArray(raw) ? (raw as { slug: string; title: string }[]) : [];

/** Saved threads for the chat history panel, most recently active first. */
export async function listConversations(limit = 50): Promise<ConversationSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("brain_conversations")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** A single thread with all its turns in order — used to reopen a conversation. */
export async function getConversation(id: string): Promise<ConversationDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServiceClient();
  const { data: convo, error } = await supabase
    .from("brain_conversations")
    .select("id, title, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!convo) return null;

  const { data: rows, error: turnsError } = await supabase
    .from("brain_chats")
    .select("id, question, answer, status, citations, error_msg")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (turnsError) throw new Error(turnsError.message);

  const turns: ChatTurn[] = (rows ?? []).map((r) => ({
    ...r,
    citations: toCitations(r.citations),
  }));
  return { ...convo, turns };
}

// ── Project notes ───────────────────────────────────────────────────────────

export type ProjectNoteSummary = Pick<ProjectNote, "id" | "content_md" | "created_at">;

export async function getProjectNotes(projectId: string): Promise<ProjectNoteSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("project_notes")
    .select("id, content_md, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Weekly reports (lint / insight — written by the Monday routine) ──────────

export async function getLatestReport(kind: "lint" | "insight"): Promise<BrainReport | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("brain_reports")
    .select("*")
    .eq("kind", kind)
    .eq("status", "done")
    .order("week_of", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}
