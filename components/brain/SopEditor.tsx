"use client";

import { useState, useTransition } from "react";
import type { BrainSop } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function SopEditor({ sops }: { sops: BrainSop[] }) {
  const [activeKey, setActiveKey] = useState(sops[0]?.key ?? "");
  const [drafts, setDrafts] = useState<Record<string, string>>(
    () => Object.fromEntries(sops.map((s) => [s.key, s.content_md])),
  );
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const active = sops.find((s) => s.key === activeKey);
  const dirty = active ? drafts[active.key] !== active.content_md : false;

  function save() {
    if (!active) return;
    setError(null);
    start(async () => {
      const res = await fetch(`/api/brain/sop/${active.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_md: drafts[active.key] }),
      });
      if (!res.ok) { setError((await res.text()) || "Failed to save."); return; }
      active.content_md = drafts[active.key]; // reflect saved baseline
      setSavedKey(active.key);
      setTimeout(() => setSavedKey(null), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {sops.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActiveKey(s.key)}
            className={["rounded-[3px] border px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] transition-colors",
              s.key === activeKey ? "border-primary bg-primary/10 text-primary" : "border-muted/40 text-muted-foreground hover:border-border"].join(" ")}
          >
            {s.label}
          </button>
        ))}
      </div>

      {active && (
        <>
          <Textarea
            value={drafts[active.key]}
            onChange={(e) => setDrafts((d) => ({ ...d, [active.key]: e.target.value }))}
            rows={24}
            spellCheck={false}
            className="resize-y bg-transparent font-mono text-xs leading-relaxed"
            style={{ borderColor: "var(--glass-border)" }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={pending || !dirty} size="sm">
              {pending ? "Saving…" : "Save"}
            </Button>
            {savedKey === active.key && (
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-primary">saved ✓</span>
            )}
            <span className="ml-auto text-[0.65rem] text-muted-foreground">applies on the next routine run</span>
          </div>
        </>
      )}
    </div>
  );
}
