"use client";

import { useState, useEffect } from "react";
import type { ConversationSummary } from "@/lib/brain/types";
import { X, MessageSquare } from "lucide-react";

interface Props {
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function ConversationList({ onSelect, onClose }: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/brain/conversations");
        if (!res.ok) throw new Error("Failed to load");
        const data: { conversations: ConversationSummary[] } = await res.json();
        if (active) setConversations(data.conversations ?? []);
      } catch {
        if (active) setConversations([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--glass-border)" }}>
        <h2 className="text-base font-bold">Conversations</h2>
        <button type="button" onClick={onClose} aria-label="Close history" className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">No saved conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className="flex items-center gap-3 rounded-[var(--radius)] border bg-card/50 px-3 py-2.5 text-left transition-colors hover:bg-card"
              style={{ borderColor: "var(--glass-border)" }}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.title || "Untitled chat"}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
