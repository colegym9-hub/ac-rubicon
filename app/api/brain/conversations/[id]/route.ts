import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/brain/auth";
import { getConversation } from "@/lib/data/brain";

export const runtime = "nodejs";

/** A single thread with all its turns — used to reopen and continue a chat. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(conversation);
}
