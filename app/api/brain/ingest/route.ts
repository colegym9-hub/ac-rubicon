import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/brain/auth";
import { runIngestIfIdle } from "@/lib/brain/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Drain the pending-capture queue via the Anthropic API (lock-guarded). Called
 *  as a backstop while the captures list polls for status. */
export async function POST() {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const r = await runIngestIfIdle();
  return NextResponse.json(r);
}
