import { NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthed } from "@/lib/brain/auth";
import { getCaptures } from "@/lib/data/brain";
import { runIngestIfIdle } from "@/lib/brain/ingest";
import type { RawSourceInsert } from "@/lib/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;

function linkType(url: string): RawSourceInsert["type"] {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  return "article";
}

export async function GET() {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ captures: await getCaptures() });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return new NextResponse("Bad request", { status: 400 });

  let row: RawSourceInsert;
  if (body.kind === "note") {
    const text = String(body.content ?? "").trim();
    if (!text) return new NextResponse("Empty note", { status: 400 });
    // Notes are already text — go straight to ingest (status 'converted').
    row = { type: "note", raw_input: text, content_md: text, title: text.split("\n")[0].slice(0, 120), status: "converted" };
  } else if (body.kind === "link") {
    const url = String(body.url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) return new NextResponse("Invalid URL", { status: 400 });
    row = { type: linkType(url), raw_input: url, title: url.replace(/^https?:\/\/(www\.)?/i, "").slice(0, 120), status: "raw" };
  } else {
    return new NextResponse("Unknown capture kind", { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("raw_sources").insert(row).select("id").single();
  if (error) return new NextResponse(error.message, { status: 500 });
  // Ingest in-app after the response is sent (lock-guarded so quick-succession
  // captures = one drain). The captures list polls for the resulting status.
  after(async () => {
    await runIngestIfIdle();
  });
  return NextResponse.json({ id: data.id });
}
