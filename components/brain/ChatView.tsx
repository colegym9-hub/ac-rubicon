"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatTurn } from "@/lib/brain/types";
import ChatMessage from "./ChatMessage";
import { Input } from "@/components/ui/input";
import { X, Send } from "lucide-react";

export default function ChatView({ onClose }: { onClose: () => void }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const abort = useCallback(() => {
    readerRef.current?.cancel();
    readerRef.current = null;
  }, []);
  useEffect(() => () => abort(), [abort]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  async function ask() {
    const question = q.trim();
    if (!question || busy) return;
    setQ("");
    setBusy(true);
    const tempId = `temp-${Date.now()}`;
    setTurns((t) => [...t, { id: tempId, question, answer: "", status: "pending", citations: [], error_msg: null }]);
    try {
      const res = await fetch("/api/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setTurns((t) => t.map((x) => (x.id === tempId ? { ...x, status: "error", error_msg: msg || "Couldn't send." } : x)));
        setBusy(false);
        return;
      }

      const chatId = res.headers.get("X-Chat-Id") ?? tempId;
      // Promote the temp turn to the real DB id and switch to streaming state
      setTurns((t) => t.map((x) => (x.id === tempId ? { ...x, id: chatId, status: "answering" } : x)));

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setTurns((t) =>
          t.map((x) =>
            x.id === chatId ? { ...x, answer: (x.answer ?? "") + chunk, status: "answering" } : x
          )
        );
      }

      // Stream closed — mark answered
      setTurns((t) => t.map((x) => (x.id === chatId ? { ...x, status: "answered" } : x)));
    } catch {
      setTurns((t) =>
        t.map((x) =>
          x.id === tempId || x.status === "answering"
            ? { ...x, status: "error", error_msg: "Couldn't send." }
            : x
        )
      );
    } finally {
      readerRef.current = null;
      setBusy(false);
    }
  }

  const saveAnswer = useCallback(async (answer: string) => {
    try {
      await fetch("/api/brain/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
    } catch { /* best-effort */ }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:left-52">
      <header className="flex shrink-0 items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--glass-border)" }}>
        <h2 className="text-base font-bold">Ask your brain</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        {turns.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ask anything across your wiki, projects, and plans.
          </p>
        ) : (
          turns.map((t) => <ChatMessage key={t.id} turn={t} onSave={saveAnswer} />)
        )}
        <div ref={endRef} />
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t px-5 py-3" style={{ borderColor: "var(--glass-border)" }}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder="Ask your brain anything…"
          className="bg-transparent"
          style={{ borderColor: "var(--glass-border)" }}
        />
        <button
          type="button"
          onClick={ask}
          disabled={busy || !q.trim()}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
