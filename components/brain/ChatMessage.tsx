"use client";

import Link from "next/link";
import type { ChatTurn } from "@/lib/brain/types";
import Markdown from "@/lib/brain/Markdown";
import { Bookmark } from "lucide-react";

export default function ChatMessage({ turn, onSave }: { turn: ChatTurn; onSave: (answer: string) => void }) {
  const thinking = turn.status === "pending" || turn.status === "answering";
  return (
    <div className="flex flex-col gap-2">
      <p className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        {turn.question}
      </p>
      <div
        className="max-w-[90%] self-start rounded-2xl rounded-bl-sm border bg-card/60 px-3 py-2"
        style={{ borderColor: "var(--glass-border)" }}
      >
        {thinking ? (
          <p className="text-sm text-muted-foreground">Thinking…</p>
        ) : turn.status === "error" ? (
          <p className="text-sm text-destructive">{turn.error_msg || "Something went wrong."}</p>
        ) : (
          <>
            <Markdown content={turn.answer || ""} />
            {turn.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {turn.citations.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/brain/wiki/${c.slug}`}
                    className="rounded-full border border-primary/40 px-2 py-0.5 text-[0.6rem] text-primary"
                  >
                    {c.title}
                  </Link>
                ))}
              </div>
            )}
            {turn.answer && (
              <button
                type="button"
                onClick={() => onSave(turn.answer!)}
                className="mt-2 flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-primary"
              >
                <Bookmark className="h-3 w-3" /> Save to brain
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
