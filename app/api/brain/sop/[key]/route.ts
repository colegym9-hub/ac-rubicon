import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthed } from "@/lib/brain/auth";

export const runtime = "nodejs";

/** Edit a CloudMD doc. Cole-only (routines never write here). */
export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const { key } = await params;
  const body = await req.json().catch(() => null);
  const content_md = body?.content_md;
  if (typeof content_md !== "string") return new NextResponse("Missing content_md", { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from("brain_sops").update({ content_md }).eq("key", key);
  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}
