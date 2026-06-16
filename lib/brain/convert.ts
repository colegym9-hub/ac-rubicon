import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

// App-side source conversion (link/video → markdown via Supadata). Lives here so
// BOTH the in-app ingest (lib/brain/ingest.ts) and the legacy MCP convert_source
// tool share one implementation instead of drifting.

type SupadataResp = {
  jobId?: string;
  content?: unknown;
  text?: unknown;
  status?: string;
  error?: unknown;
};

/** Pull a transcript/article text via Supadata. Returns the text, or an error
 *  (on error the caller transcribes/extracts the source itself — the fallback). */
export async function supadataTranscript(url: string): Promise<{ text?: string; error?: string }> {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) return { error: "SUPADATA_API_KEY not configured" };
  const base = "https://api.supadata.ai/v1";
  const headers = { "x-api-key": key };
  const pick = (d: SupadataResp): string | null =>
    typeof d.content === "string" ? d.content
    : typeof d.text === "string" ? d.text
    : Array.isArray(d.content) ? d.content.map((c) => (c as { text?: string }).text ?? "").join(" ")
    : null;

  try {
    const res = await fetch(`${base}/transcript?url=${encodeURIComponent(url)}&text=true`, { headers });
    if (!res.ok) return { error: `Supadata ${res.status}` };
    let data = (await res.json()) as SupadataResp;

    // Async: a job id to poll. Keep it short (serverless timeout) — the caller
    // falls back if it isn't ready quickly.
    if (data.jobId) {
      let resolved = false;
      for (let i = 0; i < 3 && !resolved; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const jr = await fetch(`${base}/transcript/${data.jobId}`, { headers });
        if (!jr.ok) continue;
        const jd = (await jr.json()) as SupadataResp;
        if (jd.status === "failed" || jd.error) return { error: "Supadata job failed" };
        if (pick(jd)) { data = jd; resolved = true; }
      }
      if (!resolved) return { error: "Supadata still processing" };
    }

    const text = pick(data);
    return text ? { text } : { error: "No transcript in response" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Supadata fetch failed" };
  }
}

export type ConvertResult =
  | { ok: true; skipped?: boolean; contentMd?: string | null }
  | { ok: false; error: string };

/** Convert a raw source to markdown. Notes/chat-answers are already text (skip);
 *  already-converted sources short-circuit; links go through Supadata. Persists
 *  content_md + status. Mirrors the convert_source MCP tool semantics. */
export async function convertSourceById(id: string): Promise<ConvertResult> {
  const sb = createServiceClient();
  const { data: row } = await sb
    .from("raw_sources")
    .select("type, raw_input, content_md, status")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "source not found" };
  if (row.type === "note" || row.type === "chat_answer")
    return { ok: true, skipped: true, contentMd: row.content_md };
  if (row.content_md && row.status === "converted")
    return { ok: true, skipped: true, contentMd: row.content_md };

  await sb.from("raw_sources").update({ status: "converting" }).eq("id", id);
  const r = await supadataTranscript(row.raw_input);
  if (r.error || !r.text) {
    await sb.from("raw_sources").update({ status: "raw", error_msg: r.error ?? "no text" }).eq("id", id);
    return { ok: false, error: r.error ?? "no text" };
  }
  await sb
    .from("raw_sources")
    .update({
      content_md: r.text,
      status: "converted",
      error_msg: null,
      token_est: Math.round(r.text.length / 4),
    })
    .eq("id", id);
  return { ok: true, contentMd: r.text };
}
