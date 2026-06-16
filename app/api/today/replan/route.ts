import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/brain/auth";
import { runReplan } from "@/lib/brain/replan";

export const runtime = "nodejs";
export const maxDuration = 60;

/** "Re-plan from now" — re-flows the rest of today via the Anthropic API and
 *  saves the new plan synchronously, so the timeline is ready when this returns. */
export async function POST(req: Request) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const whatChanged = body?.whatChanged ? String(body.whatChanged).slice(0, 500) : undefined;
  const timeLeft = body?.timeLeft ? String(body.timeLeft).slice(0, 40) : undefined;

  const res = await runReplan({ whatChanged, timeLeft });
  if (!res.ok) return new NextResponse(res.error, { status: 500 });
  return NextResponse.json({ ok: true, rationale: res.rationale });
}
