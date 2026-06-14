import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthed } from "@/lib/brain/auth";

export const runtime = "nodejs";

/** Manual wiki edit. Replaces content_md, bumps version, logs the edit. */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const content_md = body?.content_md;
  if (typeof content_md !== "string") return new NextResponse("Missing content_md", { status: 400 });

  const supabase = createServiceClient();
  const { data: cur, error: readErr } = await supabase
    .from("wiki_pages")
    .select("id, version")
    .eq("slug", slug)
    .maybeSingle();
  if (readErr) return new NextResponse(readErr.message, { status: 500 });
  if (!cur) return new NextResponse("Not found", { status: 404 });

  const { error } = await supabase
    .from("wiki_pages")
    .update({ content_md, version: (cur.version ?? 1) + 1 })
    .eq("slug", slug);
  if (error) return new NextResponse(error.message, { status: 500 });

  // Log the edit (fire-and-forget — a failed log row must not fail the edit).
  await supabase.from("brain_log").insert({
    operation: "update",
    target_type: "wiki_page",
    target_id: cur.id,
    summary: `Manual edit — ${slug}`,
    meta: { slug, manual: true },
  });
  return NextResponse.json({ ok: true });
}
