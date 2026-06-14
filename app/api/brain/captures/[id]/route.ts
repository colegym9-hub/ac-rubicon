import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/brain/auth";
import { getCaptureStatus } from "@/lib/data/brain";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const status = await getCaptureStatus(id);
  if (!status) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(status);
}
