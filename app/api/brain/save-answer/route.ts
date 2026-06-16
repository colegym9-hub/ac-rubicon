import { NextResponse, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthed } from "@/lib/brain/auth";
import { runIngestIfIdle } from "@/lib/brain/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Save a good chat answer back into the brain: it becomes a raw source
 *  (type chat_answer, status converted → ingest), NOT a direct wiki write. */
export async function POST(req: Request) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  const text = String(body?.answer ?? "").trim();
  if (!text) return new NextResponse("Empty answer", { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("raw_sources")
    .insert({
      type: "chat_answer",
      raw_input: text,
      content_md: text,
      title: `Chat — ${text.split("\n")[0]}`.slice(0, 120),
      status: "converted",
    })
    .select("id")
    .single();
  if (error) return new NextResponse(error.message, { status: 500 });
  after(async () => {
    await runIngestIfIdle();
  });
  return NextResponse.json({ id: data.id });
}
