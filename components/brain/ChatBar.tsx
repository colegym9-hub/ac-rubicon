"use client";

import { Sparkles } from "lucide-react";

export default function ChatBar({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-[var(--radius)] border bg-card/50 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-card"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      Ask your brain anything…
    </button>
  );
}
