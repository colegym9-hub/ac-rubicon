import { NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthed } from "@/lib/brain/auth";
import { runIngestIfIdle } from "@/lib/brain/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: source } = await supabase
    .from("raw_sources")
    .select("id, status, content_md")
    .eq("id", id)
    .maybeSingle();

  if (!source) return new NextResponse("Not found", { status: 404 });

  const canRetry = source.status === "needs_review" || source.status === "error";
  if (!canRetry) return new NextResponse("Not retryable", { status: 409 });

  const newStatus = source.content_md ? "converted" : "raw";
  const { error } = await supabase
    .from("raw_sources")
    .update({ status: newStatus, error_msg: null, retry_count: 0 })
    .eq("id", id);

  if (error) return new NextResponse(error.message, { status: 500 });

  after(async () => { await runIngestIfIdle(); });

  return NextResponse.json({ ok: true, newStatus });
}
