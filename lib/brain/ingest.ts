import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import { createServiceClient } from "@/lib/supabase/server";
import { getSop } from "@/lib/data/sops";
import { searchWiki } from "@/lib/data/brain";
import { convertSourceById } from "@/lib/brain/convert";
import {
  upsertWikiPage,
  linkSourceToPage,
  setSourceStatus,
  appendBrainLog,
  addProjectNote,
} from "@/lib/data/brain-mutations";

// Brain ingest — was a cloud routine (process-brain.md), now a direct Anthropic
// call so captures file themselves in-app. Fired on demand (after a capture), so
// it uses the API rather than the cloud routine.
//
// Per source: convert → fetch the most relevant wiki pages (full content) →
// one structured decision (file to a shown page, or park as needs_review) →
// apply the writes deterministically. The model only files to a page whose full
// content it was shown, so the appended content_md never overwrites unseen text;
// and it can't invent new pages (a slug not among candidates → needs_review),
// which matches the SOP rule "a new page is never created automatically."

const MODEL = "claude-sonnet-4-6";
const MAX_SOURCES_PER_RUN = 5; // bound the drain to fit the 60s serverless window
const CANDIDATE_LIMIT = 8; // full pages shown to the model per source
const SOURCE_CHARS_CAP = 24_000; // cap long transcripts for the filing decision
// Crash fallback only: a normal run releases the lock when it finishes (see
// runIngestIfIdle). Set ≥ the route maxDuration so a still-running drain is never
// treated as stale, which would let a second drain process the same source.
const LOCK_STALE_MS = 60_000;

const WIKI_DOMAINS = ["A.C Media", "BU", "Content", "Coursework", "Personal Ops", "Mindset"];

// Fallback when Cole hasn't written the ingest SOP in-app yet. Mirrors the seeded
// ingest doc + routines/process-brain.md so behavior matches the old routine.
const DEFAULT_INGEST_SOP = `You turn one pending raw source into wiki updates (and, when clearly relevant, a project note).

Decide where the source belongs using the candidate pages shown (their FULL current content is included) and the wiki index.
- Confident it extends a candidate page → action "file". Append a source entry in the page's format (1–2 sentences; what it establishes, key facts in **bold**; "Source: <title>"). Update the overview only if it's now stale. Return the FULL new content_md for each page you touch. A source can update more than one candidate page.
- Not confident, OR a genuinely new topic with no home among the candidates → action "needs_review" with a short reviewReason. Do NOT invent a page — Cole decides on new pages.
- Feed a project ONLY when the source is clearly useful background for something Cole is actively building: set projectNote { projectId, content }. If unsure, skip it.

Raw sources are immutable. Append to pages; never drop existing content. Keep entries accurate and in-format.`;

const FILE_TOOL: Anthropic.Tool = {
  name: "file_source",
  description:
    "File one raw source into the wiki, or park it for review. When action='file', every page slug MUST be one of the candidate pages shown (you saw its full content) and content_md MUST be that page's FULL updated body.",
  input_schema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["file", "needs_review"] },
      pages: {
        type: "array",
        description: "Pages to write when action='file'. Omit/empty for needs_review.",
        items: {
          type: "object",
          properties: {
            slug: { type: "string", description: "Must match a candidate page slug" },
            title: { type: "string" },
            domain: { type: "string", enum: WIKI_DOMAINS },
            overview: { type: "string", description: "Updated overview — only if now stale" },
            content_md: { type: "string", description: "FULL new page body (existing content + appended entry)" },
            contribution: { type: "string", enum: ["added", "updated", "confirmed"] },
            relatedSlugs: { type: "array", items: { type: "string" } },
          },
          required: ["slug", "title", "domain", "content_md"],
        },
      },
      projectNote: {
        type: "object",
        description: "Optional — only when clearly relevant to an active project.",
        properties: {
          projectId: { type: "string" },
          content: { type: "string" },
        },
        required: ["projectId", "content"],
      },
      logSummary: { type: "string", description: "One line on what you did, for the activity log." },
      reviewReason: { type: "string", description: "Why parked, when action='needs_review'." },
    },
    required: ["action", "logSummary"],
  },
};

type IngestSource = {
  id: string;
  type: string;
  title: string | null;
  raw_input: string;
  content_md: string | null;
  status: string;
};

type WikiIndexEntry = { slug: string; title: string; domain: string; overview: string | null };
type ContextProject = { id: string; name: string; category: string | null };

type RunContext = {
  systemText: string;
  index: WikiIndexEntry[];
  projects: ContextProject[];
  projectIds: Set<string>;
};

type FileDecision = {
  action?: "file" | "needs_review";
  pages?: Array<{
    slug: string;
    title: string;
    domain: string;
    overview?: string;
    content_md: string;
    contribution?: "added" | "updated" | "confirmed";
    relatedSlugs?: string[];
  }>;
  projectNote?: { projectId: string; content: string };
  logSummary?: string;
  reviewReason?: string;
};

async function loadRunContext(): Promise<RunContext> {
  const sb = createServiceClient();
  const [cloud, ingestSop, indexRes, projectsRes] = await Promise.all([
    getSop("cloudmd").catch(() => null),
    getSop("ingest").catch(() => null),
    sb.from("wiki_pages").select("slug, title, domain, overview").eq("status", "active").order("domain"),
    sb.from("projects").select("id, name, category").eq("status", "active").order("priority", { ascending: false }),
  ]);

  const ingestRules =
    ingestSop?.content_md && ingestSop.content_md.trim().length > 120
      ? ingestSop.content_md
      : DEFAULT_INGEST_SOP;
  const systemText = [cloud?.content_md, ingestRules].filter(Boolean).join("\n\n---\n\n");

  const projects = (projectsRes.data ?? []) as ContextProject[];
  return {
    systemText,
    index: (indexRes.data ?? []) as WikiIndexEntry[],
    projects,
    projectIds: new Set(projects.map((p) => p.id)),
  };
}

/** Ingest a single source. Always leaves it in a terminal state
 *  (ingested | needs_review | error) so the drain loop never re-fetches it. */
async function ingestOne(source: IngestSource, ctx: RunContext): Promise<string> {
  const sb = createServiceClient();

  // 1. Ensure markdown content (convert links; notes already have it). Only
  //    convert when content is missing, so we never re-transcribe.
  let contentMd = source.content_md;
  if (!contentMd) {
    const c = await convertSourceById(source.id);
    if (!c.ok) {
      await setSourceStatus(source.id, "needs_review", `convert failed: ${c.error}`);
      return `${source.id}: needs_review (convert failed: ${c.error})`;
    }
    contentMd = c.contentMd ?? null;
  }
  if (!contentMd || !contentMd.trim()) {
    await setSourceStatus(source.id, "needs_review", "no content to ingest");
    return `${source.id}: needs_review (no content)`;
  }

  // 2. Retrieve the most relevant wiki pages (full content — the model files
  //    only to these, so its content_md is always based on real current text).
  const query = `${source.title ?? ""} ${contentMd.slice(0, 500)}`.trim();
  const matches = await searchWiki(query, CANDIDATE_LIMIT).catch(() => []);
  const slugs = matches.map((m) => m.slug);
  let candidates: Array<{
    slug: string;
    title: string;
    domain: string;
    overview: string | null;
    content_md: string | null;
    related_slugs: string[] | null;
  }> = [];
  if (slugs.length) {
    const { data } = await sb
      .from("wiki_pages")
      .select("slug, title, domain, overview, content_md, related_slugs")
      .in("slug", slugs)
      .eq("status", "active");
    candidates = data ?? [];
  }
  const candidateSlugs = new Set(candidates.map((c) => c.slug));

  // 3. One structured decision. System (SOP + index + projects) is identical
  //    across sources in a run → cache_control makes follow-up sources cheap.
  let msg: Anthropic.Message;
  try {
    msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        { type: "text", text: ctx.systemText, cache_control: { type: "ephemeral" } },
        {
          type: "text",
          text:
            `Wiki index (all active pages):\n${JSON.stringify(ctx.index)}\n\n` +
            `Active projects:\n${JSON.stringify(ctx.projects)}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [FILE_TOOL],
      tool_choice: { type: "tool", name: "file_source" },
      messages: [
        {
          role: "user",
          content:
            `Candidate pages (full current content — you may only file to these):\n` +
            `${JSON.stringify(candidates)}\n\n` +
            `Source to file:\n` +
            `Type: ${source.type}\nTitle: ${source.title ?? "(untitled)"}\n` +
            `Content:\n${contentMd.slice(0, SOURCE_CHARS_CAP)}\n\n` +
            `Decide where it belongs and call file_source.`,
        },
      ],
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "AI request failed";
    await setSourceStatus(source.id, "error", errMsg);
    return `${source.id}: error (${errMsg})`;
  }

  const toolUse = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) {
    await setSourceStatus(source.id, "needs_review", "no filing decision produced");
    return `${source.id}: needs_review (no decision)`;
  }
  const decision = toolUse.input as FileDecision;
  const logSummary = decision.logSummary || `Ingested ${source.title ?? source.id}`;

  // 4a. Park for review.
  if (decision.action !== "file" || !decision.pages?.length) {
    await setSourceStatus(source.id, "needs_review", decision.reviewReason ?? null);
    await appendBrainLog({
      operation: "ingest",
      summary: logSummary,
      targetType: "raw_source",
      targetId: source.id,
    });
    return `${source.id}: needs_review (${decision.reviewReason ?? "model parked it"})`;
  }

  // 4b. File it — but only to pages whose full content we showed the model.
  const unknown = decision.pages.filter((p) => !candidateSlugs.has(p.slug));
  if (unknown.length) {
    const reason = `model targeted non-candidate page(s): ${unknown.map((p) => p.slug).join(", ")}`;
    await setSourceStatus(source.id, "needs_review", reason);
    await appendBrainLog({
      operation: "ingest",
      summary: `Parked — ${reason}`,
      targetType: "raw_source",
      targetId: source.id,
    });
    return `${source.id}: needs_review (${reason})`;
  }

  for (const p of decision.pages) {
    const u = await upsertWikiPage({
      slug: p.slug,
      title: p.title,
      domain: WIKI_DOMAINS.includes(p.domain) ? p.domain : "Personal Ops",
      overview: p.overview,
      content_md: p.content_md,
      relatedSlugs: p.relatedSlugs,
    });
    if (u.error) {
      await setSourceStatus(source.id, "error", `wiki write failed: ${u.error}`);
      return `${source.id}: error (wiki write: ${u.error})`;
    }
    const link = await linkSourceToPage({
      sourceId: source.id,
      pageSlug: p.slug,
      contribution: p.contribution ?? "added",
    });
    // The page content is already written; a failed junction row only costs the
    // "Filed to" badge, so record it rather than failing the whole ingest.
    if (link.error) {
      await appendBrainLog({
        operation: "error",
        summary: `Linked source→${p.slug} failed: ${link.error}`,
        targetType: "raw_source",
        targetId: source.id,
      });
    }
  }

  if (decision.projectNote && ctx.projectIds.has(decision.projectNote.projectId)) {
    await addProjectNote({
      projectId: decision.projectNote.projectId,
      content: decision.projectNote.content,
      sourceId: source.id,
    });
  }

  await appendBrainLog({
    operation: "ingest",
    summary: logSummary,
    targetType: "raw_source",
    targetId: source.id,
  });
  await setSourceStatus(source.id, "ingested");
  return `${source.id}: filed → ${decision.pages.map((p) => p.slug).join(", ")}`;
}

/** Drain the pending-source queue (oldest first), bounded by MAX_SOURCES_PER_RUN.
 *  Re-queries each pass, so sources captured mid-run are still picked up. */
export async function runIngest(): Promise<{ processed: number; results: string[] }> {
  const sb = createServiceClient();
  const ctx = await loadRunContext();
  const results: string[] = [];

  for (let i = 0; i < MAX_SOURCES_PER_RUN; i++) {
    // raw/converted are the normal pending states; converting/ingesting recover
    // sources a crashed prior run (in-app or legacy MCP) left mid-flight.
    const { data } = await sb
      .from("raw_sources")
      .select("id, type, title, raw_input, content_md, status")
      .in("status", ["raw", "converting", "converted", "ingesting"])
      .not("tags", "cs", "{migrated}")
      .order("created_at", { ascending: true })
      .limit(1);
    const source = data?.[0] as IngestSource | undefined;
    if (!source) break;

    try {
      results.push(await ingestOne(source, ctx));
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "ingest failed";
      await setSourceStatus(source.id, "error", errMsg);
      results.push(`${source.id}: error (${errMsg})`);
    }
  }

  return { processed: results.length, results };
}

/** Manually file a needs_review/error source to a user-chosen wiki page.
 *  Runs the same AI filing step as ingestOne but with the target page forced as
 *  the sole candidate and an explicit instruction to file (not park). */
export async function fileSourceToPage(
  sourceId: string,
  targetSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = createServiceClient();

  const { data: raw } = await sb
    .from("raw_sources")
    .select("id, type, title, raw_input, content_md, status")
    .eq("id", sourceId)
    .maybeSingle();

  if (!raw) return { ok: false, error: "Source not found" };
  if (!["needs_review", "error"].includes(raw.status as string)) {
    return { ok: false, error: "Source is not in a reviewable state" };
  }

  const source = raw as IngestSource;
  const contentMd = source.content_md;
  if (!contentMd?.trim()) return { ok: false, error: "Source has no content to file" };

  const { data: page } = await sb
    .from("wiki_pages")
    .select("slug, title, domain, overview, content_md, related_slugs")
    .eq("slug", targetSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!page) return { ok: false, error: "Wiki page not found" };

  const ctx = await loadRunContext();

  let msg: Anthropic.Message;
  try {
    msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text:
            ctx.systemText +
            "\n\nIMPORTANT: The user has manually routed this source to the shown page. You MUST use action='file'. Do not choose needs_review.",
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text:
            `Wiki index (all active pages):\n${JSON.stringify(ctx.index)}\n\n` +
            `Active projects:\n${JSON.stringify(ctx.projects)}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [FILE_TOOL],
      tool_choice: { type: "tool", name: "file_source" },
      messages: [
        {
          role: "user",
          content:
            `Target page (user-chosen — file to this page):\n${JSON.stringify([page])}\n\n` +
            `Source to file:\nType: ${source.type}\nTitle: ${source.title ?? "(untitled)"}\n` +
            `Content:\n${contentMd.slice(0, SOURCE_CHARS_CAP)}`,
        },
      ],
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "AI request failed";
    await setSourceStatus(sourceId, "error", errMsg);
    return { ok: false, error: errMsg };
  }

  const toolUse = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return { ok: false, error: "No decision from AI" };

  const decision = toolUse.input as FileDecision;

  if (decision.action !== "file" || !decision.pages?.length) {
    await setSourceStatus(sourceId, "needs_review", decision.reviewReason ?? "AI declined manual routing");
    return { ok: false, error: decision.reviewReason ?? "AI declined to file" };
  }

  const target = decision.pages.find((p) => p.slug === targetSlug) ?? decision.pages[0];

  const u = await upsertWikiPage({
    slug: target.slug,
    title: target.title,
    domain: WIKI_DOMAINS.includes(target.domain) ? target.domain : "Personal Ops",
    overview: target.overview,
    content_md: target.content_md,
    relatedSlugs: target.relatedSlugs,
  });
  if (u.error) return { ok: false, error: `Wiki write failed: ${u.error}` };

  await linkSourceToPage({ sourceId, pageSlug: target.slug, contribution: "added" });
  await setSourceStatus(sourceId, "ingested");
  await appendBrainLog({
    operation: "ingest",
    summary: decision.logSummary ?? `Manually filed "${source.title ?? sourceId}" → ${target.slug}`,
    targetType: "raw_source",
    targetId: sourceId,
  });

  return { ok: true };
}

/** Run the drain only if no other run is in flight. Atomic claim: only the caller
 *  that flips the stale lock row actually drains; concurrent callers no-op. The
 *  lock is released on finish so the next capture drains promptly — a crashed run
 *  leaves it to age out after LOCK_STALE_MS as a safety net. */
export async function runIngestIfIdle(): Promise<{ ran: boolean; processed?: number }> {
  const sb = createServiceClient();
  try {
    const { data } = await sb
      .from("brain_run_lock")
      .update({ fired_at: new Date().toISOString() })
      .eq("id", true)
      .lt("fired_at", new Date(Date.now() - LOCK_STALE_MS).toISOString())
      .select("id");
    if (!data || !data.length) return { ran: false };
  } catch {
    return { ran: false };
  }
  try {
    const r = await runIngest();
    return { ran: true, processed: r.processed };
  } finally {
    // Release the lock (backdate it) so a capture made right after this run can
    // drain without waiting out LOCK_STALE_MS.
    try {
      await sb.from("brain_run_lock").update({ fired_at: new Date(0).toISOString() }).eq("id", true);
    } catch {
      /* lock ages out on its own */
    }
  }
}
