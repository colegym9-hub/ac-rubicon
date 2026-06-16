"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Link2 } from "lucide-react";

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddCaptureSheet({ onClose, onAdded }: Props) {
  const [tab, setTab] = useState<"note" | "link">("note");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const body = tab === "note" ? { kind: "note", content: note } : { kind: "link", url };
      const res = await fetch("/api/brain/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError((await res.text()) || "Failed to add."); return; }
      onAdded();
      onClose();
    });
  }

  const tabBtn = (id: "note" | "link", label: string, Icon: typeof FileText) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={[
        "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] border py-2 text-sm transition-colors",
        tab === id ? "border-primary bg-primary/10 text-primary" : "border-muted/40 text-muted-foreground",
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );

  const border = { borderColor: "var(--glass-border)" };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[70] rounded-t-2xl border-t bg-card px-5 pt-4 pb-10 shadow-2xl"
        style={border}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <h2 className="text-xl font-extrabold leading-tight">
          Add to <span className="accent">brain</span>
        </h2>

        <div className="mt-4 flex gap-2">
          {tabBtn("note", "Note", FileText)}
          {tabBtn("link", "Link", Link2)}
        </div>

        <div className="mt-4">
          {tab === "note" ? (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="Type a thought, idea, or paste text…"
              className="resize-none bg-transparent"
              style={border}
            />
          ) : (
            <>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://… (YouTube, Instagram, TikTok, article)"
                className="bg-transparent"
                style={border}
              />
              <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
                The brain pulls the transcript or article text, then files it into the wiki.
              </p>
            </>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        <Button
          onClick={submit}
          disabled={pending || (tab === "note" ? !note.trim() : !url.trim())}
          size="sm"
          className="mt-4 w-full"
        >
          {pending ? "Adding…" : "Add to brain"}
        </Button>

        <p className="mt-3 text-center text-[0.65rem] text-muted-foreground">
          Voice + photo capture land in a later update.
        </p>
      </div>
    </>
  );
}
