"use client";

import { useState, useCallback } from "react";
import type { CaptureSummary, WikiGroup } from "@/lib/brain/types";
import ChatBar from "./ChatBar";
import ChatView from "./ChatView";
import CapturesSection from "./CapturesSection";
import WikiSection from "./WikiSection";
import AddCaptureSheet from "./AddCaptureSheet";

interface Props {
  initialCaptures: CaptureSummary[];
  wikiGroups: WikiGroup[];
}

export default function BrainPage({ initialCaptures, wikiGroups }: Props) {
  const [captures, setCaptures] = useState(initialCaptures);
  const [chatOpen, setChatOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const refreshCaptures = useCallback(async () => {
    try {
      const r = await fetch("/api/brain/captures");
      if (r.ok) setCaptures((await r.json()).captures);
    } catch { /* keep current list */ }
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md md:max-w-none flex-col gap-6 px-5 md:px-10 pt-12 pb-24 md:pb-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Second brain</span>
        <h1 className="text-3xl font-extrabold leading-tight">Brain</h1>
      </header>

      <ChatBar onOpen={() => setChatOpen(true)} />
      <CapturesSection captures={captures} onRefresh={refreshCaptures} onAdd={() => setAddOpen(true)} />
      <WikiSection groups={wikiGroups} />

      {chatOpen && <ChatView onClose={() => setChatOpen(false)} />}
      {addOpen && <AddCaptureSheet onClose={() => setAddOpen(false)} onAdded={refreshCaptures} />}
    </main>
  );
}
