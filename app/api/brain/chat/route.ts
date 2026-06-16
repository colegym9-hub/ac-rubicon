import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
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
  const incomingConversationId = body?.conversationId ? String(body.conversationId) : null;

  const supabase = createServiceClient();

  // Resolve the thread this turn belongs to — create one on the first message.
  let conversationId = incomingConversationId;
  if (!conversationId) {
    const title = question.length > 80 ? `${question.slice(0, 79)}…` : question;
    const { data: convo, error: convoError } = await supabase
      .from("brain_conversations")
      .insert({ title })
      .select("id")
      .single();
    if (convoError) return new NextResponse(convoError.message, { status: 500 });
    conversationId = convo.id;
  }

  // Prior answered turns become the model's memory for follow-ups (oldest first).
  const { data: priorRows } = await supabase
    .from("brain_chats")
    .select("question, answer")
    .eq("conversation_id", conversationId)
    .eq("status", "answered")
    .order("created_at", { ascending: true });
  const priorTurns = (priorRows ?? []).filter((r) => r.answer);

  // Insert this turn's row for history.
  const { data: chatRow, error: insertError } = await supabase
    .from("brain_chats")
    .insert({ question, status: "pending", conversation_id: conversationId })
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

  // Prior turns first (memory), then the current question with fresh wiki context.
  const messages: Anthropic.MessageParam[] = [];
  for (const t of priorTurns) {
    messages.push({ role: "user", content: t.question });
    messages.push({ role: "assistant", content: t.answer! });
  }
  messages.push({
    role: "user",
    content: [
      { type: "text", text: wikiContext },
      { type: "text", text: `Question: ${question}` },
    ],
  });

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
          messages,
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
        // Bump the thread so it sorts to the top of the history list.
        await supabase
          .from("brain_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Chat-Id": chatId,
      "X-Conversation-Id": conversationId,
    },
  });
}
