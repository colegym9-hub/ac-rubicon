import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthed } from "@/lib/brain/auth";
import { searchWiki } from "@/lib/data/brain";
import { getSop } from "@/lib/data/sops";
import { anthropic } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAuthed())) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const question = String(body?.question ?? "").trim();
  if (!question) return new NextResponse("Empty question", { status: 400 });

  const supabase = createServiceClient();

  // Insert chat row for history (no fireRoutine — we answer inline now).
  const { data: chatRow, error: insertError } = await supabase
    .from("brain_chats")
    .insert({ question, status: "pending" })
    .select("id")
    .single();
  if (insertError) return new NextResponse(insertError.message, { status: 500 });

  const chatId = chatRow.id;

  // Search wiki for relevant pages (returns WikiSummary[], no content_md).
  const wikiSummaries = await searchWiki(question).catch(() => []);

  // Fetch full content for matched pages in one query.
  let wikiContext = "No relevant wiki pages found for this question.";
  if (wikiSummaries.length > 0) {
    const ids = wikiSummaries.map((p) => p.id);
    const { data: fullPages } = await supabase
      .from("wiki_pages")
      .select("title, content_md")
      .in("id", ids);

    if (fullPages && fullPages.length > 0) {
      wikiContext = fullPages
        .map((p) => `## ${p.title}\n\n${p.content_md ?? ""}`)
        .join("\n\n---\n\n");
    }
  }

  // Fetch SOP system instructions.
  const sop = await getSop("chat").catch(() => null);
  const systemText =
    sop?.content_md ??
    "You are a personal knowledge assistant. Answer concisely and accurately using only the provided wiki context. If the context doesn't cover the question, say so.";

  // Build the streaming response.
  const encoder = new TextEncoder();
  let fullAnswer = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: [
            {
              type: "text",
              text: systemText,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: wikiContext,
                  cache_control: { type: "ephemeral" },
                },
                {
                  type: "text",
                  text: `Question: ${question}`,
                },
              ],
            },
          ],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const token = event.delta.text;
            fullAnswer += token;
            controller.enqueue(encoder.encode(token));
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        // Update the row whether we succeeded or errored.
        const isError = !fullAnswer;
        await supabase
          .from("brain_chats")
          .update(
            isError
              ? { status: "error", error_msg: "Stream failed" }
              : { answer: fullAnswer, status: "answered" },
          )
          .eq("id", chatId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Chat-Id": chatId,
    },
  });
}
