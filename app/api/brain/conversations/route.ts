import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/brain/auth";
import { listConversations } from "@/lib/data/brain";

export const runtime = "nodejs";

/** List saved chat threads for the history panel (most recently active first). */
export async function GET() {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}
