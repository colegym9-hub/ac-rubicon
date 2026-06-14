"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { WikiDetail } from "@/lib/brain/types";
import Markdown from "@/lib/brain/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Pencil } from "lucide-react";

export default function WikiPageView({ page }: { page: WikiDetail }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(page.content_md ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await fetch(`/api/brain/wiki/${page.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_md: content }),
      });
      if (!res.ok) { setError((await res.text()) || "Failed to save."); return; }
      setEditing(false);
    });
  }

  return (
    <main className="mx-auto w-full max-w-md md:max-w-3xl px-5 md:px-10 pt-8 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/brain" className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Brain
        </Link>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{page.domain}</span>
      <h1 className="mt-1 text-2xl font-extrabold leading-tight">{page.title}</h1>

      {editing ? (
        <div className="mt-4 flex flex-col gap-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={24}
            className="resize-y bg-transparent font-mono text-xs leading-relaxed"
            style={{ borderColor: "var(--glass-border)" }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(false); setContent(page.content_md ?? ""); }} style={{ borderColor: "var(--glass-border)" }}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      ) : (
        <article className="mt-4">
          <Markdown content={page.content_md ?? page.overview ?? "_Empty page._"} />
          {page.sources.length > 0 && (
            <div className="mt-8 border-t pt-4" style={{ borderColor: "var(--glass-border)" }}>
              <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                Sources · {page.sources.length}
              </h2>
              <div className="mt-2 flex flex-col gap-1">
                {page.sources.map((s) => (
                  <span key={s.id} className="truncate text-xs text-muted-foreground">· {s.title || s.type}</span>
                ))}
              </div>
            </div>
          )}
        </article>
      )}
    </main>
  );
}
