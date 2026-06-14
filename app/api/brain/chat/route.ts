import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthed } from "@/lib/brain/auth";
import { fireRoutine } from "@/lib/brain/routine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  const question = String(body?.question ?? "").trim();
  if (!question) return new NextResponse("Empty question", { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("brain_chats")
    .insert({ question })
    .select("id")
    .single();
  if (error) return new NextResponse(error.message, { status: 500 });
  await fireRoutine("chat");
  return NextResponse.json({ id: data.id });
}
