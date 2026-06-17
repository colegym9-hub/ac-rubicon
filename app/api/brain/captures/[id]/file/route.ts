import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/brain/auth";
import { fileSourceToPage } from "@/lib/brain/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  if (!slug) return new NextResponse("slug required", { status: 400 });

  const result = await fileSourceToPage(id, slug);
  if (!result.ok) return new NextResponse(result.error ?? "Failed", { status: 422 });

  return NextResponse.json({ ok: true });
}
